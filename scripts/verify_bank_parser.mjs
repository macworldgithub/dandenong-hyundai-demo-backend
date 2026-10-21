import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import XLSX from 'xlsx';
import { parseBankStatementFile } from '../src/utils/csv.js';

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bank-parser-'));
const csv = path.join(directory, 'statement.csv');
try {
  fs.writeFileSync(csv, 'Weekly management pack\nRooftop,Dandenong\nPeriod,2026-09\nDepartment,Revenue,Costs,Gross,Target,Variance,Notes\nNew,100,80,20,25,-5,Review\n');
  assert.throws(() => parseBankStatementFile(csv), e => e.statusCode === 422 && /Weekly management packs/.test(e.message));
  fs.writeFileSync(csv, 'NAB statement\nAccount,Operating\nDate,Description,Debit,Credit,Balance\n01/09/2026,"Supplier, payment",100,,900\n02/09/2026,Receipt,,200,1100\n');
  const rows = parseBankStatementFile(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].Description, 'Supplier, payment');
  assert.equal(rows[1].Credit, '200');
  fs.writeFileSync(csv, 'Date;Description;Amount\n01/09/2026;Payment;-100\n');
  assert.equal(parseBankStatementFile(csv)[0].Amount, '-100');
  fs.writeFileSync(csv, 'Date,Description,Amount\n01/09/2026,Payment,-100,unexpected\n');
  assert.throws(() => parseBankStatementFile(csv), /extra columns/);
  fs.writeFileSync(csv, 'Date,Description,Amount,Amount\n01/09/2026,Payment,-100,-100\n');
  assert.throws(() => parseBankStatementFile(csv), /duplicate column/);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['NAB statement'], ['Date','Description','Amount'], [new Date('2026-09-01T00:00:00Z'),'Payment',-100]]), 'Transactions');
  const xlsx = path.join(directory, 'statement.xlsx');
  XLSX.writeFile(workbook, xlsx);
  const spreadsheetRows = parseBankStatementFile(xlsx);
  assert.equal(spreadsheetRows.length, 1);
  assert.equal(spreadsheetRows[0].Amount, -100);
  assert.ok(spreadsheetRows[0].Date instanceof Date);
  console.log('Passed: report rejection, CSV preamble and quoted descriptions, semicolon CSV, extra-column rejection, duplicate-header rejection, XLSX preamble.');
} finally {
  for (const name of fs.readdirSync(directory)) fs.unlinkSync(path.join(directory, name));
  fs.rmdirSync(directory);
}
