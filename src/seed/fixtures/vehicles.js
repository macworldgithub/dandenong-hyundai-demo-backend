import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';

const fixtureDirectory = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.resolve(fixtureDirectory, '../data');
const snapshotDate = new Date('2026-09-24T00:00:00.000Z');

function readCsv(fileName) {
  const source = fs.readFileSync(path.join(dataDirectory, fileName), 'utf8');
  const parsed = Papa.parse(source, { header: true, skipEmptyLines: true });
  if (parsed.errors.length) {
    throw new Error(`${fileName}: ${parsed.errors.map((error) => error.message).join('; ')}`);
  }
  return parsed.data;
}

function cents(value) {
  const amount = Number.parseFloat(String(value || '').replace(/[$,]/g, ''));
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

function stableInventoryId(stockNumber) {
  return `DAN${crypto.createHash('sha256').update(stockNumber).digest('hex').slice(0, 14)}`.toUpperCase();
}

function inventoryDate(age) {
  const days = Number.parseInt(age, 10);
  if (!Number.isFinite(days) || days < 0) return snapshotDate;
  return new Date(snapshotDate.getTime() - days * 86_400_000);
}

function yearFromRow(row) {
  const supplied = Number.parseInt(row.year, 10);
  if (Number.isFinite(supplied)) return supplied < 100 ? 2000 + supplied : supplied;
  const modelYear = String(row.description || '').match(/\bMY(\d{2})\b/i)?.[1];
  return modelYear ? 2000 + Number.parseInt(modelYear, 10) : snapshotDate.getUTCFullYear();
}

function vehicleClass(row, usedStock) {
  if (usedStock) return 'used';
  return /DEMO|LOANER/i.test(row.status || '') ? 'demo' : 'new';
}

function vehicleStatus(status) {
  return /^(SOLD|WHOLESALE|DLR TRADE|STOCK SWAP)$/i.test(status || '') ? 'delivered' : 'in_stock';
}

function toVehicle(row, sourceFile) {
  // The supplied dandenong_new file has the used-stock schema (registration,
  // odometer and year); classify by schema so swapped filenames do not corrupt data.
  const usedStock = Object.hasOwn(row, 'stock no');
  const stockNumber = String(row['stock no'] || row['stock#'] || '').trim();
  const amountCents = cents(row['list price']);
  const age = usedStock ? row.age : row.age_1 || row.age;
  const ageDays = Number.parseInt(age, 10);
  const odometerKm = Number.parseInt(row.odometer, 10);

  return {
    vin: stableInventoryId(stockNumber),
    stockNumber,
    make: 'Hyundai',
    model: String(row.carline || 'Unspecified').trim() || 'Unspecified',
    variant: String(row.description || '').trim(),
    csvDescription: String(row.description || '').trim(),
    registrationNumber: String(row['reg no'] || '').trim(),
    odometerKm: Number.isFinite(odometerKm) ? odometerKm : null,
    colour: String(row.colour || '').trim(),
    location: String(row.loc || '').trim(),
    listPriceCents: amountCents,
    ageDays: Number.isFinite(ageDays) ? ageDays : null,
    deal: String(row.deal || '').trim(),
    sourceStatus: String(row.status || '').trim(),
    openRoPo: String(row['open ro/po'] || '').trim(),
    csvSource: sourceFile,
    year: yearFromRow(row),
    class: vehicleClass(row, usedStock),
    status: vehicleStatus(row.status),
    purchaseInvoiceRef: `DANDENONG-${stockNumber}`,
    costLines: [{ type: 'invoice', amountCents, sourceDocRef: `${sourceFile}:${stockNumber}` }],
    createdAt: inventoryDate(age),
    updatedAt: snapshotDate,
    isIllustrative: false,
  };
}

const sources = ['dandenong_new.csv', 'dandenong_used.csv'];
export const vehiclesFixture = sources.flatMap((fileName) =>
  readCsv(fileName).map((row) => toVehicle(row, fileName))
);

const stockNumbers = vehiclesFixture.map((vehicle) => vehicle.stockNumber);
if (stockNumbers.some((stockNumber) => !stockNumber)) throw new Error('Every CSV row must have a stock number');
if (new Set(stockNumbers).size !== stockNumbers.length) throw new Error('CSV stock numbers must be unique');
