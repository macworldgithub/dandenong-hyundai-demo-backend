import mongoose from 'mongoose';

const outstandingItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    amountCents: { type: Number, required: true },
    date: { type: Date },
    type: { type: String }, // 'unpresented_cheque', 'unrecorded_deposit', etc.
  },
  { _id: true }
);

const reconciliationPackSchema = new mongoose.Schema(
  {
    bankAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount', required: true },
    periodId: { type: mongoose.Schema.Types.ObjectId, ref: 'Period', required: true },
    bookBalanceCents: { type: Number, required: true },
    statementBalanceCents: { type: Number, required: true },
    outstandingItems: [outstandingItemSchema],
    differenceCents: { type: Number, required: true }, // must be 0 when reconciled
    generatedAt: { type: Date, default: Date.now },
    isIllustrative: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('ReconciliationPack', reconciliationPackSchema);
