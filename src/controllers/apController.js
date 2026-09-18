import ApInvoice from '../models/ApInvoice.js';
import Supplier from '../models/Supplier.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import PaymentRun from '../models/PaymentRun.js';
import Entity from '../models/Entity.js';
import Account from '../models/Account.js';
import { extractInvoice } from '../services/extraction.js';
import BankAccount from '../models/BankAccount.js';
import Vehicle from '../models/Vehicle.js';
import JournalEntry from '../models/JournalEntry.js';
import env from '../config/env.js';
import { resolvePeriod, requestPeriod } from '../services/period.js';
import path from 'node:path';
import { z } from 'zod';
import { postJournalEntry } from '../services/posting.js';
import { logAction } from '../services/auditLog.js';
import { toCents, sumCents } from '../utils/money.js';

/**
 * Upload a new invoice (PDF) and run simulated extraction.
 */
export async function uploadInvoice(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const extraction = await extractInvoice(req.file.path);
  const d = extraction.extractedData;
  const period = await resolvePeriod(req.body.periodId);
  const suppliers = await Supplier.find({ isActive: true });
  const supplier = suppliers.find(s => (d.abn && s.abn?.replace(/\s/g,'') === d.abn.replace(/\s/g,'')) || extraction.text.toLowerCase().includes(s.name.toLowerCase()));
  const history = supplier && await ApInvoice.findOne({ supplierId: supplier._id, journalEntryId: { $ne: null } }).sort({ invoiceDate: -1 });
  const accountId = history?.lines[0]?.accountId || supplier?.defaultAccountId;
  const invoice = await ApInvoice.create({
    supplierId: supplier?._id,
    invoiceNumber: d.invoiceNumber || `REVIEW-${Date.now()}`,
    invoiceDate: d.invoiceDate || period.start, dueDate: d.dueDate || period.end,
    subtotalCents: d.subtotalCents ?? 0, gstCents: d.gstCents ?? 0, grossCents: d.grossCents ?? 0,
    lines: [{ description: 'Invoice subtotal ? verify against source PDF', quantity: 1, unitPriceCents: d.subtotalCents ?? 0, totalCents: d.subtotalCents ?? 0, accountId }],
    extraction: { confidence: extraction.confidence, fields: extraction.fields },
    fileName: req.file.originalname, filePath: path.resolve(req.file.path),
    extractionReviewed: false, estimatedFields: [...extraction.estimatedFields, ...(!supplier ? ['supplierId'] : [])],
    status: 'captured',
  });
  await logAction({ userId: req.user._id, action: 'invoice_uploaded', entityType: 'ApInvoice', entityId: invoice._id, after: { fileName: invoice.fileName, estimatedFields: invoice.estimatedFields } });
  res.status(201).json({ invoice, extraction: { fields: extraction.fields, confidence: extraction.confidence } });
}

/**
 * List invoices with filtering and pagination.
 */
export async function listInvoices(req, res) {
  const { status, supplierId, from, to, q, page = 1, limit = 50 } = req.query;
  const filter = {};

  if (status) filter.status = status;
  if (supplierId) filter.supplierId = supplierId;
  if (from || to) {
    filter.invoiceDate = {};
    if (from) filter.invoiceDate.$gte = new Date(from);
    if (to) filter.invoiceDate.$lte = new Date(to);
  }
  if (q) {
    filter.$or = [
      { invoiceNumber: { $regex: q, $options: 'i' } },
      { 'lines.description': { $regex: q, $options: 'i' } },
    ];
  }

  const total = await ApInvoice.countDocuments(filter);
  const invoices = await ApInvoice.find(filter)
    .sort({ invoiceDate: -1 })
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit))
    .populate('supplierId', 'name category');

  res.json({
    invoices,
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    totalPages: Math.ceil(total / parseInt(limit)),
  });
}

/**
 * Get a single invoice by ID.
 */
export async function getInvoice(req, res) {
  const invoice = await ApInvoice.findById(req.params.id)
    .populate('supplierId', 'name abn category paymentTerms')
    .populate('poId');

  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  res.json(invoice);
}

/**
 * Update extraction fields (manual correction after OCR).
 */
