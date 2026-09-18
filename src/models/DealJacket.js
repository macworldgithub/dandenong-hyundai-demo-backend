import mongoose from 'mongoose';

const dealJacketSchema = new mongoose.Schema(
  {
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    dealNumber: { type: String, required: true, unique: true },
    customerRef: { type: String }, // masked
    deliveryDate: { type: Date, required: true },
    sellingPriceCents: { type: Number, required: true },
    gstCents: { type: Number, required: true },
    tradeAllowanceCents: { type: Number, default: 0 },
    tradeAcvCents: { type: Number, default: 0 },
    payoffCents: { type: Number, default: 0 },
    fniBackEndCents: { type: Number, default: 0 },
    docFeeCents: { type: Number, default: 0 },
    commissionCents: { type: Number, default: 0 },
    frontGrossCents: { type: Number, required: true },
    backGrossCents: { type: Number, default: 0 },
    dealContributionCents: { type: Number, required: true },
    journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'JournalEntry' },
    isIllustrative: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('DealJacket', dealJacketSchema);
