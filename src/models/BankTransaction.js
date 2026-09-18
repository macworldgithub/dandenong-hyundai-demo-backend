import mongoose from 'mongoose';

const allocationSchema = new mongoose.Schema(
  {
    amountCents: { type: Number, required: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    dealId: { type: mongoose.Schema.Types.ObjectId, ref: 'DealJacket' },
    vin: { type: String },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'ApInvoice' },
    paymentRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentRun' },
    note: { type: String },
  },
  { _id: true }
);

const bankTransactionSchema = new mongoose.Schema(
  {
    statementId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankStatement', required: true },
    bankAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount', required: true },
    date: { type: Date, required: true },
    description: { type: String, required: true },
    amountCents: { type: Number, required: true }, // positive = credit/deposit, negative = debit/withdrawal
    direction: { type: String, enum: ['debit', 'credit'], required: true },
    status: {
      type: String,
      enum: ['unmatched', 'suggested', 'matched', 'parked', 'split'],
      default: 'unmatched',
    },
    matchConfidence: { type: Number, min: 0, max: 1 },
    parkedReason: String,
    matchedExistingJournal: { type: Boolean, default: false },
    matchType: { type: String }, // e.g. 'ap_invoice', 'deal_deposit', 'financier_settlement'
    allocations: [allocationSchema],
    journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
    isIllustrative: { type: Boolean, default: false },
  },
  { timestamps: true }
);

bankTransactionSchema.index({ statementId: 1 });
bankTransactionSchema.index({ bankAccountId: 1, status: 1 });
bankTransactionSchema.index({ date: 1 });

export default mongoose.model('BankTransaction', bankTransactionSchema);
