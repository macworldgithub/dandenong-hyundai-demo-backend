import BankAccount from '../models/BankAccount.js';
import BankTransaction from '../models/BankTransaction.js';
import BankStatement from '../models/BankStatement.js';
import ReconciliationPack from '../models/ReconciliationPack.js';
import ControlRec from '../models/ControlRec.js';
import Account from '../models/Account.js';
import JournalEntry from '../models/JournalEntry.js';
import ApInvoice from '../models/ApInvoice.js';
import Vehicle from '../models/Vehicle.js';
import FloorplanDraw from '../models/FloorplanDraw.js';
import Period from '../models/Period.js';
import Entity from '../models/Entity.js';
import PaymentRun from '../models/PaymentRun.js';
import { computeTrialBalance } from './posting.js';
import { sumCents } from '../utils/money.js';

async function periodIds(periodId) {
  const period = await Period.findById(periodId);
  return Period.find({ start: { $lte: period.end } }).distinct('_id');
}
async function balance(accountId, periodId) {
  const rows = await JournalEntry.aggregate([
    { $match: { periodId: { $in: await periodIds(periodId) } } }, { $unwind: '$lines' },
    { $match: { 'lines.accountId': accountId } },
    { $group: { _id: null, value: { $sum: { $subtract: ['$lines.debitCents','$lines.creditCents'] } } } },
  ]);
  return rows[0]?.value || 0;
}

export async function buildRecPack(bankAccountId, periodId) {
  const bank = await BankAccount.findById(bankAccountId);
  if (!bank) throw Object.assign(new Error('Bank account not found'), { statusCode: 404 });
  const statement = await BankStatement.findOne({ bankAccountId, periodId }).sort({ importedAt: -1 });
  if (!statement) throw Object.assign(new Error('Import a statement for the selected period before reconciling'), { statusCode: 422 });
  const statements = await BankStatement.find({ bankAccountId, periodId }).distinct('_id');
  const txns = await BankTransaction.find({ statementId: { $in: statements }, status: { $in: ['unmatched','parked','suggested'] } });
  const outstandingItems = txns.map(t => ({ description: t.description, amountCents: t.amountCents, date: t.date, type: t.status === 'parked' ? 'parked_item' : 'unrecorded_statement_item' }));
  const payments = await PaymentRun.find({ periodId, bankAccountId, status: 'paid', journalEntryId: { $ne: null } });
  for (const run of payments) {
    if (!await BankTransaction.exists({ journalEntryId: run.journalEntryId, status: 'matched' })) outstandingItems.push({ description: `Unpresented payment ${run.abaFileRef}`, amountCents: run.totalCents, date: run.updatedAt, type: 'unpresented_payment' });
  }
  const bookBalanceCents = await balance(bank.glAccountId, periodId);
  const statementBalanceCents = statement.closingBalanceCents;
  return ReconciliationPack.create({ bankAccountId, periodId, bookBalanceCents, statementBalanceCents, outstandingItems,
    differenceCents: bookBalanceCents - statementBalanceCents + sumCents(outstandingItems.map(i => i.amountCents)), generatedAt: new Date() });
}

