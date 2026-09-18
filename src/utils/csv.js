import Papa from 'papaparse';
import XLSX from 'xlsx';
import fs from 'fs';

/**
 * Parse a CSV file and return an array of row objects.
 */
export function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const result = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false, // keep as strings — we control conversion
    transformHeader: (h) => h.trim(),
  });
  if (result.errors.length > 0) {
    const messages = result.errors.map((e) => `Row ${e.row}: ${e.message}`);
    throw new Error(`CSV parse errors:\n${messages.join('\n')}`);
  }
  return result.data;
}

/**
 * Parse an XLSX file (first sheet) and return an array of row objects.
 */
export function parseXLSX(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('XLSX file contains no sheets');
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

/**
 * Auto-detect format and parse.
 */
export function parseFile(filePath, originalName) {
  const ext = (originalName || filePath).toLowerCase().split('.').pop();
  if (ext === 'ofx') return parseOFX(filePath);
  if (ext === 'csv') return parseCSV(filePath);
  if (ext === 'xlsx' || ext === 'xls') return parseXLSX(filePath);
  throw Object.assign(new Error(`Unsupported file format: .${ext}. Use CSV, OFX or XLSX.`), { statusCode: 422 });
}


export function parseDate(value) {
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    const d = XLSX.SSF.parse_date_code(value);
    return d ? new Date(Date.UTC(d.y, d.m - 1, d.d)) : new Date(NaN);
  }
  const local = String(value).match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (local) {
    const d = new Date(Date.UTC(+local[3], +local[2] - 1, +local[1]));
    return d.getUTCDate() === +local[1] && d.getUTCMonth() === +local[2] - 1 ? d : new Date(NaN);
  }
  return new Date(value);
}

export function parseOFX(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const field = (block, tag) => block.match(new RegExp('<' + tag + '>\\s*([^<\\r\\n]+)', 'i'))?.[1]?.trim();
  const rows = [...text.matchAll(/<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>|<\/BANKTRANLIST>))/gi)].map(([,block]) => {
    const rawDate = field(block, 'DTPOSTED') || '';
    return { Date: `${rawDate.slice(0,4)}-${rawDate.slice(4,6)}-${rawDate.slice(6,8)}`, Description: field(block,'MEMO') || field(block,'NAME') || field(block,'FITID'), Amount: field(block,'TRNAMT') };
  });
  const balance = text.match(/<LEDGERBAL>([\s\S]*?)(?:<\/LEDGERBAL>|$)/i);
  if (balance) rows.closingBalanceCents = Math.round(Number(field(balance[1], 'BALAMT')) * 100);
  return rows;
}
