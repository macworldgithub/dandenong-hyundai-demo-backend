import 'dotenv/config';
import mongoose from 'mongoose';
import { apInvoicesFixture } from '../src/seed/fixtures/apInvoices.js';

try {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  const invoices = await db.collection('apinvoices').find({}, { projection: { invoiceNumber: 1, invoiceDate: 1, subtotalCents: 1, gstCents: 1, grossCents: 1, lines: 1, fileName: 1, filePath: 1, isIllustrative: 1, status: 1 } }).toArray();
  const fixtures = new Map(apInvoicesFixture.map(x => [x.invoiceNumber, x]));
  const day = v => v ? new Date(v).toISOString().slice(0, 10) : null;
  const matches = invoices.map(i => {
    const f = fixtures.get(i.invoiceNumber);
    const sameAmounts = !!f && ['subtotalCents', 'gstCents', 'grossCents'].every(k => i[k] === f[k]);
    const sameLines = !!f && JSON.stringify((i.lines || []).map(l => [l.description, l.quantity, l.unitPriceCents, l.totalCents])) === JSON.stringify((f.lines || []).map(l => [l.description, l.quantity, l.unitPriceCents, l.totalCents]));
    return { invoiceNumber: i.invoiceNumber, fixtureNumberMatch: !!f, sameAmounts, sameLines, sameDate: !!f && day(i.invoiceDate) === day(f.invoiceDate), hasSourceFile: !!(i.fileName || i.filePath), isIllustrative: i.isIllustrative ?? null, status: i.status };
  });
  const uploadLogs = await db.collection('auditlogs').countDocuments({ action: 'invoice_uploaded' });
  console.log(JSON.stringify({ database: db.databaseName, checkedAt: new Date().toISOString(), totalInvoices: invoices.length, fixtureCount: fixtures.size, exactFixtureMatches: matches.filter(x => x.sameAmounts && x.sameLines && x.sameDate).length, fixtureNumberMatches: matches.filter(x => x.fixtureNumberMatch).length, invoicesWithSourceFiles: matches.filter(x => x.hasSourceFile).length, uploadAuditEvents: uploadLogs, illustrativeTrue: matches.filter(x => x.isIllustrative === true).length, illustrativeFalse: matches.filter(x => x.isIllustrative === false).length, records: matches }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ error: 'Database verification failed', type: error.name, code: error.code || null }));
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
