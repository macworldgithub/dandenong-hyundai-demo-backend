import mongoose from 'mongoose';

const bankAccountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    bsb: { type: String, required: true },
    accountNumber: { type: String, required: true },
    type: {
      type: String,
      enum: ['operating', 'trust', 'deposits'],
      required: true,
    },
    glAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    openingBalanceCents: { type: Number, default: 0 },
    isIllustrative: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('BankAccount', bankAccountSchema);
