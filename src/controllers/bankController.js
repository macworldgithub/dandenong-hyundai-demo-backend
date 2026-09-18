import { requestPeriod, resolvePeriod } from '../services/period.js';
import ApInvoice from '../models/ApInvoice.js';
import PaymentRun from '../models/PaymentRun.js';
import JournalEntry from '../models/JournalEntry.js';
import { z } from 'zod';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import BankAccount from '../models/BankAccount.js';
import BankStatement from '../models/BankStatement.js';
import BankTransaction from '../models/BankTransaction.js';
import Entity from '../models/Entity.js';
import { parseFile, parseDate } from '../utils/csv.js';
import { toCents, sumCents } from '../utils/money.js';
import { suggestMatches, runBulkMatching } from '../services/matching.js';
import { buildRecPack } from '../services/reconciliation.js';
import { postJournalEntry } from '../services/posting.js';
import { logAction } from '../services/auditLog.js';
import Account from '../models/Account.js';

export async function getBankAccounts(req, res) {
  const accounts = await BankAccount.find().populate('glAccountId', 'code name');
  res.json(accounts);
}

export async function importStatement(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { bankAccountId } = req.body;
  if (!bankAccountId) {
    return res.status(400).json({ error: 'bankAccountId is required' });
  }

  const bankAccount = await BankAccount.findById(bankAccountId);
  if (!bankAccount) {
    return res.status(404).json({ error: 'Bank account not found' });
  }

  const entity = await Entity.findOne();
  const periodId = await requestPeriod(req);
  const contentHash = createHash('sha256').update(fs.readFileSync(req.file.path)).digest('hex');
  if (await BankStatement.exists({ bankAccountId, contentHash })) return res.status(409).json({ error: 'This statement has already been imported' });

  // Parse the uploaded file
  const rows = parseFile(req.file.path, req.file.originalname);

  if (rows.length === 0) {
    return res.status(422).json({ error: 'File contains no data rows' });
  }

  // Detect column mapping (flexible header matching)
  const headers = Object.keys(rows[0]);
  const dateCol = headers.find((h) => /date/i.test(h)) || headers[0];
  const descCol = headers.find((h) => /desc|narrat|detail|memo/i.test(h)) || headers[1];
  const amountCol = headers.find((h) => /amount/i.test(h));
  const debitCol = headers.find((h) => /debit|withdraw/i.test(h));
  const creditCol = headers.find((h) => /credit|deposit/i.test(h));
  const balanceCol = headers.find((h) => /balance/i.test(h));

  if (!amountCol && !(debitCol && creditCol)) return res.status(422).json({ error: 'Statement requires Amount or Debit and Credit columns' });

  // Parse transactions
  const transactions = [];
  let runningBalance = null;

  for (const row of rows) {
    const dateStr = row[dateCol];
    const description = row[descCol] || '';
    let amountCents = 0;
    let direction = 'debit';

    if (amountCol) {
      const raw = parseFloat(String(row[amountCol]).replace(/[,$]/g, ''));
      amountCents = toCents(raw);
      direction = amountCents >= 0 ? 'credit' : 'debit';
    } else if (debitCol && creditCol) {
      const debit = parseFloat(String(row[debitCol] || '0').replace(/[,$]/g, ''));
      const credit = parseFloat(String(row[creditCol] || '0').replace(/[,$]/g, ''));
      if (debit > 0) {
        amountCents = -toCents(debit);
        direction = 'debit';
      } else {
        amountCents = toCents(credit);
        direction = 'credit';
      }
    }

    if (balanceCol && runningBalance === null) {
      runningBalance = toCents(parseFloat(String(row[balanceCol]).replace(/[,$]/g, '')));
    }

    const date = parseDate(dateStr);
    if (isNaN(date.getTime()) || !Number.isSafeInteger(amountCents) || !String(description).trim()) return res.status(422).json({ error: `Invalid date, amount or description on statement row ${transactions.length + 2}` });
    if (amountCents === 0) continue;

    transactions.push({
      bankAccountId,
      date,
      description: String(description).trim(),
      amountCents,
      direction,
      status: 'unmatched',
    });
  }

  // Compute opening and closing balances
  if (!transactions.length) return res.status(422).json({ error: 'No nonzero transactions in statement' });
  const openingBalanceCents = req.body.openingBalanceCents !== undefined ? z.coerce.number().int().parse(req.body.openingBalanceCents) : Number.isSafeInteger(rows.closingBalanceCents) ? rows.closingBalanceCents - sumCents(transactions.map(t => t.amountCents)) : runningBalance !== null
    ? runningBalance - (transactions[0]?.amountCents || 0)
    : bankAccount.openingBalanceCents;
  const closingBalanceCents = openingBalanceCents + sumCents(transactions.map((t) => t.amountCents));

  // Create statement record
  const statement = new BankStatement({
    bankAccountId,
    periodId,
    fileName: req.file.originalname,
    contentHash,
    importedAt: new Date(),
    openingBalanceCents,
    closingBalanceCents,
    lineCount: transactions.length,
  });
  await statement.save();

  // Create transaction records
  const savedTxns = [];
  for (const txn of transactions) {
    const bt = new BankTransaction({
      ...txn,
      statementId: statement._id,
    });
    await bt.save();
    savedTxns.push(bt);
  }

  // Run matching engine
  const matchResults = await runBulkMatching(bankAccountId);

  await logAction({
    userId: req.user._id,
    action: 'statement_imported',
    entityType: 'BankStatement',
    entityId: statement._id,
    after: {
      fileName: req.file.originalname,
      lineCount: transactions.length,
      openingBalanceCents,
      closingBalanceCents,
    },
  });

  res.status(201).json({
    statement,
    transactionCount: savedTxns.length,
    matchResults,
  });
}

