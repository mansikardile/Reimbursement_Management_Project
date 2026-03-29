import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, generateOTP, storeOTP, verifyOTP } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, otp } = body;

    if (action === 'send') {
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
      }

      const code = generateOTP();
      storeOTP(email, code);

      const result = await sendEmail(
        email,
        'ReimburseFlow — Verify Your Email',
        `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 2rem;">💼</span>
            <h1 style="font-size: 1.5rem; color: #714b67; margin: 8px 0;">ReimburseFlow</h1>
          </div>
          <div style="background: #f5f0f4; border-radius: 12px; padding: 24px; text-align: center;">
            <p style="color: #374151; margin-bottom: 16px;">Your verification code is:</p>
            <div style="font-size: 2rem; font-weight: 700; letter-spacing: 8px; color: #714b67; margin: 16px 0;">
              ${code}
            </div>
            <p style="color: #6b7280; font-size: 0.875rem; margin-top: 16px;">
              This code expires in 10 minutes.
            </p>
          </div>
          <p style="color: #9ca3af; font-size: 0.75rem; text-align: center; margin-top: 24px;">
            If you didn't request this, please ignore this email.
          </p>
        </div>
        `
      );

      return NextResponse.json({
        message: 'Verification code sent to your email',
        previewUrl: result.previewUrl || null, // Only in dev
      });
    }

    if (action === 'verify') {
      if (!email || !otp) {
        return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
      }

      const isValid = verifyOTP(email, otp);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid or expired verification code' },
          { status: 400 }
        );
      }

      return NextResponse.json({ message: 'Email verified successfully', verified: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
