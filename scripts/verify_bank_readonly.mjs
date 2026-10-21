import 'dotenv/config';
import mongoose from 'mongoose';
import { bankStatementsFixture } from '../src/seed/fixtures/bankStatements.js';
import { bankAccountsFixture } from '../src/seed/fixtures/bankAccounts.js';
const day = v => v ? new Date(v).toISOString().slice(0,10) : null;
try {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  const [accounts, statements, transactions, periods] = await Promise.all(['bankaccounts','bankstatements','banktransactions','periods'].map(n => db.collection(n).find().toArray()));
  const accountMap = new Map(accounts.map(a => [String(a._id), a]));
  const periodMap = new Map(periods.map(p => [String(p._id), p.code]));
  const fixtureFor = s => bankStatementsFixture.find(f => f.fileName === s.fileName && f.bankAccountType === accountMap.get(String(s.bankAccountId))?.type && f.periodCode === periodMap.get(String(s.periodId)));
  const key = t => JSON.stringify([day(t.date),t.description,t.amountCents,t.direction]);
  let matchedTransactions = 0;
  const details = statements.map(s => {
    const f = fixtureFor(s);
    const rows = transactions.filter(t => String(t.statementId) === String(s._id));
    const keys = new Map();
    for (const t of f?.transactions || []) keys.set(key(t), (keys.get(key(t)) || 0) + 1);
    let matched = 0;
    for (const t of rows) { const k = key(t); if ((keys.get(k)||0)>0) { matched++; keys.set(k,keys.get(k)-1); } }
    matchedTransactions += matched;
    return { fileName:s.fileName, account:accountMap.get(String(s.bankAccountId))?.name, period:periodMap.get(String(s.periodId)), fixtureMatch:!!f, balancesMatch:!!f && s.openingBalanceCents===f.openingBalanceCents && s.closingBalanceCents===f.closingBalanceCents, transactionCount:rows.length, fixtureTransactionMatches:matched, hasContentHash:!!s.contentHash, isIllustrative:s.isIllustrative??null };
  });
  console.log(JSON.stringify({database:db.databaseName, checkedAt:new Date().toISOString(), bankAccountCount:accounts.length, accountsMatchingFixtures:accounts.filter(a=>bankAccountsFixture.some(f=>['name','bsb','accountNumber','type','openingBalanceCents'].every(k=>a[k]===f[k]))).length, statementCount:statements.length, transactionCount:transactions.length, fixtureTransactionMatches:matchedTransactions, transactionsMarkedIllustrative:transactions.filter(t=>t.isIllustrative===true).length, statementDetails:details},null,2));
} catch (e) { console.error(JSON.stringify({error:'Read-only database verification failed',type:e.name,code:e.code||null})); process.exitCode=1; }
finally { await mongoose.disconnect(); }
