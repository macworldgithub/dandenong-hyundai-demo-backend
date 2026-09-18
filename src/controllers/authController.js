import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import env from '../config/env.js';
import { logAction } from '../services/auditLog.js';

export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { sub: user._id, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );

  await logAction({
    userId: user._id,
    action: 'login',
    entityType: 'User',
    entityId: user._id,
  });

  res.json({
    token,
    user: user.toJSON(),
  });
}

export async function me(req, res) {
  res.json({ user: req.user });
}
