import mongoose from 'mongoose';

const poLineSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    unitPriceCents: { type: Number, required: true },
    totalCents: { type: Number, required: true },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  },
  { _id: true }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: { type: String, required: true, unique: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    vin: { type: String },
    lines: [poLineSchema],
    subtotalCents: { type: Number, default: 0 },
    gstCents: { type: Number, default: 0 },
    grossCents: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['open', 'partially_received', 'received', 'cancelled'],
      default: 'open',
    },
    isIllustrative: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('PurchaseOrder', purchaseOrderSchema);
