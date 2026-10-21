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

// Bank exports may start with report metadata rather than the transaction header.
// Do not use the first two columns as a fallback: a management report is not a statement.
export function bankStatementColumns(headers) {
  const find = pattern => headers.find(h => pattern.test(String(h).trim()));
  return {
    dateCol: find(/^(?:transaction\s+|posting\s+|value\s+)?date$/i),
    descCol: find(/^(?:transaction\s+)?(?:description|narration|details?|memo)$/i),
    amountCol: find(/^(?:transaction\s+)?amount(?:\s*\([^)]*\))?$/i),
    debitCol: find(/^(?:debit|withdrawals?)(?:\s+amount)?(?:\s*\([^)]*\))?$/i),
    creditCol: find(/^(?:credit|deposits?)(?:\s+amount)?(?:\s*\([^)]*\))?$/i),
    balanceCol: find(/^(?:(?:running|closing)\s+)?balance(?:\s*\([^)]*\))?$/i),
  };
}

export function parseBankStatementFile(filePath, originalName) {
  const invalid = message => Object.assign(new Error(message), { statusCode: 422 });
  const ext = (originalName || filePath).toLowerCase().split('.').pop();
  if (ext === 'ofx') return parseOFX(filePath);
  let matrix;
  if (ext === 'csv') {
    const parsed = Papa.parse(fs.readFileSync(filePath, 'utf8'), { header: false, skipEmptyLines: 'greedy' });
    const errors = parsed.errors.filter(e => e.code !== 'UndetectableDelimiter');
    if (errors.length) throw invalid('Unable to read this CSV. Export a fresh bank transaction statement and try again.');
    matrix = parsed.data;
  } else if (ext === 'xlsx' || ext === 'xls') {
    const workbook = XLSX.readFile(filePath, { cellDates: true });
    if (!workbook.SheetNames.length) throw invalid('The workbook contains no sheets.');
    matrix = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '', blankrows: false });
  } else {
    throw invalid('Upload a bank statement in CSV, XLSX, XLS or OFX format.');
  }
  const headerIndex = matrix.findIndex(row => {
    const c = bankStatementColumns(row);
    return c.dateCol && c.descCol && (c.amountCol || (c.debitCol && c.creditCol));
  });
  if (headerIndex < 0) throw invalid('This file does not contain a bank transaction table. Upload a bank statement with Date, Description and either Amount or Debit and Credit columns. Weekly management packs and summary reports cannot be imported here.');
  const headers = matrix[headerIndex].map(h => String(h).trim());
  const nonempty = headers.filter(Boolean);
  if (new Set(nonempty.map(h => h.toLowerCase())).size !== nonempty.length) throw invalid('The statement contains duplicate column names. Export a statement with unique headers.');
  return matrix.slice(headerIndex + 1).map((row, index) => {
    if (row.length > headers.length && row.slice(headers.length).some(v => String(v).trim())) throw invalid(`Statement row ${headerIndex + index + 2} has extra columns. Check CSV quoting and separators.`);
    return Object.fromEntries(headers.filter(Boolean).map(h => [h, row[headers.indexOf(h)] ?? '']));
  });
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
