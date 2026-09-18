import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User.js';
import env from '../config/env.js';
import { logAction } from '../services/auditLog.js';

const roleSchema = z.enum(['dealership', 'admin']);
const passwordSchema = z.string().min(8, 'Password must contain at least 8 characters').max(128);
const emailSchema = z.string().trim().email().transform((value) => value.toLowerCase());

function issueToken(user) {
  return jwt.sign(
    { sub: user._id, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

export async function signup(req, res) {
  const input = z.object({
    name: z.string().trim().min(2).max(100),
    email: emailSchema,
    password: passwordSchema,
    role: roleSchema,
  }).parse(req.body);

  const existing = await User.findOne({ email: input.email });
  if (existing?.isSelfRegistered || (existing && !existing.isIllustrative)) {
    return res.status(409).json({ error: 'An account already exists for this email' });
  }

  // A seed principal may be claimed through the normal signup form. Updating
  // it preserves historical audit references while still requiring signup.
  const user = existing || new User({ email: input.email });
  user.name = input.name;
  user.passwordHash = await User.hashPassword(input.password);
  user.role = input.role;
  user.isSelfRegistered = true;
  user.isIllustrative = false;
  await user.save();

  await logAction({
    userId: user._id,
    action: 'signup',
    entityType: 'User',
    entityId: user._id,
    after: { role: user.role },
  });

  res.status(201).json({
    message: 'Account created. You can now sign in.',
    user: user.toJSON(),
  });
}

export async function login(req, res) {
  const input = z.object({
    email: emailSchema,
    password: z.string().min(1),
    role: roleSchema,
  }).parse(req.body);

  const user = await User.findOne({
    email: input.email,
    role: input.role,
    isSelfRegistered: true,
  });
  if (!user || !await user.comparePassword(input.password)) {
    return res.status(401).json({ error: 'Invalid email, password, or role' });
  }

  await logAction({
    userId: user._id,
    action: 'login',
    entityType: 'User',
    entityId: user._id,
  });

  res.json({ token: issueToken(user), user: user.toJSON() });
}

export async function forgotPassword(req, res) {
  const input = z.object({ email: emailSchema, role: roleSchema }).parse(req.body);
  const user = await User.findOne({
    email: input.email,
    role: input.role,
    isSelfRegistered: true,
  });

  // Return the same message for existing and unknown accounts. The reset token
  // is returned because this demo tenancy has no outbound email integration.
  if (!user) {
    return res.json({ message: 'If that account exists, a reset link has been created.' });
  }

  const resetToken = randomBytes(32).toString('hex');
  user.passwordResetTokenHash = createHash('sha256').update(resetToken).digest('hex');
  user.passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await user.save();

  await logAction({
    userId: user._id,
    action: 'password_reset_requested',
    entityType: 'User',
    entityId: user._id,
  });

  res.json({
    message: 'Reset request created. Set a new password within 15 minutes.',
    resetToken,
  });
}

export async function resetPassword(req, res) {
  const input = z.object({
    resetToken: z.string().length(64),
    password: passwordSchema,
  }).parse(req.body);
  const tokenHash = createHash('sha256').update(input.resetToken).digest('hex');
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpiresAt: { $gt: new Date() },
    isSelfRegistered: true,
  }).select('+passwordResetTokenHash +passwordResetExpiresAt');

  if (!user) return res.status(400).json({ error: 'Reset link is invalid or has expired' });

  user.passwordHash = await User.hashPassword(input.password);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  await user.save();

  await logAction({
    userId: user._id,
    action: 'password_reset_completed',
    entityType: 'User',
    entityId: user._id,
  });

  res.json({ message: 'Password updated. You can now sign in.' });
}

export async function me(req, res) {
  res.json({ user: req.user });
}
