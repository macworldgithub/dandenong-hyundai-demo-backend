import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';
import { connectDB, disconnectDB } from '../config/db.js';
import Vehicle from '../models/Vehicle.js';

const snapshotDate = new Date();
const downloadsDirectory = path.join(process.env.USERPROFILE || process.env.HOME || '.', 'Downloads');
const defaultCsvDirectory = fs.existsSync(path.join(downloadsDirectory, 'dandedong'))
  ? path.join(downloadsDirectory, 'dandedong')
  : downloadsDirectory;
const vehicleCsvPattern = /^50_(?:DandenongMitsubishi_Hyundai|dandenong)_.+_(?:New|Used)(?:csv)?\.csv$/i;

const makeNames = {
  ALFAROMEO: 'Alfa Romeo',
  BMW: 'BMW',
  BYD: 'BYD',
  CHRYSLERJEEP: 'Chrysler Jeep',
  GREATWALL: 'GWM',
  ISUZUUTE: 'Isuzu UTE',
  LANDROVER: 'Land Rover',
  LDV: 'LDV',
  OMODAJAECOO: 'Jaecoo',
  XPENG: 'XPeng',
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
  const match = fileName.match(/^50_(?:DandenongMitsubishi_Hyundai|dandenong)_(.+?)_(New|Used)(?:csv)?\.csv$/i);
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
  const args = process.argv.slice(2);
  const directoryOption = args.indexOf('--dir');
  const sourceDirectory = directoryOption === -1
    ? defaultCsvDirectory
    : path.resolve(args[directoryOption + 1] || '');
  if (directoryOption !== -1 && !args[directoryOption + 1]) {
    throw new Error('--dir requires a directory path');
  }

  const cliFiles = args.filter((argument, index) =>
    argument !== '--dry-run' &&
    argument !== '--dir' &&
    index !== directoryOption + 1
  );
  const files = cliFiles.length
    ? cliFiles
    : fs.readdirSync(sourceDirectory).filter((file) => vehicleCsvPattern.test(file)).sort();

  if (!files.length) throw new Error(`No vehicle CSV files found in ${sourceDirectory}`);
  return files.map((file) => path.isAbsolute(file) ? file : path.join(sourceDirectory, file));
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
  const seenStockNumbers = new Set();
  const duplicateStockNumbers = [...new Set(stockNumbers.filter((stock) => {
    if (seenStockNumbers.has(stock)) return true;
    seenStockNumbers.add(stock);
    return false;
  }))];
  if (duplicateStockNumbers.length) {
    throw new Error(`Duplicate stock numbers in CSV import: ${duplicateStockNumbers.join(', ')}`);
  }

  const byClass = vehicles.reduce((summary, vehicle) => {
    summary[vehicle.class] = (summary[vehicle.class] || 0) + 1;
    return summary;
  }, {});
  const byMake = vehicles.reduce((summary, vehicle) => {
    summary[vehicle.make] = (summary[vehicle.make] || 0) + 1;
    return summary;
  }, {});

  if (process.argv.includes('--dry-run')) {
    console.log(`Validated ${vehicles.length} vehicles from ${files.length} CSV files`, { byClass, byMake });
    return;
  }

  await connectDB();

  const existingVehicles = await Vehicle.find({
    $or: [
      { stockNumber: { $in: vehicles.map((vehicle) => vehicle.stockNumber) } },
      { vin: { $in: vehicles.map((vehicle) => vehicle.vin) } },
    ],
  }).select('stockNumber vin').lean();
  const existingStockNumbers = new Set(existingVehicles.map((vehicle) => vehicle.stockNumber));
  const existingVins = new Set(existingVehicles.map((vehicle) => vehicle.vin));
  const newVehicles = vehicles.filter((vehicle) =>
    !existingStockNumbers.has(vehicle.stockNumber) && !existingVins.has(vehicle.vin)
  );

  if (newVehicles.length) await Vehicle.insertMany(newVehicles, { ordered: false });

  console.log(`Processed ${vehicles.length} vehicles from ${files.length} CSV files`, {
    inserted: newVehicles.length,
    skippedExisting: vehicles.length - newVehicles.length,
    byClass,
    byMake,
  });
}

importVehicleCsvs()
  .then(disconnectDB)
  .catch(async (error) => {
    console.error('Vehicle CSV import failed:', error);
    await disconnectDB();
    process.exit(1);
  });

