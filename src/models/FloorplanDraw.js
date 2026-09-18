import mongoose from 'mongoose';

const floorplanDrawSchema = new mongoose.Schema(
  {
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    financier: { type: String, required: true }, // e.g. 'Hyundai Capital'
    drawnAmountCents: { type: Number, required: true },
    drawnDate: { type: Date, required: true },
    interestAccruedCents: { type: Number, default: 0 },
    settledDate: { type: Date },
    isIllustrative: { type: Boolean, default: false },
  },
  { timestamps: true }
);

floorplanDrawSchema.index({ vehicleId: 1 });

export default mongoose.model('FloorplanDraw', floorplanDrawSchema);
