import mongoose from 'mongoose';

const reconcilingItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    amountCents: { type: Number, required: true },
    sourceRef: { type: String },
  },
  { _id: true }
);

const controlRecSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'cash_operating',
        'cash_trust',
        'ap',
        'inventory_new',
        'inventory_used',
        'inventory_demo',
        'floorplan',
        'customer_deposits',
        'gst',
      ],
      required: true,
    },
    periodId: { type: mongoose.Schema.Types.ObjectId, ref: 'Period', required: true },
    glBalanceCents: { type: Number, required: true },
    subLedgerBalanceCents: { type: Number, required: true },
    reconcilingItems: [reconcilingItemSchema],
    differenceCents: { type: Number, required: true }, // must be 0 when complete
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending',
    },
    evidenceAvailable: { type: Boolean, default: false },
    sourceFileName: String,
    sourceBalanceCents: Number,
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    completedAt: { type: Date },
    isIllustrative: { type: Boolean, default: false },
  },
  { timestamps: true }
);

controlRecSchema.index({ type: 1, periodId: 1 }, { unique: true });

export default mongoose.model('ControlRec', controlRecSchema);
