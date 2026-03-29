import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest, hashPassword, verifyPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const authUser = authenticateRequest(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || typeof currentPassword !== 'string') {
      return NextResponse.json(
        { error: 'Validation failed', details: { currentPassword: 'Current password is required' } },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Validation failed', details: { newPassword: 'New password must be at least 6 characters' } },
        { status: 400 }
      );
    }

    // Get the user's current password hash
    const user = await prisma.user.findUnique({ where: { id: authUser.userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Validation failed', details: { currentPassword: 'Current password is incorrect' } },
        { status: 400 }
      );
    }

    // Hash and save new password
    const hashed = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    return NextResponse.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
