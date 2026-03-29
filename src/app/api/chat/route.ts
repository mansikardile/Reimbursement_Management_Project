import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  const body = await req.json();

  // AI SDK v3 sends messages in UIMessage format with parts[]
  // Convert parts-based UIMessages to CoreMessage format for streamText
  const rawMessages = body.messages ?? [];

  const messages = rawMessages
    .filter((m: any) => m.role === 'user' || m.role === 'assistant')
    .map((m: any) => {
      // Handle parts format (AI SDK v3 UIMessage)
      if (Array.isArray(m.parts)) {
        const text = m.parts
          .filter((p: any) => p.type === 'text')
          .map((p: any) => p.text)
          .join('');
        return { role: m.role as 'user' | 'assistant', content: text };
      }
      // Handle plain content string
      return { role: m.role as 'user' | 'assistant', content: m.content ?? '' };
    })
    .filter((m: any) => m.content.length > 0);

  const result = streamText({
    model: google('gemini-1.5-pro-latest'),
    system: `You are the ReimburseFlow AI Assistant. You are a helpful, professional, and friendly chatbot embedded in an internal company tool.

Your primary duties are helping employees and managers with:
1. Submitting expenses (Employees must go to 'Submit Expense', fill details, use OCR for receipts).
2. Checking expense status (Pending -> In Review -> Approved/Rejected).
3. Understanding Approval Rules (Sequential, Percentage, Specific Approver, Hybrid).
4. Explaining Currency rules (Multi-currency support, auto-converts to company default using real-time rates).
5. Clarifying Roles (Admin = full access, Manager = approve/reject team expenses, Employee = submit own).

If the user says 'hello' or asks what you can do, give a brief, friendly summary of these 5 points. Never make up company policies. Keep responses concise and use bullet points where helpful.`,
    messages,
  });

  return result.toDataStreamResponse();
}
