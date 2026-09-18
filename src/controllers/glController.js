import { requestPeriod } from '../services/period.js';
import Account from '../models/Account.js';
import JournalEntry from '../models/JournalEntry.js';
import Entity from '../models/Entity.js';
import { computeTrialBalance, drillAccount, postJournalEntry, reverseJournalEntry } from '../services/posting.js';
import { buildControlRec, buildAllControlRecs, completeControlRec, generateEvidencePack } from '../services/reconciliation.js';
import { logAction } from '../services/auditLog.js';

/**
 * Get the trial balance for the active period.
 */
export async function getTrialBalance(req, res) {
  const entity = await Entity.findOne();
  if (!entity) return res.status(404).json({ error: 'No entity' });

  const { department } = req.query;
  const tb = await computeTrialBalance(await requestPeriod(req), department || null);
  res.json(tb);
}

/**
 * Get the chart of accounts.
 */
export async function getAccounts(req, res) {
  const { type, department, isControl } = req.query;
  const filter = {};

  if (type) filter.type = type;
  if (department) filter.department = department;
  if (isControl !== undefined) filter.isControl = isControl === 'true';

  const accounts = await Account.find(filter).sort({ code: 1 });
  res.json(accounts);
}

/**
 * Drill into a specific account — returns all journal lines for that account.
 */
export async function drillAccountEndpoint(req, res) {
  const entity = await Entity.findOne();
  if (!entity) return res.status(404).json({ error: 'No entity' });

  const lines = await drillAccount(req.params.id, await requestPeriod(req));
  res.json({ accountId: req.params.id, lines });
}

/**
 * List journal entries with filtering.
 */
export async function listJournals(req, res) {
  const { source, from, to, q, page = 1, limit = 50 } = req.query;
  const entity = await Entity.findOne();
  const filter = { periodId: await requestPeriod(req) };

  if (source) filter.source = source;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }
  if (q) {
    filter.$or = [
      { narration: { $regex: q, $options: 'i' } },
      { sourceRef: { $regex: q, $options: 'i' } },
    ];
  }

  const total = await JournalEntry.countDocuments(filter);
  const journals = await JournalEntry.find(filter)
    .sort({ postedAt: -1 })
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit))
    .populate('postedBy', 'name');

  res.json({
    journals,
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / parseInt(limit)),
  });
}

/**
 * Get a single journal entry.
 */
export async function getJournal(req, res) {
  const journal = await JournalEntry.findById(req.params.id)
    .populate('postedBy', 'name')
    .populate('lines.accountId', 'code name type');

  if (!journal) return res.status(404).json({ error: 'Journal entry not found' });
  res.json(journal);
}

/**
 * Post a manual journal entry.
 */
export async function postManualJournal(req, res) {
  const { narration, lines } = req.body;

  if (!narration || !lines || !Array.isArray(lines) || lines.length < 2) {
    return res.status(422).json({ error: 'narration and at least 2 lines are required' });
  }

  const entity = await Entity.findOne();
  const entry = await postJournalEntry({
    periodId: await requestPeriod(req),
    date: req.body.date ? new Date(req.body.date) : new Date(),
    source: 'manual',
    sourceRef: `MAN-${Date.now()}`,
    narration,
    lines,
    postedBy: req.user._id,
  });

  res.status(201).json(entry);
}

/**
 * Reverse a journal entry.
 */
export async function reverseJournal(req, res) {
  const reversal = await reverseJournalEntry(req.params.id, req.user._id);
  res.json(reversal);
}

/**
 * Get control recs for the active period.
 */
export async function getControlRecs(req, res) {
  const entity = await Entity.findOne();
  if (!entity) return res.status(404).json({ error: 'No entity' });

  const recs = await buildAllControlRecs(await requestPeriod(req));
  res.json(recs);
}

/**
 * Build a single control rec.
 */
export async function buildSingleControlRec(req, res) {
  const entity = await Entity.findOne();
  const { type } = req.params;

  const rec = await buildControlRec(type, await requestPeriod(req));
  res.json(rec);
}

/**
 * Complete a control rec.
 */
export async function completeControlRecEndpoint(req, res) {
  const entity = await Entity.findOne();
  const { type } = req.params;

  const rec = await completeControlRec(type, await requestPeriod(req), req.user._id);

  await logAction({
    userId: req.user._id,
    action: 'control_rec_completed',
    entityType: 'ControlRec',
    entityId: rec._id,
    after: { type, differenceCents: rec.differenceCents },
  });

  res.json(rec);
}

/**
 * Export the evidence pack for the active period.
 */
export async function exportEvidencePack(req, res) {
  const entity = await Entity.findOne();
  if (!entity) return res.status(404).json({ error: 'No entity' });

  const pack = await generateEvidencePack(await requestPeriod(req));

  const format = req.query.format || 'json';
  if (format === 'json') {
    res.json(pack);
  } else {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="evidence-pack-${await requestPeriod(req)}.json"`);
    res.send(JSON.stringify(pack, null, 2));
  }
}