export async function getTransactions(req, res) {
  const { status, from, to, q, page = 1, limit = 50, bankAccountId } = req.query;
  const filter = {};

  if (bankAccountId) filter.bankAccountId = bankAccountId;
  if (req.query.periodId) filter.statementId = { $in: await BankStatement.find({ periodId: await requestPeriod(req) }).distinct('_id') };
  if (status) filter.status = status;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }
  if (q) {
    filter.description = { $regex: q, $options: 'i' };
  }

  const total = await BankTransaction.countDocuments(filter);
  const transactions = await BankTransaction.find(filter)
    .sort({ date: -1 })
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit))
    .populate('bankAccountId', 'name type');

  res.json({
    transactions,
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / parseInt(limit)),
  });
}

export async function suggestMatchesEndpoint(req, res) {
  const candidates = await suggestMatches(req.params.id);
  res.json({ candidates });
}

async function postAllocation(req, res, split = false) {
  const txn = await BankTransaction.findById(req.params.id);
  if (!txn) return res.status(404).json({ error: 'Transaction not found' });
  if (txn.journalEntryId || ['matched','split'].includes(txn.status)) return res.status(409).json({ error: 'Transaction is already allocated; unmatch it before changing the allocation' });
  const allocations = z.array(z.object({
    amountCents: z.number().int().positive(), accountId: z.string().regex(/^[a-f\d]{24}$/i),
    dealId: z.string().optional(), vin: z.string().optional(), supplierId: z.string().optional(),
    invoiceId: z.string().optional(), paymentRunId: z.string().optional(), note: z.string().optional(),
  })).min(split ? 2 : 1).parse(req.body.allocations);
  if (sumCents(allocations.map(a => a.amountCents)) !== Math.abs(txn.amountCents)) return res.status(422).json({ error: 'Allocations must equal the transaction amount to the cent' });
  const bank = await BankAccount.findById(txn.bankAccountId);
  const statement = await BankStatement.findById(txn.statementId);
  const outgoing = txn.amountCents < 0;
  const lines = [{ accountId: bank.glAccountId, debitCents: outgoing ? 0 : txn.amountCents, creditCents: outgoing ? -txn.amountCents : 0 }];
  for (const a of allocations) {
    const account = await Account.findOne({ _id: a.accountId, isActive: true });
    if (!account || String(account._id) === String(bank.glAccountId)) return res.status(422).json({ error: 'Choose an active non-bank allocation account' });
    if (['trust','deposits'].includes(bank.type) && account.type === 'expense') return res.status(422).json({ error: 'Trust/deposit cash cannot be allocated to operating expenses' });
    if (a.invoiceId) {
      const invoice = await ApInvoice.findById(a.invoiceId);
      if (!outgoing || account.controlFor !== 'ap' || !invoice || invoice.status !== 'approved' || invoice.paidInRunId || invoice.grossCents !== a.amountCents) return res.status(422).json({ error: 'AP matching requires an unreserved approved invoice, exact amount and AP control account' });
      invoice.status = 'paid'; await invoice.save(); a.supplierId = String(invoice.supplierId);
    }
    lines.push({ ...a, accountId: account._id, department: account.department, debitCents: outgoing ? a.amountCents : 0, creditCents: outgoing ? 0 : a.amountCents });
  }
  // A statement payment matching an executed payment run clears an existing
  // cash posting. It must never debit AP and credit cash a second time.
  const runAllocation = allocations.find(a => a.paymentRunId);
  let entry;
  if (runAllocation) {
    const run = await PaymentRun.findById(runAllocation.paymentRunId);
    if (allocations.length !== 1 || !outgoing || !run?.journalEntryId || run.totalCents !== -txn.amountCents || String(run.bankAccountId) !== String(bank._id) || await BankTransaction.exists({ 'allocations.paymentRunId': run._id, status: 'matched' })) return res.status(422).json({ error: 'Payment run cannot be matched to this transaction' });
    entry = await JournalEntry.findById(run.journalEntryId); txn.matchedExistingJournal = true;
  } else {
    entry = await postJournalEntry({ periodId: statement.periodId, date: txn.date, source: 'bank', sourceRef: `BANK-${txn._id}`, narration: `Bank ${split ? 'split' : 'allocation'}: ${txn.description}`, lines, postedBy: req.user._id });
  }
  txn.allocations = allocations; txn.status = split ? 'split' : 'matched'; txn.matchConfidence = 1; txn.journalEntryId = entry._id;
  await txn.save();
  await logAction({ userId: req.user._id, action: 'bank_transaction_allocated', entityType: 'BankTransaction', entityId: txn._id, after: { allocations, journalEntryId: entry._id } });
  res.json({ transaction: txn, journalEntry: entry });
}

