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
        approvalRule: {
          include: {
            specificApprover: true,
            steps: { orderBy: { stepOrder: 'asc' } },
          },
        },
      },
    });

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }
    if (expense.status === 'APPROVED' || expense.status === 'REJECTED') {
      return NextResponse.json({ error: 'This expense has already been finalized' }, { status: 400 });
    }

    const rule = expense.approvalRule;
    const isSequential = rule?.isSequential ?? true;

    // Find the pending step assigned to this user
    const myStep = expense.approvalSteps.find(
      (s) => s.approverId === authUser.userId && s.status === 'PENDING'
    );

    // Admin override: admin can force-approve even without an assigned step
    const isAdminOverride = authUser.role === 'ADMIN' && !myStep;

    if (!myStep && !isAdminOverride) {
      return NextResponse.json(
        { error: 'You are not authorized to approve/reject this expense at this step' },
        { status: 403 }
      );
    }

    // --- REJECT ---
    if (action === 'REJECT') {
      await prisma.$transaction(async (tx: TxClient) => {
        if (myStep) {
          await tx.approvalStep.update({
            where: { id: myStep.id },
            data: { status: 'REJECTED', comments, decidedAt: new Date() },
          });
        }
        // Mark remaining steps as skipped (keep status PENDING for audit, just close expense)
        await tx.expense.update({
          where: { id: expense.id },
          data: { status: 'REJECTED' },
        });
      });
      return NextResponse.json({ message: 'Expense rejected' });
    }

    // --- APPROVE ---
    await prisma.$transaction(async (tx: TxClient) => {
      // Mark current step approved
      if (myStep) {
        await tx.approvalStep.update({
          where: { id: myStep.id },
          data: { status: 'APPROVED', comments, decidedAt: new Date() },
        });
      }

      // Admin override: approve everything immediately
      if (isAdminOverride) {
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

      // Fetch fresh steps after update
      const allSteps = await tx.approvalStep.findMany({
        where: { expenseId: expense.id },
        orderBy: { stepOrder: 'asc' },
      });
      const approvedSteps = allSteps.filter((s) => s.status === 'APPROVED');
      const pendingSteps = allSteps.filter((s) => s.status === 'PENDING');
      const totalSteps = allSteps.length;
      const approvedCount = approvedSteps.length;

      // ── Conditional auto-approval checks (SPECIFIC_APPROVER / PERCENTAGE / HYBRID) ──
      let shouldAutoApprove = false;

      if (rule) {
        // Specific approver rule: if THIS approver is the designated specific approver → auto-approve
        if (
          (rule.ruleType === 'SPECIFIC_APPROVER' || rule.ruleType === 'HYBRID') &&
          rule.specificApproverId === authUser.userId
        ) {
          shouldAutoApprove = true;
        }

        // Percentage rule: if approved% >= threshold → auto-approve
        if (
          (rule.ruleType === 'PERCENTAGE' || rule.ruleType === 'HYBRID') &&
          rule.percentThreshold &&
          !shouldAutoApprove
        ) {
          const percentApproved = (approvedCount / totalSteps) * 100;
          if (percentApproved >= rule.percentThreshold) {
            // Check if all "required" approvers have approved before applying % rule
            const requiredApproverIds = rule.steps
              .filter((rs) => rs.isRequired)
              .map((rs) => rs.approverId);
            const allRequiredApproved = requiredApproverIds.every((rid) =>
              approvedSteps.some((as) => as.approverId === rid)
            );
            if (allRequiredApproved) {
              shouldAutoApprove = true;
            }
          }
        }
      }

      if (shouldAutoApprove) {
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

      // ── Sequential mode: advance to next step one at a time ──
      if (isSequential) {
        if (pendingSteps.length === 0) {
          // All steps done → approved
          await tx.expense.update({
            where: { id: expense.id },
            data: { status: 'APPROVED', currentStep: totalSteps },
          });
        } else {
          // Move to next step
          await tx.expense.update({
            where: { id: expense.id },
            data: { currentStep: expense.currentStep + 1, status: 'IN_REVIEW' },
          });
        }
        return;
      }

      // ── Parallel mode: all approvers got the request simultaneously ──
      // Expense is approved when ALL non-required approvers voted + all required approved
      if (pendingSteps.length === 0) {
        await tx.expense.update({
          where: { id: expense.id },
          data: { status: 'APPROVED', currentStep: totalSteps },
        });
      } else {
        // Still waiting on others
        await tx.expense.update({
          where: { id: expense.id },
          data: { currentStep: approvedCount, status: 'IN_REVIEW' },
        });
      }
    });

    return NextResponse.json({ message: `Expense ${action === 'APPROVE' ? 'approved' : 'rejected'}` });
  } catch (error) {
    console.error('Approve/reject error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
