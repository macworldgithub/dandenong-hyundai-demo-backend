import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['asset', 'liability', 'equity', 'revenue', 'expense'],
      required: true,
    },
    department: {
      type: String,
      enum: ['New', 'Used', 'F&I', 'Parts', 'Service', 'Admin', 'General'],
      default: 'General',
    },
    isControl: { type: Boolean, default: false },
    controlFor: {
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
        null,
      ],
      default: null,
    },
    isActive: { type: Boolean, default: true },
    isIllustrative: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Account', accountSchema);
