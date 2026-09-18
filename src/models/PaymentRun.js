import mongoose from 'mongoose';

const paymentRunSchema = new mongoose.Schema(
  {
    periodId: { type: mongoose.Schema.Types.ObjectId, ref: 'Period', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    invoiceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ApInvoice' }],
    totalCents: { type: Number, required: true },
    status: {
      type: String,
      enum: ['draft', 'approved', 'paid'],
      default: 'draft',
    },
    approvedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    bankAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount' },
    requiredApprovals: { type: Number, default: 1 },
    abaFileRef: { type: String },
    journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
    isIllustrative: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('PaymentRun', paymentRunSchema);
