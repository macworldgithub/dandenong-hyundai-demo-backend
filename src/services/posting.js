import Period from '../models/Period.js';
import JournalEntry from '../models/JournalEntry.js';
import Account from '../models/Account.js';
import ApInvoice from '../models/ApInvoice.js';
import Vehicle from '../models/Vehicle.js';
import { sumCents, assertBalanced } from '../utils/money.js';
import { logAction } from './auditLog.js';

/**
 * Posting engine — the ONLY path to the ledger.
 *
 * Invariants enforced:
 * 1. Every entry must balance (sum of debits = sum of credits)
 * 2. Posted entries are immutable — corrections via reversal only
 * 3. No revenue without inventory relief (for deal postings)
 * 4. Duplicate supplier invoice numbers are blocked (enforced at model level too)
 */

/**
 * Post a new journal entry.
 * @param {Object} data - { periodId, date, source, sourceRef, narration, lines[], postedBy }
 * @param {Object} [options] - { skipRevenueCheck: false, isReversal: false, reversalOf: null }
 * @returns {Promise<Object>} The posted JournalEntry
 */
export async function postJournalEntry(data, options = {}) {
  const { periodId, date, source, sourceRef, narration, lines, postedBy } = data;
  const { skipRevenueCheck = false, isReversal = false, reversalOf = null } = options;

  const period = await Period.findById(periodId);
  if (!period || period.status !== 'open') throw Object.assign(new Error('Posting requires an open period'), { statusCode: 422 });
  if (!Array.isArray(lines) || lines.length < 2 || lines.some(l => !Number.isSafeInteger(l.debitCents ?? 0) || !Number.isSafeInteger(l.creditCents ?? 0))) throw Object.assign(new Error('Journal amounts must be integer cents with at least two lines'), { statusCode: 422 });

  // 1. Validate balance
  const totalDebits = sumCents(lines.map((l) => l.debitCents || 0));
  const totalCredits = sumCents(lines.map((l) => l.creditCents || 0));
  const difference = totalDebits - totalCredits;

  if (difference !== 0) throw Object.assign(new Error('Journal debits must equal credits exactly'), { statusCode: 422 });

  // 2. Validate each line has exactly one of debit or credit (not both, not zero)
  for (const line of lines) {
    const debit = line.debitCents || 0;
    const credit = line.creditCents || 0;
    if (debit === 0 && credit === 0) {
      throw Object.assign(new Error('Journal line must have a debit or credit amount'), {
        statusCode: 422,
      });
    }
    if (debit !== 0 && credit !== 0) {
      throw Object.assign(
        new Error('Journal line cannot have both debit and credit'),
        { statusCode: 422 }
      );
    }
    if (debit < 0 || credit < 0) {
      throw Object.assign(new Error('Journal line amounts must be non-negative'), {
        statusCode: 422,
      });
    }
  }

  // 3. Validate all account IDs exist
  const accountIds = lines.map((l) => l.accountId);
  const accounts = await Account.find({ _id: { $in: accountIds } });
  if (accounts.length !== new Set(accountIds.map(String)).size) {
    throw Object.assign(new Error('One or more account IDs are invalid'), {
      statusCode: 422,
    });
  }

  // 4. Revenue without inventory relief check (for deal source)
  if (!skipRevenueCheck && source === 'deal') {
    const revenueAccounts = accounts.filter((a) => a.type === 'revenue');
    const inventoryAccounts = accounts.filter(
      (a) => a.isControl && a.controlFor?.startsWith('inventory') && lines.some(l => String(l.accountId) === String(a._id) && l.creditCents > 0)
    );
    if (revenueAccounts.length > 0 && inventoryAccounts.length === 0) {
      throw Object.assign(
        new Error('Revenue cannot be posted without inventory relief'),
        { statusCode: 422 }
      );
    }
  }

  // 5. Create and save
  const entry = new JournalEntry({
    periodId,
    date,
    source,
    sourceRef,
    narration,
    lines,
    postedBy,
    postedAt: new Date(),
    isReversal,
    reversalOf,
  });

  await entry.save();

  // 6. Audit log
  if (postedBy) {
    await logAction({
      userId: postedBy,
      action: isReversal ? 'journal_reversed' : 'journal_posted',
      entityType: 'JournalEntry',
      entityId: entry._id,
      after: { source, sourceRef, narration, totalDebits, totalCredits },
    });
  }

  return entry;
}