export async function updateExtraction(req, res) {
  const invoice = await ApInvoice.findById(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  if (invoice.journalEntryId || ['approved','paid'].includes(invoice.status)) return res.status(422).json({ error: 'Posted invoice fields are immutable. Reverse the posting before correcting it.' });
  const fields = z.object({
    supplierId: z.string().regex(/^[a-f\d]{24}$/i).optional(), invoiceNumber: z.string().trim().min(1).optional(),
    invoiceDate: z.coerce.date().optional(), dueDate: z.coerce.date().optional(),
    subtotalCents: z.number().int().nonnegative().optional(), gstCents: z.number().int().nonnegative().optional(),
    vin: z.string().optional(), lines: z.array(z.object({ description: z.string().min(1), quantity: z.number().positive(), unitPriceCents: z.number().int().nonnegative(), totalCents: z.number().int().nonnegative(), accountId: z.string().optional(), department: z.string().optional() })).min(1).optional(),
  }).parse(req.body);
  if (fields.supplierId && !await Supplier.exists({ _id: fields.supplierId, isActive: true })) return res.status(422).json({ error: 'Supplier not found or inactive' });
  const before = invoice.toObject();
  Object.assign(invoice, fields);
  if (fields.subtotalCents !== undefined && !fields.lines && invoice.lines.length === 1) {
    invoice.lines[0].totalCents = fields.subtotalCents;
    invoice.lines[0].unitPriceCents = fields.subtotalCents / invoice.lines[0].quantity;
  }
  invoice.grossCents = invoice.subtotalCents + invoice.gstCents;
  if (sumCents(invoice.lines.map(l => l.totalCents)) !== invoice.subtotalCents) return res.status(422).json({ error: 'Invoice lines must equal subtotal; gross must equal subtotal plus GST' });
  invoice.estimatedFields = invoice.estimatedFields.filter(key => !(key in fields) && key !== 'grossCents');
  invoice.extractionReviewed = invoice.estimatedFields.length === 0;
  invoice.approvedBy = [];
  await invoice.save();
  await logAction({ userId: req.user._id, action: 'invoice_corrected', entityType: 'ApInvoice', entityId: invoice._id, before, after: fields });
  res.json(invoice);
}

/**
 * Code an invoice (assign GL accounts and approve for posting).
 */
export async function codeInvoice(req, res) {
  const invoice = await ApInvoice.findById(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  if (invoice.journalEntryId || !['captured','exception','coded','matched'].includes(invoice.status)) return res.status(422).json({ error: 'Posted invoices cannot be recoded' });
  const { accountId, supplierId, vin } = req.body;
  const account = await Account.findOne({ _id: accountId, isActive: true });
  if (!account) return res.status(422).json({ error: 'A valid active account is required' });
  if (supplierId) invoice.supplierId = supplierId;
  if (!invoice.supplierId || !await Supplier.exists({ _id: invoice.supplierId, isActive: true })) return res.status(422).json({ error: 'A valid supplier is required' });
  if (!invoice.extractionReviewed) return res.status(422).json({ error: 'Review and correct all missing source fields before coding' });
  if (vin !== undefined) invoice.vin = vin;
  for (const line of invoice.lines) { line.accountId = account._id; line.department = account.department; }
  invoice.status = invoice.exceptions.some(e => e.status === 'open') ? 'exception' : 'coded';
  invoice.approvedBy = [];
  await invoice.save();
  await logAction({ userId: req.user._id, action: 'invoice_coded', entityType: 'ApInvoice', entityId: invoice._id, after: { accountId, supplierId: invoice.supplierId, vin: invoice.vin } });
  res.json(invoice);
}

/**
 * Three-way match: invoice vs PO vs receiving.
 */
export async function threeWayMatch(req, res) {
  const invoice = await ApInvoice.findById(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  if (invoice.journalEntryId || !['coded','matched','exception'].includes(invoice.status)) return res.status(422).json({ error: 'Only unposted coded invoices can be matched' });
  if (!invoice.supplierId) return res.status(422).json({ error: 'Select a supplier before matching' });
  const filter = { supplierId: invoice.supplierId, status: { $ne: 'cancelled' } };
  if (req.body.poId || invoice.poId) filter._id = req.body.poId || invoice.poId;
  if (invoice.vin) filter.vin = invoice.vin;
  const pos = await PurchaseOrder.find(filter);
  const matchResults = pos.map(po => {
    const poTotalCents = sumCents(po.lines.map(l => l.totalCents));
    const differenceCents = invoice.subtotalCents - poTotalCents;
    const quantityMatches = sumCents(po.lines.map(l => l.quantity)) === sumCents(invoice.lines.map(l => l.quantity));
    const isWithinTolerance = Math.abs(differenceCents) <= Math.round(poTotalCents * .02) && quantityMatches;
    return { poId: po._id, poNumber: po.poNumber, poTotalCents, invoiceTotalCents: invoice.subtotalCents, differenceCents, isWithinTolerance, matchType: po.status === 'received' ? '3-way' : '2-way', status: !quantityMatches ? 'quantity_variance' : isWithinTolerance ? 'exact_match' : 'price_variance' };
  });
  const best = matchResults.find(m => m.isWithinTolerance);
  if (best) { invoice.poId = best.poId; if (!invoice.exceptions.some(e => e.status === 'open')) invoice.status = 'matched'; }
  else if (matchResults.length) {
    const m = matchResults[0];
    invoice.poId = m.poId;
    if (!invoice.exceptions.some(e => e.status === 'open' && e.type === m.status)) invoice.exceptions.push({ type: m.status, description: `Invoice does not agree to ${m.poNumber}`, expectedCents: m.poTotalCents, actualCents: invoice.subtotalCents, varianceCents: m.differenceCents });
    invoice.status = 'exception';
  }
  await invoice.save();
  res.json({ invoice, matchResults });
}

/**
 * Resolve an exception on an invoice.
 */
export async function resolveException(req, res) {
  const invoice = await ApInvoice.findById(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  if (invoice.status === 'paid') return res.status(422).json({ error: 'Paid invoices cannot be changed' });
  const exception = req.body.exceptionId ? invoice.exceptions.id(req.body.exceptionId) : invoice.exceptions.find(e => e.status === 'open');
  if (!exception || exception.status !== 'open') return res.status(422).json({ error: 'Open exception not found' });
  const notes = z.string().trim().min(1).parse(req.body.notes);
  exception.status = req.body.resolution === 'waived' ? 'waived' : 'resolved';
  exception.resolution = notes; exception.resolvedBy = req.user._id; exception.resolvedAt = new Date();
  invoice.status = invoice.exceptions.some(e => e.status === 'open') ? 'exception' : 'coded';
  await invoice.save();
  await logAction({ userId: req.user._id, action: 'exception_resolved', entityType: 'ApInvoice', entityId: invoice._id, after: { exceptionId: exception._id, resolution: exception.status, notes } });
  res.json(invoice);
}

/**
 * Approve an invoice and post the journal entry.
 */
export async function approveInvoice(req, res) {
  const invoice = await ApInvoice.findById(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  if (!['coded','matched'].includes(invoice.status) || invoice.exceptions.some(e => e.status === 'open')) return res.status(422).json({ error: 'Code the invoice and resolve its exceptions before approval' });
  if (!invoice.supplierId || !invoice.extractionReviewed || !invoice.lines.length || invoice.lines.some(l => !l.accountId)) return res.status(422).json({ error: 'Supplier, reviewed extraction and coded lines are required' });
  if (sumCents(invoice.lines.map(l => l.totalCents)) !== invoice.subtotalCents || invoice.grossCents !== invoice.subtotalCents + invoice.gstCents || invoice.grossCents <= 0) return res.status(422).json({ error: 'Gross must equal invoice lines plus GST, and be positive' });
  if (invoice.approvedBy.some(id => id.equals(req.user._id))) return res.status(409).json({ error: 'This user has already approved the invoice' });
  invoice.approvedBy.push(req.user._id);
  const required = invoice.grossCents > env.DUAL_APPROVAL_THRESHOLD_CENTS ? 2 : 1;
  if (invoice.approvedBy.length < required) { await invoice.save(); return res.json({ invoice, pendingApproval: true, requiredApprovals: required }); }
  // Legacy imported invoices already have a posting; never post them twice.
  if (!invoice.journalEntryId) {
    const ap = await Account.findOne({ controlFor: 'ap', isControl: true });
    const gst = await Account.findOne({ code: '1150' }) || await Account.findOne({ controlFor: 'gst' });
    if (!ap || (invoice.gstCents && !gst)) return res.status(422).json({ error: 'AP/GST accounts are not configured' });
    const lines = invoice.lines.map(l => ({ accountId: l.accountId, debitCents: l.totalCents, creditCents: 0, department: l.department, vin: invoice.vin, supplierId: invoice.supplierId }));
    if (invoice.gstCents) lines.push({ accountId: gst._id, debitCents: invoice.gstCents, creditCents: 0 });
    lines.push({ accountId: ap._id, debitCents: 0, creditCents: invoice.grossCents, supplierId: invoice.supplierId });
    const inventoryLines = [];
    for (const line of invoice.lines) {
      const account = await Account.findById(line.accountId);
      if (account.controlFor?.startsWith('inventory_')) inventoryLines.push({ line, account });
    }
    let vehicle;
    if (inventoryLines.length) {
      vehicle = await Vehicle.findOne({ vin: invoice.vin, status: 'in_stock' });
      if (!vehicle || inventoryLines.some(({account}) => account.controlFor !== `inventory_${vehicle.class}`)) return res.status(422).json({ error: 'Inventory coding requires an in-stock VIN and its matching inventory control account' });
      for (const {line} of inventoryLines) vehicle.costLines.push({ type: 'recon', amountCents: line.totalCents, sourceDocRef: invoice.invoiceNumber });
      vehicle.totalCostCents = sumCents(vehicle.costLines.map(l => l.amountCents));
      await vehicle.save();
    }
    const entry = await postJournalEntry({ periodId: await requestPeriod(req), date: invoice.invoiceDate, source: 'ap', sourceRef: invoice.invoiceNumber, narration: `AP Invoice ${invoice.invoiceNumber}`, lines, postedBy: req.user._id });
    invoice.journalEntryId = entry._id;
  }
  invoice.status = 'approved'; await invoice.save();
  await logAction({ userId: req.user._id, action: 'invoice_approved', entityType: 'ApInvoice', entityId: invoice._id, after: { journalEntryId: invoice.journalEntryId } });
  res.json({ invoice });
}

/**
 * Create a payment run.
 */
export async function createPaymentRun(req, res) {
  const invoiceIds = z.array(z.string().regex(/^[a-f\d]{24}$/i)).min(1).parse(req.body.invoiceIds);
  if (new Set(invoiceIds).size !== invoiceIds.length) return res.status(422).json({ error: 'Duplicate invoices in payment run' });
  const invoices = await ApInvoice.find({ _id: { $in: invoiceIds }, status: 'approved', paidInRunId: null });
  if (invoices.length !== invoiceIds.length) return res.status(422).json({ error: 'All invoices must be approved and not reserved in another run' });
  const bank = await BankAccount.findOne(req.body.bankAccountId ? { _id: req.body.bankAccountId, type: 'operating' } : { type: 'operating' });
  if (!bank) return res.status(422).json({ error: 'An operating bank account is required' });
  const totalCents = sumCents(invoices.map(i => i.grossCents));
  const run = await PaymentRun.create({ periodId: await requestPeriod(req), bankAccountId: bank._id, createdBy: req.user._id, invoiceIds, totalCents, requiredApprovals: totalCents > env.DUAL_APPROVAL_THRESHOLD_CENTS ? 2 : 1 });
  await ApInvoice.updateMany({ _id: { $in: invoiceIds } }, { $set: { paidInRunId: run._id } });
  await logAction({ userId: req.user._id, action: 'payment_run_created', entityType: 'PaymentRun', entityId: run._id, after: { totalCents, invoiceIds } });
  res.status(201).json(run);
}

/**
 * Approve and execute a payment run.
 */
export async function approvePaymentRun(req, res) {
  const run = await PaymentRun.findById(req.params.id);
  if (!run) return res.status(404).json({ error: 'Payment run not found' });
  if (run.status !== 'draft') return res.status(422).json({ error: 'Payment run has already been executed' });
  if (run.approvedBy.some(id => id.equals(req.user._id))) return res.status(409).json({ error: 'A different named approver is required' });
  const invoices = await ApInvoice.find({ _id: { $in: run.invoiceIds }, status: 'approved' });
  if (invoices.length !== run.invoiceIds.length) return res.status(409).json({ error: 'A selected invoice is no longer payable' });
  run.approvedBy.push(req.user._id);
  run.requiredApprovals = run.totalCents > env.DUAL_APPROVAL_THRESHOLD_CENTS ? 2 : 1;
  if (run.approvedBy.length >= run.requiredApprovals) {
    const bank = run.bankAccountId ? await BankAccount.findById(run.bankAccountId) : await BankAccount.findOne({ type: 'operating' });
    const ap = await Account.findOne({ controlFor: 'ap' });
    if (!bank || bank.type !== 'operating' || !ap) return res.status(422).json({ error: 'Operating bank and AP control are required' });
    const entry = await postJournalEntry({ periodId: run.periodId, date: (await resolvePeriod(run.periodId)).end, source: 'ap', sourceRef: `PAY-${run._id}`, narration: 'Supplier payment run', postedBy: req.user._id,
      lines: [...invoices.map(i => ({ accountId: ap._id, debitCents: i.grossCents, creditCents: 0, supplierId: i.supplierId })), { accountId: bank.glAccountId, debitCents: 0, creditCents: run.totalCents }] });
    await ApInvoice.updateMany({ _id: { $in: run.invoiceIds } }, { $set: { status: 'paid', paidInRunId: run._id } });
    run.status = 'paid'; run.journalEntryId = entry._id; run.bankAccountId = bank._id; run.abaFileRef = `PAY-${run._id}.csv`;
  }
  await run.save();
  await logAction({ userId: req.user._id, action: 'payment_run_approved', entityType: 'PaymentRun', entityId: run._id, after: { status: run.status, approvals: run.approvedBy.length } });
  res.json(run);
}

/**
 * List payment runs.
 */
export async function listPaymentRuns(req, res) {
  const runs = await PaymentRun.find()
    .sort({ createdAt: -1 })
    .populate('createdBy', 'name');
  res.json(runs);
}

/**
 * AP ageing report.
 */
export async function getAgeing(req, res) {
  const invoices = await ApInvoice.find({
    journalEntryId: { $ne: null }, status: { $ne: 'paid' },
  }).populate('supplierId', 'name');

  const now = (await resolvePeriod(req.query.periodId)).end;
  const buckets = { current: [], days30: [], days60: [], days90: [], over90: [] };

  for (const inv of invoices) {
    const dueDate = new Date(inv.dueDate);
    const daysOverdue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));

    const item = {
      _id: inv._id,
      supplier: inv.supplierId?.name || 'Unknown',
      invoiceNumber: inv.invoiceNumber,
      grossCents: inv.grossCents,
      dueDate: inv.dueDate,
      daysOverdue: Math.max(0, daysOverdue),
    };

    if (daysOverdue <= 0) buckets.current.push(item);
    else if (daysOverdue <= 30) buckets.days30.push(item);
    else if (daysOverdue <= 60) buckets.days60.push(item);
    else if (daysOverdue <= 90) buckets.days90.push(item);
    else buckets.over90.push(item);
  }

  const totals = {
    current: sumCents(buckets.current.map((i) => i.grossCents)),
    days30: sumCents(buckets.days30.map((i) => i.grossCents)),
    days60: sumCents(buckets.days60.map((i) => i.grossCents)),
    days90: sumCents(buckets.days90.map((i) => i.grossCents)),
    over90: sumCents(buckets.over90.map((i) => i.grossCents)),
  };

  res.json({ buckets, totals, grandTotalCents: sumCents(Object.values(totals)) });
}

/**
 * Get suppliers list.
 */
export async function listSuppliers(req, res) {
  const suppliers = await Supplier.find().sort({ name: 1 });
  res.json(suppliers);
}


export async function exportPaymentRun(req, res) {
  const run = await PaymentRun.findById(req.params.id).populate({ path: 'invoiceIds', populate: { path: 'supplierId' } });
  if (!run) return res.status(404).json({ error: 'Payment run not found' });
  const quote = value => '"' + String(value ?? '').replaceAll('"','""') + '"';
  const rows = [['Supplier','BSB','Account number','Account name','Reference','Amount AUD','Status']];
  for (const inv of run.invoiceIds) rows.push([inv.supplierId?.name,inv.supplierId?.bankDetails?.bsb,inv.supplierId?.bankDetails?.accountNumber,inv.supplierId?.bankDetails?.accountName,inv.invoiceNumber,(inv.grossCents/100).toFixed(2),run.status]);
  res.setHeader('Content-Type','text/csv'); res.setHeader('Content-Disposition',`attachment; filename="payment-list-${run._id}.csv"`);
  res.send(rows.map(row => row.map(quote).join(',')).join('\r\n'));
}

export async function getInvoiceDocument(req, res) {
  const invoice = await ApInvoice.findById(req.params.id).select('+filePath');
  if (!invoice?.filePath) return res.status(404).json({ error: 'Source PDF not supplied for this invoice' });
  res.sendFile(invoice.filePath);
}
