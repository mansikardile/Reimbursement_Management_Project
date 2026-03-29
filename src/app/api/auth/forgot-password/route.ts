import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { sendEmail, generateTempPassword } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Validation failed', details: { email: 'Please enter your email address' } },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal if email exists — always show success message
      return NextResponse.json({
        message: 'If an account exists with this email, a new password has been sent.',
      });
    }

    // Generate temp password
    const tempPassword = generateTempPassword();
    const hashed = await hashPassword(tempPassword);

    // Update user's password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    // Send email
    const result = await sendEmail(
      email,
      'ReimburseFlow — Your New Password',
      `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="font-size: 2rem;">💼</span>
          <h1 style="font-size: 1.5rem; color: #714b67; margin: 8px 0;">ReimburseFlow</h1>
        </div>
        <div style="background: #f5f0f4; border-radius: 12px; padding: 24px;">
          <p style="color: #374151; margin-bottom: 12px;">Hi ${user.firstName},</p>
          <p style="color: #374151; margin-bottom: 16px;">
            Your password has been reset. Here is your new temporary password:
          </p>
          <div style="background: #fff; border: 2px dashed #714b67; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0;">
            <code style="font-size: 1.25rem; font-weight: 700; color: #714b67; letter-spacing: 2px;">
              ${tempPassword}
            </code>
          </div>
          <p style="color: #e74c3c; font-size: 0.875rem; font-weight: 500; margin-top: 16px;">
            ⚠️ Please change this password immediately after logging in.
          </p>
          <p style="color: #6b7280; font-size: 0.8125rem; margin-top: 12px;">
            Go to Dashboard → Settings to change your password.
          </p>
        </div>
        <p style="color: #9ca3af; font-size: 0.75rem; text-align: center; margin-top: 24px;">
          If you didn't request this, please contact your administrator immediately.
        </p>
      </div>
      `
    );

    console.log('📧 Password reset email sent to:', email);
    if (result.previewUrl) {
      console.log('📧 Preview URL:', result.previewUrl);
    }

    return NextResponse.json({
      message: 'If an account exists with this email, a new password has been sent.',
      previewUrl: result.previewUrl || null, // Only in dev
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
