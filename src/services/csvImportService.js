import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import Vehicle from '../models/Vehicle.js';
import DealJacket from '../models/DealJacket.js';
import { parseDate } from '../utils/csv.js';

const KNOWN_MAKES = [
  'Alfa Romeo', 'Audi', 'BMW', 'BYD', 'Chery', 'Chevrolet', 'Chrysler Jeep', 'Citroen',
  'Cupra', 'Dodge', 'Fiat', 'Ford', 'GAC', 'Genesis', 'GWM', 'Great Wall', 'Haval',
  'Holden', 'Honda', 'Hyundai', 'Isuzu', 'Isuzu UTE', 'Jaguar', 'Jeep', 'Kia',
  'Land Rover', 'LDV', 'Lexus', 'Mahindra', 'Mazda', 'Mercedes-Benz', 'Mercedes',
  'MG', 'MINI', 'Mitsubishi', 'Nissan', 'Peugeot', 'Polestar', 'Porsche', 'RAM',
  'Range Rover', 'Renault', 'Skoda', 'SsangYong', 'Subaru', 'Suzuki', 'Tesla',
  'Toyota', 'Volkswagen', 'Volvo', 'XPeng', 'Jaecoo', 'Omoda Jaecoo'
];

function cents(val) {
  if (val === null || val === undefined || val === '') return 0;
  const num = Number.parseFloat(String(val).replace(/[$,]/g, '').trim());
  return Number.isFinite(num) ? Math.round(num * 100) : 0;
}

function stableVin(stockNumber) {
  return `DAN${crypto.createHash('sha256').update(String(stockNumber).trim()).digest('hex').slice(0, 14)}`.toUpperCase();
}

function extractYear(desc) {
  if (!desc) return 2026;
  const myMatch = String(desc).match(/\bMY(\d{2,4})\b/i);
  if (myMatch) {
    const y = parseInt(myMatch[1], 10);
    return y < 100 ? 2000 + y : y;
  }
  const yearMatch = String(desc).match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) {
    return parseInt(yearMatch[1], 10);
  }
  return 2026;
}

function extractMake(desc, modelCode, isUsed) {
  const text = `${modelCode || ''} ${desc || ''}`;
  for (const make of KNOWN_MAKES) {
    const escaped = make.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(text)) {
      return make === 'Mercedes' ? 'Mercedes-Benz' : make;
    }
  }
  return isUsed ? 'Used Brand' : 'Hyundai';
}

function extractModel(desc, make) {
  const s = String(desc || '').trim();
  if (!s) return 'Unspecified';

  const hyundaiModels = [
    'STARIA LOAD', 'STARIA', 'SANTA FE', 'TUCSON', 'KONA HEV', 'KONA',
    'VENUE', 'I30 SEDAN', 'I30 N', 'I30', 'I20 N', 'I20', 'PALISADE',
    'INSTER', 'ILOAD', 'IONIQ 5', 'IONIQ 6', 'IONIQ', 'SONATA', 'ACCENT'
  ];
  for (const m of hyundaiModels) {
    if (new RegExp(`\\b${m}\\b`, 'i').test(s)) {
      return m;
    }
  }

  const dotMatch = s.match(/[A-Z0-9]+(?:\.[A-Z0-9]+)+\s+([A-Z0-9]+(?:\s+[A-Z0-9]+)?)/i);
  if (dotMatch && dotMatch[1]) {
    const cleaned = dotMatch[1].replace(/\b(?:MY\d{2}|AUTO|DCT|WAGON|VAN|SEDAN|HBK|HATCH|2WD|AWD|4WD|1\.6P|2\.0P|2\.2D)\b/gi, '').trim();
    if (cleaned.length > 2) return cleaned.toUpperCase();
  }

  const words = s.split(/\s+/).filter(w => !/^(MY\d{2}|5dr|3dr|4dr|2dr|SA|CVT|DSG|Auto|Man|WAG|SED|HBK|UTE|VAN|CC|4x4|4x2|AWD|2WD|\d\.\d[a-z]?|\d+sp)$/i.test(w));
  if (words.length > 0) {
    return words.slice(0, 2).join(' ');
  }

  return 'Unspecified';
}