export async function allocateTransaction(req, res) { return postAllocation(req, res); }
export async function splitTransaction(req, res) { return postAllocation(req, res, true); }

export async function parkTransaction(req, res) {
  const txn = await BankTransaction.findById(req.params.id);
  if (!txn) return res.status(404).json({ error: 'Transaction not found' });

  if (txn.journalEntryId || ['matched','split'].includes(txn.status)) return res.status(422).json({ error: 'Unmatch a posted transaction before parking it' });
  txn.parkedReason = z.string().trim().min(1).parse(req.body.reason);
  txn.status = 'parked';
  await txn.save();

  await logAction({
    userId: req.user._id,
    action: 'bank_transaction_parked',
    entityType: 'BankTransaction',
    entityId: txn._id,
  });

  res.json({ transaction: txn });
}

export async function unmatchTransaction(req, res) {
  const txn = await BankTransaction.findById(req.params.id);
  if (!txn) return res.status(404).json({ error: 'Transaction not found' });

  // If there's a journal entry, reverse it
  if (txn.journalEntryId && !txn.matchedExistingJournal) {
    const { reverseJournalEntry } = await import('../services/posting.js');
    await reverseJournalEntry(txn.journalEntryId, req.user._id);
    txn.journalEntryId = null;
  }

  for (const a of txn.allocations) if (a.invoiceId) await ApInvoice.updateOne({ _id: a.invoiceId, paidInRunId: null }, { status: 'approved' });
  txn.journalEntryId = null; txn.matchedExistingJournal = false;
  txn.status = 'unmatched';
  txn.allocations = [];
  txn.matchConfidence = null;
  txn.matchType = null;
  await txn.save();

  res.json({ transaction: txn });
}

export async function buildRecPackEndpoint(req, res) {
  const { bankAccountId } = req.body;
  const entity = await Entity.findOne();

  // If no bankAccountId specified, use the first operating account
  let accountId = bankAccountId;
  if (!accountId) {
    const account = await BankAccount.findOne({ type: 'operating' });
    if (!account) return res.status(404).json({ error: 'No operating bank account found' });
    accountId = account._id;
  }

  const pack = await buildRecPack(accountId, await requestPeriod(req));
  res.json(pack);
}

export async function exportRecPack(req, res) {
  const { id } = req.params;
  const pack = await (await import('../models/ReconciliationPack.js')).default
    .findById(id)
    .populate('bankAccountId', 'name type bsb accountNumber');

  if (!pack) return res.status(404).json({ error: 'Rec pack not found' });

  const format = req.query.format || 'json';

  if (format === 'csv') {
    const lines = [
      ['Item', 'Amount'],
      ['Book Balance', (pack.bookBalanceCents / 100).toFixed(2)],
      ['Statement Balance', (pack.statementBalanceCents / 100).toFixed(2)],
      ...pack.outstandingItems.map((item) => [
        item.description,
        (item.amountCents / 100).toFixed(2),
      ]),
      ['Unexplained Difference', (pack.differenceCents / 100).toFixed(2)],
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="rec-pack-${id}.csv"`);
    res.send(lines.map((l) => l.join(',')).join('\n'));
  } else {
    res.json(pack);
  }
}
