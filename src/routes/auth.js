import { Router } from 'express';
import { forgotPassword, login, me, resendPasswordOtp, resetPassword, signup, verifyPasswordOtp } from '../controllers/authController.js';
import auth from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();

router.post('/login', login);
router.post('/signup', signup);
router.post('/forgot-password', rateLimit({ windowMs: 15 * 60_000, max: 5 }), forgotPassword);
router.post('/forgot-password/resend', rateLimit({ windowMs: 15 * 60_000, max: 5 }), resendPasswordOtp);
router.post('/forgot-password/verify', rateLimit({ windowMs: 15 * 60_000, max: 15 }), verifyPasswordOtp);
router.post('/reset-password', rateLimit({ windowMs: 15 * 60_000, max: 10 }), resetPassword);
router.get('/me', auth, me);

export default router;
