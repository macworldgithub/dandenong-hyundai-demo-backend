import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    abn: { type: String },
    category: {
      type: String,
      enum: ['oem', 'recon', 'transport', 'overhead', 'parts', 'accessories', 'equipment', 'utilities', 'government', 'insurance', 'advertising', 'software', 'professional', 'financier', 'facilities'],
      required: true,
    },
    defaultAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    paymentTerms: { type: Number, default: 30 }, // days
    bankDetails: {
      bsb: String,
      accountNumber: String,
      accountName: String,
    },
    isActive: { type: Boolean, default: true },
    isIllustrative: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Supplier', supplierSchema);
