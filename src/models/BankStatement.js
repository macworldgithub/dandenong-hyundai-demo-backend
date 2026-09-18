import mongoose from 'mongoose';

const bankStatementSchema = new mongoose.Schema(
  {
    bankAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'BankAccount', required: true },
    periodId: { type: mongoose.Schema.Types.ObjectId, ref: 'Period', required: true },
    fileName: { type: String, required: true },
    contentHash: String,
    importedAt: { type: Date, default: Date.now },
    openingBalanceCents: { type: Number, required: true },
    closingBalanceCents: { type: Number, required: true },
    lineCount: { type: Number, default: 0 },
    isIllustrative: { type: Boolean, default: false },
  },
  { timestamps: true }
);

bankStatementSchema.index({ bankAccountId: 1, contentHash: 1 }, { unique: true, partialFilterExpression: { contentHash: { $type: 'string' } } });

export default mongoose.model('BankStatement', bankStatementSchema);
