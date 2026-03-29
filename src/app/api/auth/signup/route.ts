import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, generateToken } from '@/lib/auth';
import { signupSchema, formatZodErrors } from '@/lib/validations';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = signupSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodErrors(validation.error) },
        { status: 400 }
      );
    }

    const { email, password, firstName, lastName, companyName, country, currency } = validation.data;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Validation failed', details: { email: 'An account with this email already exists' } },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    // Create company and admin user in a transaction
    const result = await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
      const company = await tx.company.create({
        data: {
          name: companyName,
          country,
          currency,
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: 'ADMIN',
          companyId: company.id,
        },
      });

      return { company, user };
    });

    const token = generateToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role,
      companyId: result.company.id,
    });

    const response = NextResponse.json({
      message: 'Account created successfully',
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
      },
      company: {
        id: result.company.id,
        name: result.company.name,
        country: result.company.country,
        currency: result.company.currency,
      },
      token,
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
