import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['dealership', 'admin'],
      required: true,
    },
    isIllustrative: { type: Boolean, default: false },
    isSelfRegistered: { type: Boolean, default: false },
    passwordResetRequestIdHash: { type: String, select: false },
    passwordResetOtpHash: { type: String, select: false },
    passwordResetOtpExpiresAt: { type: Date, select: false },
    passwordResetOtpSentAt: { type: Date, select: false },
    passwordResetOtpAttempts: { type: Number, default: 0, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetTokenExpiresAt: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.statics.hashPassword = async function (plain) {
  return bcrypt.hash(plain, 12);
};

// Never return passwordHash in JSON
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.passwordResetTokenHash;
    delete ret.passwordResetRequestIdHash;
    delete ret.passwordResetOtpHash;
    delete ret.passwordResetOtpExpiresAt;
    delete ret.passwordResetOtpSentAt;
    delete ret.passwordResetOtpAttempts;
    delete ret.passwordResetTokenExpiresAt;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
