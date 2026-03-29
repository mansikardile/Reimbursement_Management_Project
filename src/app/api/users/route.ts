import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest, hashPassword } from '@/lib/auth';
import { createUserSchema, updateUserSchema, formatZodErrors } from '@/lib/validations';

export async function GET(req: NextRequest) {
  try {
    const authUser = authenticateRequest(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      where: { companyId: authUser.companyId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        managerId: true,
        createdAt: true,
        manager: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = authenticateRequest(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (authUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can create users' }, { status: 403 });
    }

    const body = await req.json();
    const validation = createUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodErrors(validation.error) },
        { status: 400 }
      );
    }

    const { email, password, firstName, lastName, role, managerId } = validation.data;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Validation failed', details: { email: 'An account with this email already exists' } },
        { status: 400 }
      );
    }

    if (managerId) {
      const manager = await prisma.user.findFirst({
        where: { id: managerId, companyId: authUser.companyId, role: { in: ['MANAGER', 'ADMIN'] } },
      });
      if (!manager) {
        return NextResponse.json(
          { error: 'Validation failed', details: { managerId: 'Selected manager not found' } },
          { status: 400 }
        );
      }
    }

    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
        companyId: authUser.companyId,
        managerId: managerId || null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        managerId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ message: 'User created successfully', user }, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authUser = authenticateRequest(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (authUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can update users' }, { status: 403 });
    }

    const body = await req.json();
    const { userId, ...updateData } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const validation = updateUserSchema.safeParse(updateData);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodErrors(validation.error) },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findFirst({
      where: { id: userId, companyId: authUser.companyId },
    });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: validation.data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        managerId: true,
      },
    });

    return NextResponse.json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