export async function buildControlRec(type, periodId) {
  if (!ControlRec.schema.path('type').enumValues.includes(type)) throw Object.assign(new Error('Unknown reconciliation type'), { statusCode: 422 });
  const account = await Account.findOne({ isControl: true, controlFor: type });
  let glBalanceCents = account ? await balance(account._id, periodId) * (account.type === 'asset' ? 1 : -1) : 0;
  let subLedgerBalanceCents = 0;
  let evidenceAvailable = !!account;
  const reconcilingItems = [];
  const prior = await ControlRec.findOne({ type, periodId });
  if (type.startsWith('cash_')) {
    const bank = await BankAccount.findOne({ type: type === 'cash_operating' ? 'operating' : 'trust' });
    if (bank && await BankStatement.exists({ bankAccountId: bank._id, periodId })) {
      const pack = await buildRecPack(bank._id, periodId);
      glBalanceCents = pack.bookBalanceCents;
      subLedgerBalanceCents = pack.statementBalanceCents - sumCents(pack.outstandingItems.map(i => i.amountCents));
      reconcilingItems.push(...pack.outstandingItems.map(i => ({ description: i.description, amountCents: i.amountCents })));
    } else evidenceAvailable = false;
  } else if (type === 'ap') {
    const invoices = await ApInvoice.find({ journalEntryId: { $ne: null }, status: { $ne: 'paid' } });
    subLedgerBalanceCents = sumCents(invoices.map(i => i.grossCents));
  } else if (type.startsWith('inventory_')) {
    const vehicles = await Vehicle.find({ class: type.slice(10), status: 'in_stock' });
    subLedgerBalanceCents = sumCents(vehicles.map(v => v.totalCostCents));
  } else if (type === 'floorplan') {
    const draws = await FloorplanDraw.find({ settledDate: null });
    subLedgerBalanceCents = sumCents(draws.map(d => d.drawnAmountCents + d.interestAccruedCents));
  } else {
    // GST and deposits require an independently supplied source schedule.
    evidenceAvailable = !!prior?.sourceFileName;
    subLedgerBalanceCents = prior?.sourceBalanceCents ?? 0;
  }
  // Current stock/AP snapshots cannot certify historical periods.
  const entity = await Entity.findOne();
  if (!type.startsWith('cash_') && !['gst','customer_deposits'].includes(type) && String(entity.activePeriod) !== String(periodId)) evidenceAvailable = false;
  const differenceCents = glBalanceCents - subLedgerBalanceCents;
  const unchanged = prior && prior.glBalanceCents === glBalanceCents && prior.subLedgerBalanceCents === subLedgerBalanceCents;
  return ControlRec.findOneAndUpdate({ type, periodId }, {
    glBalanceCents, subLedgerBalanceCents, differenceCents, reconcilingItems, evidenceAvailable,
    status: unchanged && prior.completedBy && evidenceAvailable && differenceCents === 0 ? 'completed' : 'in_progress',
    ...(!unchanged ? { completedBy: null, completedAt: null } : {}),
  }, { new: true, upsert: true, runValidators: true });
}

export async function buildAllControlRecs(periodId) {
  const types = ControlRec.schema.path('type').enumValues;
  const results = [];
  for (const type of types) {
    if (type === 'cash_trust' && !await BankAccount.exists({ type: 'trust' })) continue;
    results.push(await buildControlRec(type, periodId));
  }
  return results;
}

export async function completeControlRec(type, periodId, userId) {
  const rec = await buildControlRec(type, periodId);
  if (rec.differenceCents !== 0 || !rec.evidenceAvailable) throw Object.assign(new Error('Sign-off requires independent evidence and zero unexplained difference'), { statusCode: 422 });
  rec.status = 'completed'; rec.completedBy = userId; rec.completedAt = new Date();
  await rec.save();
  return rec;
}

export async function generateEvidencePack(periodId) {
  await buildAllControlRecs(periodId);
  const controlRecs = await ControlRec.find({ periodId }).populate('completedBy','name');
  const bankReconciliations = [];
  for (const bank of await BankAccount.find()) {
    if (await BankStatement.exists({ bankAccountId: bank._id, periodId })) bankReconciliations.push(await buildRecPack(bank._id, periodId));
  }
  return {
    periodId, period: (await Period.findById(periodId)).code, dealership: (await Entity.findOne()).name,
    generatedAt: new Date(), trialBalance: await computeTrialBalance(periodId),
    controlReconciliations: controlRecs, bankReconciliations,
    apAgeing: await ApInvoice.find({ journalEntryId: { $ne: null }, status: { $ne: 'paid' } }).populate('supplierId','name'),
    inventory: await Vehicle.find({ status: 'in_stock' }), floorplan: await FloorplanDraw.find({ settledDate: null }),
    journals: await JournalEntry.find({ periodId }),
    summary: { totalRecs: controlRecs.length, completed: controlRecs.filter(r => r.status === 'completed').length, withDifference: controlRecs.filter(r => r.differenceCents !== 0).length },
  };
}
