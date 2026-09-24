import env from '../config/env.js';
import { resolvePeriod } from '../services/period.js';
import { buildGlDemo } from '../services/glDemo.js';

export default async function glDemo(req, res, next) {
  if (!env.GL_DEMO_MODE) return next();
  if (req.method !== 'GET') return res.status(409).json({ error: 'General Ledger demo data is read-only. Disable GL_DEMO_MODE to post real entries.' });
  const period = await resolvePeriod(req.query.periodId);
  const { accounts, journals, trialBalance } = buildGlDemo(period);
  res.set('X-Data-Source', 'demo');
  if (req.path === '/accounts') return res.json(accounts.filter(a =>
    (!req.query.type || a.type === req.query.type) &&
    (!req.query.department || a.department === req.query.department) &&
    (req.query.isControl === undefined || String(a.isControl) === req.query.isControl)));
  if (req.path === '/trial-balance') {
    const rows = trialBalance.accounts.filter(a => !req.query.department || a.department === req.query.department);
    const debit = rows.reduce((s, a) => s + a.netDebitCents, 0);
    const credit = rows.reduce((s, a) => s + a.netCreditCents, 0);
    return res.json({ ...trialBalance, accounts: rows, totalDebitCents: debit, totalCreditCents: credit, differenceCents: debit-credit, isBalanced: debit === credit });
  }
  if (req.path === '/journals') {
    const filtered = journals.filter(j => (!req.query.source || j.source === req.query.source) &&
      (!req.query.from || j.date >= new Date(req.query.from).toISOString()) &&
      (!req.query.to || j.date <= new Date(req.query.to).toISOString()) &&
      (!req.query.q || `${j.narration} ${j.sourceRef}`.toLowerCase().includes(String(req.query.q).toLowerCase())));
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 50));
    return res.json({ journals: filtered.slice((page-1)*limit, page*limit), page, limit, total: filtered.length, totalPages: Math.ceil(filtered.length/limit) });
  }
  const drill = req.path.match(/^\/accounts\/([^/]+)\/drill$/);
  if (drill) {
    const account = accounts.find(a => a._id === drill[1]);
    if (!account) return res.status(404).json({ error: 'Demo account not found' });
    const row = trialBalance.accounts.find(a => a.accountId === account._id);
    return res.json({ account, entries: journals.filter(j => j.lines.some(l => l.accountId === account._id)), totalDebitCents: row.totalDebitCents, totalCreditCents: row.totalCreditCents, netCents: row.balanceCents });
  }
  if (req.path.startsWith('/journals/')) {
    const journal = journals.find(j => j._id === req.path.split('/')[2]);
    return journal ? res.json(journal) : res.status(404).json({ error: 'Demo journal not found' });
  }
  if (req.path === '/control-recs') return res.json([]);
  if (req.path === '/evidence-pack') return res.json({ dataSource: 'demo', generatedAt: new Date().toISOString(), dealership: 'Demonstration ledger', period: period.code, trialBalance, controlRecs: [], bankRecPacks: [], apAgeing: null });
  return res.status(404).json({ error: 'Demo endpoint not found' });
}
