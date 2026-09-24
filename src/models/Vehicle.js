import mongoose from 'mongoose';

const costLineSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'invoice',
        'freight',
        'transport',
        'pdi',
        'compliance',
        'accessories',
        'recon',
        'sublet',
        'holdback',
        'bonus',
        'floorplan_interest',
        'internal_workshop',
        'other',
      ],
      required: true,
    },
    amountCents: { type: Number, required: true }, // negative for holdback/bonus
    sourceDocRef: { type: String },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const vehicleSchema = new mongoose.Schema(
  {
    vin: { type: String, required: true, unique: true },
    stockNumber: { type: String, required: true, unique: true },
    make: { type: String, default: 'Hyundai' },
    model: { type: String, required: true },
    variant: { type: String },
    csvDescription: { type: String },
    registrationNumber: { type: String },
    odometerKm: { type: Number },
    colour: { type: String },
    location: { type: String },
    listPriceCents: { type: Number, default: 0 },
    ageDays: { type: Number },
    deal: { type: String },
    sourceStatus: { type: String },
    openRoPo: { type: String },
    csvSource: { type: String },
    year: { type: Number, required: true },
    class: {
      type: String,
      enum: ['new', 'used', 'demo'],
      required: true,
    },
    status: {
      type: String,
      enum: ['in_stock', 'delivered'],
      default: 'in_stock',
    },
    purchaseInvoiceRef: { type: String },
    costLines: [costLineSchema],
    totalCostCents: { type: Number, default: 0 },
    isIllustrative: { type: Boolean, default: false },
  },
  { timestamps: true }
);

vehicleSchema.index({ class: 1, status: 1 });
vehicleSchema.index({ registrationNumber: 1 });

export default mongoose.model('Vehicle', vehicleSchema);
