import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name is too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name is too long'),
  companyName: z.string().min(1, 'Company name is required').max(100, 'Company name is too long'),
  country: z.string().min(1, 'Country is required'),
  currency: z.string().min(1, 'Currency is required'),
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createUserSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['EMPLOYEE', 'MANAGER'], { message: 'Role must be EMPLOYEE or MANAGER' }),
  managerId: z.string().optional(),
});

export const updateUserSchema = z.object({
  role: z.enum(['EMPLOYEE', 'MANAGER'], { message: 'Role must be EMPLOYEE or MANAGER' }).optional(),
  managerId: z.string().nullable().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
});

export const expenseSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  originalCurrency: z.string().min(1, 'Currency is required'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required').max(500, 'Description is too long'),
  expenseDate: z.string().min(1, 'Date is required'),
  receiptUrl: z.string().optional(),
});

export const approvalRuleSchema = z.object({
  name: z.string().min(1, 'Rule name is required'),
  ruleType: z.enum(['SEQUENTIAL', 'PERCENTAGE', 'SPECIFIC_APPROVER', 'HYBRID']),
  percentThreshold: z.number().min(0).max(100).optional(),
  minAmount: z.number().min(0).optional(),
  maxAmount: z.number().min(0).optional(),
  isManagerFirst: z.boolean().default(true),
  specificApproverId: z.string().optional(),
  steps: z.array(z.object({
    approverId: z.string().min(1, 'Approver is required'),
    roleLabel: z.string().min(1, 'Role label is required'),
    stepOrder: z.number().int().min(1),
  })).min(1, 'At least one approval step is required'),
});

export const approveRejectSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT'], { message: 'Action must be APPROVE or REJECT' }),
  comments: z.string().optional(),
});

export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  try {
    // Zod v4 stores issues as JSON in the message
    const issues = JSON.parse(error.message) as { path: (string | number)[]; message: string }[];
    issues.forEach((issue) => {
      const path = issue.path.join('.') || 'general';
      errors[path] = issue.message;
    });
  } catch {
    errors.general = error.message;
  }
  return errors;
}

