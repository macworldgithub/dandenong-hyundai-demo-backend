import mongoose from 'mongoose';

const entitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    abn: { type: String, required: true },
    address: {
      street: String,
      suburb: String,
      state: String,
      postcode: String,
    },
    facilityLimitCents: { type: Number, default: null },
    signedOffAt: Date,
    isLocked: { type: Boolean, default: true },
    activePeriod: { type: mongoose.Schema.Types.ObjectId, ref: 'Period' },
    isIllustrative: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Entity', entitySchema);
