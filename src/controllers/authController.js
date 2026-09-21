import { createHash, randomBytes, randomInt } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User.js';
import env from '../config/env.js';
import { logAction } from '../services/auditLog.js';
import { sendPasswordResetOtp } from '../services/email.js';

const roleSchema = z.enum(['dealership', 'admin']);
const passwordSchema = z.string().min(8, 'Password must contain at least 8 characters').max(128);
const emailSchema = z.string().trim().email().transform((value) => value.toLowerCase());
const hash = (value) => createHash('sha256').update(value).digest('hex');
const resetFields = '+passwordResetRequestIdHash +passwordResetOtpHash +passwordResetOtpExpiresAt +passwordResetOtpSentAt +passwordResetOtpAttempts +passwordResetTokenHash +passwordResetTokenExpiresAt';

function issueToken(user) {
  return jwt.sign({ sub: user._id, role: user.role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

export async function signup(req, res) {
  const input = z.object({ name: z.string().trim().min(2).max(100), email: emailSchema, password: passwordSchema, role: roleSchema }).parse(req.body);
  const existing = await User.findOne({ email: input.email });
  if (existing?.isSelfRegistered || (existing && !existing.isIllustrative)) return res.status(409).json({ error: 'An account already exists for this email' });
  const user = existing || new User({ email: input.email });
  user.name = input.name;
  user.passwordHash = await User.hashPassword(input.password);
  user.role = input.role;
  user.isSelfRegistered = true;
  user.isIllustrative = false;
  await user.save();
  await logAction({ userId: user._id, action: 'signup', entityType: 'User', entityId: user._id, after: { role: user.role } });
  res.status(201).json({ message: 'Account created. You can now sign in.', user: user.toJSON() });
}

export async function login(req, res) {
  const input = z.object({ email: emailSchema, password: z.string().min(1), role: roleSchema }).parse(req.body);
  const user = await User.findOne({ email: input.email, role: input.role, isSelfRegistered: true });
  if (!user || !await user.comparePassword(input.password)) return res.status(401).json({ error: 'Invalid email, password, or role' });
  await logAction({ userId: user._id, action: 'login', entityType: 'User', entityId: user._id });
  res.json({ token: issueToken(user), user: user.toJSON() });
}

async function issueOtp(input, res, isResend = false) {
  const requestId = randomBytes(32).toString('hex');
  const user = await User.findOne({ email: input.email, role: input.role, isSelfRegistered: true }).select(resetFields);
  if (!user) return res.json({ message: 'If that account exists, a verification code has been sent.', requestId });
  if (isResend && user.passwordResetOtpSentAt && Date.now() - user.passwordResetOtpSentAt.getTime() < 60_000) {
    const retryAfter = Math.ceil((60_000 - (Date.now() - user.passwordResetOtpSentAt.getTime())) / 1000);
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({ error: `Please wait ${retryAfter} seconds before requesting another code.`, retryAfter });
  }
  const otp = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await sendPasswordResetOtp({ to: user.email, name: user.name, otp });
  user.passwordResetRequestIdHash = hash(requestId);
  user.passwordResetOtpHash = hash(`${requestId}:${otp}`);
  user.passwordResetOtpExpiresAt = new Date(Date.now() + 5 * 60_000);
  user.passwordResetOtpSentAt = new Date();
  user.passwordResetOtpAttempts = 0;
  user.passwordResetTokenHash = undefined;
  user.passwordResetTokenExpiresAt = undefined;
  await user.save();
  await logAction({ userId: user._id, action: isResend ? 'password_reset_otp_resent' : 'password_reset_requested', entityType: 'User', entityId: user._id });
  res.json({ message: 'If that account exists, a verification code has been sent.', requestId });
}

export async function forgotPassword(req, res) {
  const input = z.object({ email: emailSchema, role: roleSchema }).parse(req.body);
  return issueOtp(input, res);
}

export async function resendPasswordOtp(req, res) {
  const input = z.object({ email: emailSchema, role: roleSchema }).parse(req.body);
  return issueOtp(input, res, true);
}

export async function verifyPasswordOtp(req, res) {
  const input = z.object({ requestId: z.string().length(64), otp: z.string().regex(/^\d{6}$/) }).parse(req.body);
  const user = await User.findOne({ passwordResetRequestIdHash: hash(input.requestId), isSelfRegistered: true }).select(resetFields);
  if (!user || !user.passwordResetOtpHash || !user.passwordResetOtpExpiresAt || user.passwordResetOtpExpiresAt <= new Date()) {
    return res.status(400).json({ error: 'The verification code is invalid or has expired.' });
  }
  if ((user.passwordResetOtpAttempts || 0) >= 5) return res.status(429).json({ error: 'Too many incorrect attempts. Request a new code.' });
  if (hash(`${input.requestId}:${input.otp}`) !== user.passwordResetOtpHash) {
    user.passwordResetOtpAttempts = (user.passwordResetOtpAttempts || 0) + 1;
    await user.save();
    return res.status(400).json({ error: 'The verification code is invalid or has expired.', attemptsRemaining: Math.max(0, 5 - user.passwordResetOtpAttempts) });
  }
  const resetToken = randomBytes(32).toString('hex');
  user.passwordResetTokenHash = hash(resetToken);
  user.passwordResetTokenExpiresAt = new Date(Date.now() + 10 * 60_000);
  user.passwordResetRequestIdHash = undefined;
  user.passwordResetOtpHash = undefined;
  user.passwordResetOtpExpiresAt = undefined;
  user.passwordResetOtpSentAt = undefined;
  user.passwordResetOtpAttempts = 0;
  await user.save();
  await logAction({ userId: user._id, action: 'password_reset_otp_verified', entityType: 'User', entityId: user._id });
  res.json({ message: 'Email verified. You can now set a new password.', resetToken });
}

export async function resetPassword(req, res) {
  const input = z.object({ resetToken: z.string().length(64), password: passwordSchema }).parse(req.body);
  const user = await User.findOne({ passwordResetTokenHash: hash(input.resetToken), passwordResetTokenExpiresAt: { $gt: new Date() }, isSelfRegistered: true }).select(resetFields);
  if (!user) return res.status(400).json({ error: 'Reset authorization is invalid or has expired.' });
  user.passwordHash = await User.hashPassword(input.password);
  user.passwordResetTokenHash = undefined;
  user.passwordResetTokenExpiresAt = undefined;
  await user.save();
  await logAction({ userId: user._id, action: 'password_reset_completed', entityType: 'User', entityId: user._id });
  res.json({ message: 'Password updated. You can now sign in.' });
}

export async function me(req, res) {
  res.json({ user: req.user });
}
