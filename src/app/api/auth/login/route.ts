import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, generateToken } from '@/lib/auth';
import { loginSchema, formatZodErrors } from '@/lib/validations';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = loginSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodErrors(validation.error) },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Validation failed', details: { email: 'No account found with this email' } },
        { status: 401 }
      );
    }

    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Validation failed', details: { password: 'Incorrect password' } },
        { status: 401 }
      );
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });

    const response = NextResponse.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      company: {
        id: user.company.id,
        name: user.company.name,
        country: user.company.country,
        currency: user.company.currency,
      },
      token,
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
