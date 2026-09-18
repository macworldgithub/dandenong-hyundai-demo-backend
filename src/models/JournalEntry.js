import mongoose from 'mongoose';

const journalLineSchema = new mongoose.Schema(
  {
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    debitCents: { type: Number, default: 0 },
    creditCents: { type: Number, default: 0 },
    department: { type: String },
    vin: { type: String },
    dealId: { type: mongoose.Schema.Types.ObjectId, ref: 'DealJacket' },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  },
  { _id: true }
);

const journalEntrySchema = new mongoose.Schema(
  {
    periodId: { type: mongoose.Schema.Types.ObjectId, ref: 'Period', required: true },
    date: { type: Date, required: true },
    source: {
      type: String,
      enum: ['bank', 'ap', 'deal', 'manual', 'floorplan'],
      required: true,
    },
    sourceRef: { type: String }, // e.g. invoice number, statement ref
    narration: { type: String, required: true },
    isReversal: { type: Boolean, default: false },
    reversalOf: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    postedAt: { type: Date, default: Date.now },
    lines: { type: [journalLineSchema], required: true, validate: v => v.length >= 2 },
    isIllustrative: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Index for fast lookups
journalEntrySchema.index({ periodId: 1, source: 1 });
journalEntrySchema.index({ 'lines.accountId': 1 });
journalEntrySchema.index({ 'lines.vin': 1 });
journalEntrySchema.index({ 'lines.dealId': 1 });
journalEntrySchema.index({ 'lines.supplierId': 1 });

export default mongoose.model('JournalEntry', journalEntrySchema);
