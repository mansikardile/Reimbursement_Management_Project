import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { approvalRuleSchema, formatZodErrors } from '@/lib/validations';

export async function GET(req: NextRequest) {
  try {
    const authUser = authenticateRequest(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const rules = await prisma.approvalRule.findMany({
      where: { companyId: authUser.companyId },
      include: {
        steps: {
          include: { approver: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { stepOrder: 'asc' },
        },
        specificApprover: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ rules });
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
      return NextResponse.json({ error: 'Only admins can create approval rules' }, { status: 403 });
    }

    const body = await req.json();
    const validation = approvalRuleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodErrors(validation.error) },
        { status: 400 }
      );
    }

    const { name, ruleType, percentThreshold, minAmount, maxAmount, isManagerFirst, specificApproverId, steps } = validation.data;

    const rule = await prisma.approvalRule.create({
      data: {
        name,
        ruleType,
        percentThreshold: percentThreshold || null,
        minAmount: minAmount || null,
        maxAmount: maxAmount || null,
        isManagerFirst,
        companyId: authUser.companyId,
        specificApproverId: specificApproverId || null,
        steps: {
          create: steps.map((s) => ({
            stepOrder: s.stepOrder,
            roleLabel: s.roleLabel,
            approverId: s.approverId,
          })),
        },
      },
      include: {
        steps: {
          include: { approver: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    return NextResponse.json({ message: 'Approval rule created', rule }, { status: 201 });
  } catch (error) {
    console.error('Create rule error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authUser = authenticateRequest(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (authUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can delete approval rules' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const ruleId = searchParams.get('id');

    if (!ruleId) {
      return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 });
    }

    const rule = await prisma.approvalRule.findFirst({
      where: { id: ruleId, companyId: authUser.companyId },
    });

    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    await prisma.approvalRule.delete({ where: { id: ruleId } });

    return NextResponse.json({ message: 'Approval rule deleted' });
  } catch (error) {
    console.error('Delete rule error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
