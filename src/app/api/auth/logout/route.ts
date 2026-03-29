import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = authenticateRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const response = NextResponse.json({ message: 'Logged out successfully' });
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
