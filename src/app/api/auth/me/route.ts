import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authUser = authenticateRequest(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      include: { company: true, manager: { select: { id: true, firstName: true, lastName: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        managerId: user.managerId,
        manager: user.manager,
      },
      company: {
        id: user.company.id,
        name: user.company.name,
        country: user.company.country,
        currency: user.company.currency,
      },
    });
  } catch {
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