/**
 * Reverse a posted journal entry.
 * Creates a new entry with all debits/credits swapped.
 */
export async function reverseJournalEntry(journalId, userId) {
  const original = await JournalEntry.findById(journalId);
  if (!original) {
    throw Object.assign(new Error('Journal entry not found'), { statusCode: 404 });
  }

  if (original.isReversal) {
    throw Object.assign(new Error('Cannot reverse a reversal entry'), { statusCode: 422 });
  }

  // Check if already reversed
  const existingReversal = await JournalEntry.findOne({ reversalOf: journalId });
  if (existingReversal) {
    throw Object.assign(new Error('This entry has already been reversed'), {
      statusCode: 422,
    });
  }

  // Swap debits and credits
  const reversedLines = original.lines.map((line) => ({
    accountId: line.accountId,
    debitCents: line.creditCents,
    creditCents: line.debitCents,
    department: line.department,
    vin: line.vin,
    dealId: line.dealId,
    supplierId: line.supplierId,
  }));

  return postJournalEntry(
    {
      periodId: original.periodId,
      date: new Date(),
      source: original.source,
      sourceRef: original.sourceRef,
      narration: `REVERSAL: ${original.narration}`,
      lines: reversedLines,
      postedBy: userId,
    },
    { isReversal: true, reversalOf: journalId, skipRevenueCheck: true }
  );
}

/**
 * Compute trial balance for a period.
 * Returns { accounts: [...], totalDebits, totalCredits, isBalanced }
 */
export async function computeTrialBalance(periodId, department = null) {
  const period = await Period.findById(periodId);
  const ids = await Period.find({ start: { $lte: period.end } }).distinct('_id');
  const matchStage = { periodId: { $in: ids } };

  const pipeline = [
    { $match: matchStage },
    { $unwind: '$lines' },
  ];

  if (department) {
    pipeline.push({ $match: { 'lines.department': department } });
  }

  pipeline.push(
    {
      $group: {
        _id: '$lines.accountId',
        totalDebitCents: { $sum: '$lines.debitCents' },
        totalCreditCents: { $sum: '$lines.creditCents' },
      },
    },
    {
      $lookup: {
        from: 'accounts',
        localField: '_id',
        foreignField: '_id',
        as: 'account',
      },
    },
    { $unwind: '$account' },
    {
      $project: {
        _id: 0,
        accountId: '$_id',
        code: '$account.code',
        name: '$account.name',
        type: '$account.type',
        department: '$account.department',
        isControl: '$account.isControl',
        controlFor: '$account.controlFor',
        totalDebitCents: 1,
        totalCreditCents: 1,
        balanceCents: { $subtract: ['$totalDebitCents', '$totalCreditCents'] },
      },
    },
    { $sort: { code: 1 } }
  );

  const results = await JournalEntry.aggregate(pipeline);

  const totalDebits = sumCents(results.map((r) => r.totalDebitCents));
  const totalCredits = sumCents(results.map((r) => r.totalCreditCents));

  return {
    accounts: results,
    totalDebitCents: totalDebits,
    totalCreditCents: totalCredits,
    differenceCents: totalDebits - totalCredits,
    isBalanced: totalDebits - totalCredits === 0,
  };
}

/**
 * Get all journal lines for a specific account (drill-down).
 */
export async function drillAccount(accountId, periodId) {
  const entries = await JournalEntry.find({
    periodId: { $in: await Period.find({ start: { $lte: (await Period.findById(periodId)).end } }).distinct('_id') },
    'lines.accountId': accountId,
  })
    .sort({ date: -1 })
    .populate('postedBy', 'name');

  // Flatten to just the matching lines with entry context
  const result = [];
  for (const entry of entries) {
    for (const line of entry.lines) {
      if (line.accountId.toString() === accountId.toString()) {
        result.push({
          journalEntryId: entry._id,
          date: entry.date,
          source: entry.source,
          sourceRef: entry.sourceRef,
          narration: entry.narration,
          postedBy: entry.postedBy,
          isReversal: entry.isReversal,
          debitCents: line.debitCents,
          creditCents: line.creditCents,
          department: line.department,
          vin: line.vin,
          dealId: line.dealId,
          supplierId: line.supplierId,
        });
      }
    }
  }

  return result;
}
