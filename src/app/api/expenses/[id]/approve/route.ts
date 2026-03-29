import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { approveRejectSchema, formatZodErrors } from '@/lib/validations';

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = authenticateRequest(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (authUser.role === 'EMPLOYEE') {
      return NextResponse.json({ error: 'Employees cannot approve expenses' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const validation = approveRejectSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodErrors(validation.error) },
        { status: 400 }
      );
    }

    const { action, comments } = validation.data;

    const expense = await prisma.expense.findFirst({
      where: { id, companyId: authUser.companyId },
      include: {
        approvalSteps: { orderBy: { stepOrder: 'asc' } },
        approvalRule: { include: { specificApprover: true } },
      },
    });

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    if (expense.status === 'APPROVED' || expense.status === 'REJECTED') {
      return NextResponse.json({ error: 'This expense has already been finalized' }, { status: 400 });
    }

    // Find the current pending step for this approver
    const currentStep = expense.approvalSteps.find(
      (s: { approverId: string; status: string }) => s.approverId === authUser.userId && s.status === 'PENDING'
    );

    // Allow admin override
    const isAdminOverride = authUser.role === 'ADMIN' && !currentStep;

    if (!currentStep && !isAdminOverride) {
      return NextResponse.json(
        { error: 'You are not authorized to approve/reject this expense at this step' },
        { status: 403 }
      );
    }

    if (action === 'REJECT') {
      // Rejection at any step rejects the whole expense
      await prisma.$transaction(async (tx: TxClient) => {
        if (currentStep) {
          await tx.approvalStep.update({
            where: { id: currentStep.id },
            data: { status: 'REJECTED', comments, decidedAt: new Date() },
          });
        }
        await tx.expense.update({
          where: { id: expense.id },
          data: { status: 'REJECTED' },
        });
      });

      return NextResponse.json({ message: 'Expense rejected' });
    }

    // APPROVE logic
    await prisma.$transaction(async (tx: TxClient) => {
      if (currentStep) {
        await tx.approvalStep.update({
          where: { id: currentStep.id },
          data: { status: 'APPROVED', comments, decidedAt: new Date() },
        });
      }

      // Check conditional approval rules
      const rule = expense.approvalRule;
      let shouldAutoApprove = false;

      if (rule) {
        const allSteps = await tx.approvalStep.findMany({
          where: { expenseId: expense.id },
        });

        const approvedSteps = allSteps.filter(
          (s: { status: string; id: string }) => s.status === 'APPROVED' || (s.id === currentStep?.id)
        );
        const totalSteps = allSteps.length;
        const approvedCount = approvedSteps.length;

        if (rule.ruleType === 'PERCENTAGE' || rule.ruleType === 'HYBRID') {
          const percentApproved = (approvedCount / totalSteps) * 100;
          if (rule.percentThreshold && percentApproved >= rule.percentThreshold) {
            shouldAutoApprove = true;
          }
        }

        if (rule.ruleType === 'SPECIFIC_APPROVER' || rule.ruleType === 'HYBRID') {
          if (rule.specificApproverId === authUser.userId) {
            shouldAutoApprove = true;
          }
        }

        if (shouldAutoApprove) {
          // Auto-approve remaining steps
          await tx.approvalStep.updateMany({
            where: { expenseId: expense.id, status: 'PENDING' },
            data: { status: 'APPROVED', decidedAt: new Date(), comments: 'Auto-approved by rule' },
          });
          await tx.expense.update({
            where: { id: expense.id },
            data: { status: 'APPROVED', currentStep: totalSteps },
          });
          return;
        }
      }

      if (isAdminOverride) {
        // Admin override approves everything
        await tx.approvalStep.updateMany({
          where: { expenseId: expense.id, status: 'PENDING' },
          data: { status: 'APPROVED', decidedAt: new Date(), comments: comments || 'Admin override' },
        });
        await tx.expense.update({
          where: { id: expense.id },
          data: { status: 'APPROVED', currentStep: expense.totalSteps },
        });
        return;
      }

      // Check if this was the last step
      const remainingSteps = await tx.approvalStep.count({
        where: { expenseId: expense.id, status: 'PENDING' },
      });

      if (remainingSteps === 0) {
        await tx.expense.update({
          where: { id: expense.id },
          data: { status: 'APPROVED', currentStep: expense.totalSteps },
        });
      } else {
        await tx.expense.update({
          where: { id: expense.id },
          data: { currentStep: expense.currentStep + 1, status: 'IN_REVIEW' },
        });
      }
    });

    return NextResponse.json({ message: 'Expense approved' });
  } catch (error) {
    console.error('Approve/reject error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
