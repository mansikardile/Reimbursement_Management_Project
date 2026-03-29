import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';
import { expenseSchema, formatZodErrors } from '@/lib/validations';

async function getExchangeRate(baseCurrency: string, targetCurrency: string): Promise<number> {
  if (baseCurrency === targetCurrency) return 1;
  try {
    const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`);
    const data = await res.json();
    return data.rates[targetCurrency] || 1;
  } catch {
    return 1;
  }
}

export async function GET(req: NextRequest) {
  try {
    const authUser = authenticateRequest(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { companyId: authUser.companyId };

    if (authUser.role === 'EMPLOYEE') {
      where.submitterId = authUser.userId;
    } else if (authUser.role === 'MANAGER') {
      // Managers see their team's expenses + their own
      where.OR = [
        { submitterId: authUser.userId },
        { submitter: { managerId: authUser.userId } },
        { approvalSteps: { some: { approverId: authUser.userId } } },
      ];
    }
    // ADMIN sees all company expenses

    if (status) {
      where.status = status;
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          submitter: { select: { id: true, firstName: true, lastName: true, email: true } },
          approvalSteps: {
            include: { approver: { select: { id: true, firstName: true, lastName: true } } },
            orderBy: { stepOrder: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.expense.count({ where }),
    ]);

    return NextResponse.json({ expenses, total, page, limit });
  } catch (error) {
    console.error('Get expenses error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = authenticateRequest(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const validation = expenseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodErrors(validation.error) },
        { status: 400 }
      );
    }

    const { amount, originalCurrency, category, description, expenseDate, receiptUrl } = validation.data;

    // Get company currency
    const company = await prisma.company.findUnique({ where: { id: authUser.companyId } });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Convert currency
    const exchangeRate = await getExchangeRate(originalCurrency, company.currency);
    const convertedAmount = Math.round(amount * exchangeRate * 100) / 100;

    // Find applicable approval rule
    const approvalRule = await prisma.approvalRule.findFirst({
      where: {
        companyId: authUser.companyId,
        isActive: true,
        OR: [
          { minAmount: null, maxAmount: null },
          { minAmount: { lte: convertedAmount }, maxAmount: null },
          { minAmount: null, maxAmount: { gte: convertedAmount } },
          { minAmount: { lte: convertedAmount }, maxAmount: { gte: convertedAmount } },
        ],
      },
      include: {
        steps: { orderBy: { stepOrder: 'asc' }, include: { approver: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get the submitter to find their manager
    const submitter = await prisma.user.findUnique({
      where: { id: authUser.userId },
      include: { manager: true },
    });

    // Build approval steps
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const approvalSteps: any[] = [];
    let stepOrder = 1;

    if (approvalRule) {
      // If isManagerFirst and user has a manager, add manager as first step
      if (approvalRule.isManagerFirst && submitter?.managerId) {
        approvalSteps.push({
          stepOrder: stepOrder++,
          approverId: submitter.managerId,
          status: 'PENDING',
        });
      }

      // Add rule steps
      for (const step of approvalRule.steps) {
        // Skip if this approver was already added as manager
        if (approvalSteps.some(s => s.approverId === step.approverId)) continue;
        approvalSteps.push({
          stepOrder: stepOrder++,
          approverId: step.approverId,
          status: 'PENDING',
        });
      }
    } else if (submitter?.managerId) {
      // No rule defined, default to manager approval
      approvalSteps.push({
        stepOrder: 1,
        approverId: submitter.managerId,
        status: 'PENDING',
      });
    }

    const expense = await prisma.expense.create({
      data: {
        amount,
        originalCurrency,
        convertedAmount,
        companyCurrency: company.currency,
        exchangeRate,
        category,
        description,
        expenseDate: new Date(expenseDate),
        receiptUrl: receiptUrl || null,
        status: approvalSteps.length > 0 ? 'PENDING' : 'APPROVED',
        currentStep: approvalSteps.length > 0 ? 1 : 0,
        totalSteps: approvalSteps.length,
        submitterId: authUser.userId,
        companyId: authUser.companyId,
        approvalRuleId: approvalRule?.id || null,
        approvalSteps: {
          create: approvalSteps,
        },
      },
      include: {
        submitter: { select: { id: true, firstName: true, lastName: true } },
        approvalSteps: {
          include: { approver: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { stepOrder: 'asc' },
        },
      },
    });

    return NextResponse.json(
      { message: 'Expense submitted successfully', expense },
      { status: 201 }
    );
  } catch (error) {
    console.error('Submit expense error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
