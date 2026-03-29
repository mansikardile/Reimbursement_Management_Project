import nodemailer from 'nodemailer';

// Use Ethereal for dev (free fake SMTP), or configure real SMTP via env
let transporter: nodemailer.Transporter;

async function getTransporter() {
  if (transporter) return transporter;

  // Use real SMTP config from .env
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE !== 'false', // True for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

export async function sendEmail(to: string, subject: string, html: string) {
  const t = await getTransporter();
  const info = await t.sendMail({
    from: process.env.SMTP_FROM || '"ReimburseFlow" <noreply@reimburseflow.com>',
    to,
    subject,
    html,
  });
  // In dev, log the preview URL so you can see the email
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log('📧 Email preview URL:', previewUrl);
  }
  return { messageId: info.messageId, previewUrl };
}

export function generateTempPassword(length = 12): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '!@#$%&*';
  const all = upper + lower + digits + special;

  // Ensure at least one of each
  let password = '';
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  password += special[Math.floor(Math.random() * special.length)];

  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  // Shuffle
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// In-memory OTP store (use Redis in production)
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

export function storeOTP(email: string, otp: string) {
  otpStore.set(email, { otp, expiresAt: Date.now() + 10 * 60 * 1000 }); // 10 min
}

export function verifyOTP(email: string, otp: string): boolean {
  const stored = otpStore.get(email);
  if (!stored) return false;
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(email);
    return false;
  }
  if (stored.otp !== otp) return false;
  otpStore.delete(email);
  return true;
}
