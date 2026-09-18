import mongoose from 'mongoose';

const periodSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true }, // e.g. '2026-08'
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    billedLabourHours: { type: Number, default: null },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
    },
    isIllustrative: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Period', periodSchema);
