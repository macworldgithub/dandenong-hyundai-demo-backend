import mongoose from 'mongoose';

const invoiceLineSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    unitPriceCents: { type: Number, required: true },
    totalCents: { type: Number, required: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    department: { type: String },
  },
  { _id: true }
);

const extractionFieldSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    value: { type: String },
    confidence: { type: Number, min: 0, max: 1 },
  },
  { _id: false }
);

const exceptionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['price_variance', 'quantity_variance', 'duplicate', 'missing_po', 'other'],
      required: true,
    },
    description: { type: String, required: true },
    expectedCents: { type: Number },
    actualCents: { type: Number },
    varianceCents: { type: Number },
    status: {
      type: String,
      enum: ['open', 'resolved', 'waived'],
      default: 'open',
    },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    resolution: { type: String },
  },
  { _id: true }
);

const apInvoiceSchema = new mongoose.Schema(
  {
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    invoiceNumber: { type: String, required: true },
    invoiceDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    lines: [invoiceLineSchema],
    subtotalCents: { type: Number, required: true },
    gstCents: { type: Number, required: true },
    grossCents: { type: Number, required: true },
    status: {
      type: String,
      enum: ['captured', 'coded', 'matched', 'exception', 'approved', 'paid'],
      default: 'captured',
    },
    extraction: {
      confidence: { type: Number, min: 0, max: 1 },
      fields: [extractionFieldSchema],
    },
    poId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
    vin: { type: String },
    exceptions: [exceptionSchema],
    journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
    paidInRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentRun' },
    approvedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    fileName: { type: String },
    filePath: { type: String, select: false },
    extractionReviewed: { type: Boolean, default: true },
    estimatedFields: [String],
    isIllustrative: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Block duplicate supplier invoice numbers
apInvoiceSchema.index({ supplierId: 1, invoiceNumber: 1 }, { unique: true });
apInvoiceSchema.index({ status: 1 });
apInvoiceSchema.index({ dueDate: 1 });

export default mongoose.model('ApInvoice', apInvoiceSchema);