export function parseCsvContent(content) {
  const parsed = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  if (parsed.errors.length > 0) {
    const severe = parsed.errors.filter(e => e.type !== 'FieldMismatch');
    if (severe.length > 0) {
      throw new Error(`CSV parse error: ${severe.map(e => e.message).join('; ')}`);
    }
  }
  return parsed.data;
}

export async function processCsvRows(rows, options = {}) {
  const { fileName = 'import.csv', source = 'manual_import' } = options;
  if (!rows || rows.length === 0) {
    return { success: true, processed: 0, vehiclesCreated: 0, vehiclesUpdated: 0, dealsCreated: 0, dealsUpdated: 0 };
  }

  const first = rows[0];
  const isTypeB = Object.hasOwn(first, 'selling_price') || Object.hasOwn(first, 'vehicle price') || Object.hasOwn(first, 'settlements');

  const stockNumbers = [...new Set(rows.map(r => String(r.stock_number || r['stock no'] || r['stock#'] || '').trim()).filter(Boolean))];
  const dealNumbers = [...new Set(rows.map(r => String(r.deal_number || r['deal no'] || r.deal || '').trim()).filter(Boolean))];

  // Batch load existing vehicles & deals in single indexed queries
  const existingVehicles = await Vehicle.find({
    $or: [
      { stockNumber: { $in: stockNumbers } },
      { deal: { $in: dealNumbers } },
    ],
  });
  const vehicleByStock = new Map();
  const vehicleByDeal = new Map();
  for (const v of existingVehicles) {
    if (v.stockNumber) vehicleByStock.set(v.stockNumber, v);
    if (v.deal) vehicleByDeal.set(v.deal, v);
  }

  const existingDeals = await DealJacket.find({
    dealNumber: { $in: dealNumbers },
  });
  const dealByNumber = new Map();
  for (const d of existingDeals) {
    dealByNumber.set(d.dealNumber, d);
  }

  let vehiclesCreated = 0;
  let vehiclesUpdated = 0;
  let dealsCreated = 0;
  let dealsUpdated = 0;

  for (const row of rows) {
    const dealNumber = String(row.deal_number || row['deal no'] || row.deal || '').trim();
    const stockNumber = String(row.stock_number || row['stock no'] || row['stock#'] || '').trim();

    if (!dealNumber && !stockNumber) continue;

    const rawDate = row.date || row.delivery_date;
    const deliveryDate = rawDate ? parseDate(rawDate) : new Date();

    const isUsed = String(dealNumber).toUpperCase().startsWith('DU') ||
      String(row.model_code || '').toLowerCase().includes('used') ||
      String(row.department || '').toUpperCase() === 'DU' ||
      String(stockNumber).toUpperCase().startsWith('S');

    // 1. Vehicle Lookup / Creation
    let vehicle = null;
    if (stockNumber && vehicleByStock.has(stockNumber)) {
      vehicle = vehicleByStock.get(stockNumber);
    } else if (dealNumber && vehicleByDeal.has(dealNumber)) {
      vehicle = vehicleByDeal.get(dealNumber);
    }

    const desc = String(row.description || row.variant || row.carline || '').trim();
    const colour = String(row.colour_trim || row.colour || '').trim();
    const make = vehicle?.make && vehicle.make !== 'Used Brand'
      ? vehicle.make
      : extractMake(desc, row.model_code, isUsed);
    const model = vehicle?.model && vehicle.model !== 'Unspecified'
      ? vehicle.model
      : extractModel(desc, make);
    const year = vehicle?.year || extractYear(desc);
    const vehicleClass = isUsed ? 'used' : 'new';

    if (vehicle) {
      let changed = false;
      if (dealNumber && vehicle.deal !== dealNumber) {
        vehicle.deal = dealNumber;
        changed = true;
      }
      if (vehicle.status !== 'delivered') {
        vehicle.status = 'delivered';
        changed = true;
      }
      if (colour && !vehicle.colour) {
        vehicle.colour = colour;
        changed = true;
      }
      if (desc && (!vehicle.csvDescription || vehicle.csvDescription === 'Unspecified')) {
        vehicle.csvDescription = desc;
        vehicle.variant = desc;
        changed = true;
      }
      if (isTypeB) {
        const vehiclePriceCents = cents(row['vehicle price']);
        if (vehiclePriceCents > 0 && vehicle.totalCostCents !== vehiclePriceCents) {
          vehicle.listPriceCents = cents(row.selling_price) || vehiclePriceCents;
          vehicle.totalCostCents = vehiclePriceCents;
          vehicle.costLines = [
            {
              type: 'invoice',
              amountCents: vehiclePriceCents,
              sourceDocRef: `${fileName}:${stockNumber || dealNumber}`,
              addedAt: deliveryDate,
            },
          ];
          changed = true;
        }
      }
      if (changed) {
        await vehicle.save();
        vehiclesUpdated++;
      }
    } else if (stockNumber) {
      const vehiclePriceCents = isTypeB ? cents(row['vehicle price']) : (isUsed ? 2400000 : 3800000);
      const listPriceCents = isTypeB ? cents(row.selling_price) : (vehiclePriceCents + 400000);

      vehicle = await Vehicle.create({
        vin: stableVin(stockNumber),
        stockNumber,
        make,
        model,
        variant: desc,
        csvDescription: desc,
        registrationNumber: '',
        odometerKm: null,
        colour,
        location: isUsed ? 'DANDUSED' : 'DAHY',
        listPriceCents,
        ageDays: 0,
        deal: dealNumber,
        sourceStatus: 'DELIVERED',
        openRoPo: 'N',
        csvSource: fileName,
        year,
        class: vehicleClass,
        status: 'delivered',
        purchaseInvoiceRef: `DANDENONG-${stockNumber}`,
        costLines: [
          {
            type: 'invoice',
            amountCents: vehiclePriceCents,
            sourceDocRef: `${fileName}:${stockNumber}`,
            addedAt: deliveryDate,
          },
        ],
        totalCostCents: vehiclePriceCents,
        createdAt: deliveryDate,
        updatedAt: new Date(),
        isIllustrative: false,
      });

      vehicleByStock.set(stockNumber, vehicle);
      if (dealNumber) vehicleByDeal.set(dealNumber, vehicle);
      vehiclesCreated++;
    }

    // 2. DealJacket Upsert
    if (dealNumber && vehicle) {
      let existingDeal = dealByNumber.get(dealNumber);

      const customerRef = row.customer_code
        ? `Customer #${row.customer_code}`
        : (existingDeal?.customerRef || 'Confidential Customer');
      const salespersonCode = String(row.salesperson_code || existingDeal?.salespersonCode || '').trim();
      const modelCode = String(row.model_code || existingDeal?.modelCode || '').trim();
      const department = String(row.department || (isUsed ? 'DU' : dealNumber.startsWith('DHF') ? 'DHF' : 'DH')).trim();

      if (isTypeB) {
        const sellingPriceCents = cents(row.selling_price);
        const gstCents = cents(row.tax) || Math.round(sellingPriceCents / 11);
        const tradeAllowanceCents = Math.abs(cents(row['trade in (incl gst)']));
        const tradeAcvCents = tradeAllowanceCents;
        const payoffCents = 0;
        const dealerAccessoriesCents = cents(row['dealer accessories']);
        const dealerDeliveryCents = cents(row['dealer delivery']);
        const factoryOptionsCents = cents(row['factory options']);
        const miscellaneousCents = cents(row.miscellaneous);
        const colourCostCents = cents(row.colour);
        const registrationCtpCents = cents(row['registration & ctp']);
        const stampDutyCents = cents(row['stamp duty']);
        const settlementsCents = cents(row.settlements);
        const balanceOwingCents = cents(row.balance_owing);
        const vehicleDepositCents = cents(row['vehicle deposit']);

        const fniBackEndCents = Math.max(0, dealerAccessoriesCents + factoryOptionsCents + colourCostCents);
        const docFeeCents = dealerDeliveryCents > 0 ? dealerDeliveryCents : 49500;
        const commissionCents = Math.round(sellingPriceCents * 0.01);
        const vehicleCostCents = cents(row['vehicle price']) || vehicle.totalCostCents || 0;
        const frontGrossCents = Math.max(0, sellingPriceCents - gstCents - vehicleCostCents);
        const backGrossCents = fniBackEndCents + docFeeCents - commissionCents;
        const dealContributionCents = frontGrossCents + backGrossCents;

        const dealData = {
          vehicleId: vehicle._id,
          dealNumber,
          customerRef,
          salespersonCode,
          modelCode,
          department,
          deliveryDate,
          sellingPriceCents,
          gstCents,
          tradeAllowanceCents,
          tradeAcvCents,
          payoffCents,
          fniBackEndCents,
          docFeeCents,
          commissionCents,
          frontGrossCents,
          backGrossCents,
          dealContributionCents,
          settlementsCents,
          balanceOwingCents,
          vehicleDepositCents,
          stampDutyCents,
          registrationCtpCents,
          dealerAccessoriesCents,
          dealerDeliveryCents,
          factoryOptionsCents,
          miscellaneousCents,
          isIllustrative: false,
        };

        if (existingDeal) {
          Object.assign(existingDeal, dealData);
          await existingDeal.save();
          dealsUpdated++;
        } else {
          const created = await DealJacket.create(dealData);
          dealByNumber.set(dealNumber, created);
          dealsCreated++;
        }
      } else {
        // Type A - Transaction Register
        if (existingDeal) {
          let updated = false;
          if (customerRef && existingDeal.customerRef !== customerRef) {
            existingDeal.customerRef = customerRef;
            updated = true;
          }
          if (salespersonCode && existingDeal.salespersonCode !== salespersonCode) {
            existingDeal.salespersonCode = salespersonCode;
            updated = true;
          }
          if (modelCode && existingDeal.modelCode !== modelCode) {
            existingDeal.modelCode = modelCode;
            updated = true;
          }
          if (department && existingDeal.department !== department) {
            existingDeal.department = department;
            updated = true;
          }
          if (vehicle._id && String(existingDeal.vehicleId) !== String(vehicle._id)) {
            existingDeal.vehicleId = vehicle._id;
            updated = true;
          }
          if (updated) {
            await existingDeal.save();
            dealsUpdated++;
          }
        } else {
          // New Deal from Type A
          const sellingPriceCents = vehicle.listPriceCents > 0
            ? vehicle.listPriceCents
            : (isUsed ? 2850000 : 4200000);
          const gstCents = Math.round(sellingPriceCents / 11);
          const frontGrossCents = Math.round(sellingPriceCents * 0.08); // 8% front gross
          const fniBackEndCents = 150000; // $1,500 backend
          const docFeeCents = 49500; // $495
          const commissionCents = Math.round(sellingPriceCents * 0.01); // 1%
          const backGrossCents = fniBackEndCents + docFeeCents - commissionCents;
          const dealContributionCents = frontGrossCents + backGrossCents;

          const created = await DealJacket.create({
            vehicleId: vehicle._id,
            dealNumber,
            customerRef,
            salespersonCode,
            modelCode,
            department,
            deliveryDate,
            sellingPriceCents,
            gstCents,
            tradeAllowanceCents: 0,
            tradeAcvCents: 0,
            payoffCents: 0,
            fniBackEndCents,
            docFeeCents,
            commissionCents,
            frontGrossCents,
            backGrossCents,
            dealContributionCents,
            isIllustrative: false,
          });
          dealByNumber.set(dealNumber, created);
          dealsCreated++;
        }
      }
    }
  }

  return {
    success: true,
    processed: rows.length,
    vehiclesCreated,
    vehiclesUpdated,
    dealsCreated,
    dealsUpdated,
  };
}

export async function importCsvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const fileName = path.basename(filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const rows = parseCsvContent(content);
  return processCsvRows(rows, { fileName });
}

export async function importAllDefaultCsvs() {
  const importsDir = path.resolve('src/data/imports');
  const order = ['used_deals.csv', 'new_deals.csv', 'fleet_deals.csv', 'deal_costings.csv'];
  const results = {};

  for (const file of order) {
    const fullPath = path.join(importsDir, file);
    if (fs.existsSync(fullPath)) {
      results[file] = await importCsvFile(fullPath);
    }
  }

  const totals = Object.values(results).reduce(
    (acc, cur) => ({
      processed: acc.processed + cur.processed,
      vehiclesCreated: acc.vehiclesCreated + cur.vehiclesCreated,
      vehiclesUpdated: acc.vehiclesUpdated + cur.vehiclesUpdated,
      dealsCreated: acc.dealsCreated + cur.dealsCreated,
      dealsUpdated: acc.dealsUpdated + cur.dealsUpdated,
    }),
    { processed: 0, vehiclesCreated: 0, vehiclesUpdated: 0, dealsCreated: 0, dealsUpdated: 0 }
  );

  return { files: results, totals };
}
