import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';
import { connectDB, disconnectDB } from '../config/db.js';
import Vehicle from '../models/Vehicle.js';

const snapshotDate = new Date();
const defaultCsvDirectory = path.join(process.env.USERPROFILE || process.env.HOME || '.', 'Downloads');

const defaultFiles = [
  '50_DandenongMitsubishi_Hyundai_SUZUKI_New.csv',
  '50_DandenongMitsubishi_Hyundai_OMODAJAECOO_New.csv',
  '50_DandenongMitsubishi_Hyundai_NISSAN_New.csv',
  '50_DandenongMitsubishi_Hyundai_MITSUBISHI_New.csv',
  '50_DandenongMitsubishi_Hyundai_MG_New.csv',
  '50_DandenongMitsubishi_Hyundai_KIA_New.csv',
  '50_DandenongMitsubishi_Hyundai_HYUNDAI_New.csv',
  '50_DandenongMitsubishi_Hyundai_HOLDEN_New.csv',
  '50_DandenongMitsubishi_Hyundai_GREATWALL_New.csv',
  '50_DandenongMitsubishi_Hyundai_GENESIS_Used.csv',
  '50_DandenongMitsubishi_Hyundai_GEELY_New.csv',
  '50_DandenongMitsubishi_Hyundai_GAC_Used.csv',
  '50_DandenongMitsubishi_Hyundai_GAC_New.csv',
  '50_DandenongMitsubishi_Hyundai_FORD_Used.csv',
  '50_DandenongMitsubishi_Hyundai_FIAT_Used.csv',
  '50_DandenongMitsubishi_Hyundai_CITROEN_Used.csv',
  '50_DandenongMitsubishi_Hyundai_CHRYSLERJEEP_Used.csv',
  '50_DandenongMitsubishi_Hyundai_CHERY_Used.csv',
];

const makeNames = {
  CHRYSLERJEEP: 'Chrysler Jeep',
  GREATWALL: 'Great Wall',
  MG: 'MG',
  GAC: 'GAC',
  KIA: 'Kia',
};

function readCsv(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const parsed = Papa.parse(source, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase(),
  });
  if (parsed.errors.length) {
    throw new Error(`${path.basename(filePath)}: ${parsed.errors.map((error) => error.message).join('; ')}`);
  }
  return parsed.data;
}

function cents(value) {
  const amount = Number.parseFloat(String(value || '').replace(/[$,]/g, ''));
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

function numberOrNull(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function stableInventoryId(stockNumber) {
  return `DAN${crypto.createHash('sha256').update(stockNumber).digest('hex').slice(0, 14)}`.toUpperCase();
}

function inventoryDate(age) {
  const days = numberOrNull(age);
  if (days === null || days < 0) return snapshotDate;
  return new Date(snapshotDate.getTime() - days * 86_400_000);
}

function titleCase(value) {
  return value
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function sourceMeta(fileName) {
  const match = fileName.match(/^50_DandenongMitsubishi_Hyundai_(.+)_(New|Used)\.csv$/i);
  if (!match) throw new Error(`Unexpected CSV filename: ${fileName}`);

  const code = match[1].toUpperCase();
  return {
    make: makeNames[code] || titleCase(code.replace(/_/g, ' ')),
    fileClass: match[2].toLowerCase(),
  };
}

function yearFromRow(row) {
  const supplied = numberOrNull(row.year);
  if (supplied !== null) return supplied < 100 ? 2000 + supplied : supplied;
  const modelYear = String(row.description || '').match(/\bMY(\d{2})\b/i)?.[1];
  return modelYear ? 2000 + Number.parseInt(modelYear, 10) : snapshotDate.getUTCFullYear();
}

function vehicleClass(row, fileClass) {
  if (Object.hasOwn(row, 'stock no') || fileClass === 'used') return 'used';
  return /DEMO|LOANER/i.test(row.status || '') ? 'demo' : 'new';
}

function vehicleStatus(status) {
  return /^(SOLD|WHOLESALE|DLR TRADE|STOCK SWAP)$/i.test(status || '') ? 'delivered' : 'in_stock';
}

function toVehicle(row, sourceFile) {
  const { make, fileClass } = sourceMeta(sourceFile);
  const stockNumber = String(row['stock no'] || row['stock#'] || '').trim();
  const amountCents = cents(row['list price']);
  const age = row.age_1 || row.age;
  const ageDays = numberOrNull(age);
  const odometerKm = numberOrNull(row.odometer);

  return {
    vin: stableInventoryId(stockNumber),
    stockNumber,
    make,
    model: String(row.carline || 'Unspecified').trim() || 'Unspecified',
    variant: String(row.description || '').trim(),
    csvDescription: String(row.description || '').trim(),
    registrationNumber: String(row['reg no'] || '').trim(),
    odometerKm,
    colour: String(row.colour || '').trim(),
    location: String(row.loc || '').trim(),
    listPriceCents: amountCents,
    ageDays,
    deal: String(row.deal || '').trim(),
    sourceStatus: String(row.status || '').trim(),
    openRoPo: String(row['open ro/po'] || '').trim(),
    csvSource: sourceFile,
    year: yearFromRow(row),
    class: vehicleClass(row, fileClass),
    status: vehicleStatus(row.status),
    purchaseInvoiceRef: `DANDENONG-${stockNumber}`,
    costLines: [{ type: 'invoice', amountCents, sourceDocRef: `${sourceFile}:${stockNumber}` }],
    totalCostCents: amountCents,
    createdAt: inventoryDate(age),
    updatedAt: snapshotDate,
    isIllustrative: false,
  };
}

function csvPaths() {
  const cliFiles = process.argv.slice(2);
  return (cliFiles.length ? cliFiles : defaultFiles).map((file) =>
    path.isAbsolute(file) ? file : path.join(defaultCsvDirectory, file)
  );
}

async function importVehicleCsvs() {
  const files = csvPaths();
  const missing = files.filter((file) => !fs.existsSync(file));
  if (missing.length) throw new Error(`Missing CSV files:\n${missing.join('\n')}`);

  const vehicles = files.flatMap((filePath) => {
    const fileName = path.basename(filePath);
    return readCsv(filePath)
      .map((row) => toVehicle(row, fileName))
      .filter((vehicle) => vehicle.stockNumber);
  });

  const stockNumbers = vehicles.map((vehicle) => vehicle.stockNumber);
  const duplicateStockNumbers = [...new Set(stockNumbers.filter((stock, index) => stockNumbers.indexOf(stock) !== index))];
  if (duplicateStockNumbers.length) {
    throw new Error(`Duplicate stock numbers in CSV import: ${duplicateStockNumbers.join(', ')}`);
  }

  await connectDB();

  const result = await Vehicle.bulkWrite(
    vehicles.map((vehicle) => ({
      updateOne: {
        filter: { stockNumber: vehicle.stockNumber },
        update: { $set: vehicle },
        upsert: true,
      },
    })),
    { ordered: false }
  );

  const byClass = vehicles.reduce((summary, vehicle) => {
    summary[vehicle.class] = (summary[vehicle.class] || 0) + 1;
    return summary;
  }, {});

  console.log(`Imported ${vehicles.length} vehicles from ${files.length} CSV files`, {
    inserted: result.upsertedCount,
    updated: result.modifiedCount,
    matched: result.matchedCount,
    byClass,
  });
}

importVehicleCsvs()
  .then(disconnectDB)
  .catch(async (error) => {
    console.error('Vehicle CSV import failed:', error);
    await disconnectDB();
    process.exit(1);
  });

