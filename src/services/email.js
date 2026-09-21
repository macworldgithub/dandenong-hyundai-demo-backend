import nodemailer from 'nodemailer';
import env from '../config/env.js';

let transporter;

function getTransporter() {
  if (!env.SMTP_USER || !env.SMTP_PASSWORD || !env.SMTP_FROM) {
    const error = new Error('Email service is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM in the backend .env file.');
    error.statusCode = 503;
    throw error;
  }
  transporter ||= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
  });
  return transporter;
}

export async function sendPasswordResetOtp({ to, name, otp }) {
  await getTransporter().sendMail({
    from: env.SMTP_FROM,
    to,
    subject: 'Your Good Showroom password reset code',
    text: `Hello ${name},\n\nYour password reset code is ${otp}. It expires in 5 minutes.\n\nIf you did not request this, you can safely ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;color:#252525;max-width:560px;margin:auto"><h2>Reset your password</h2><p>Hello ${name},</p><p>Use this verification code to continue:</p><p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#2936ff">${otp}</p><p>This code expires in 5 minutes. Never share it with anyone.</p><p style="color:#666;font-size:13px">If you did not request this, you can safely ignore this email.</p></div>`,
  });
}
