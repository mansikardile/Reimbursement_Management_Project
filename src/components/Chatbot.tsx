'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const SMART_RESPONSES: { patterns: RegExp[]; response: string | ((ctx: Record<string, string>) => string) }[] = [
  {
    patterns: [/how.*submit.*expense/i, /new.*expense/i, /create.*expense/i],
    response: '📝 To submit an expense:\n\n1. Go to **Submit Expense** in the sidebar\n2. Fill in amount, category, description, and date\n3. You can upload a receipt for OCR auto-fill\n4. Select the currency (it auto-converts)\n5. Click **Submit**\n\nYour expense will be routed through the approval chain!',
  },
  {
    patterns: [/expense.*status/i, /check.*status/i, /where.*expense/i, /track/i],
    response: '📊 To check your expense status:\n\n1. Go to **My Expenses** in the sidebar\n2. Use the filter buttons (Pending, In Review, Approved, Rejected)\n3. Each expense shows a progress bar indicating which approval step it\'s at\n\nStatuses: **Pending** → **In Review** → **Approved/Rejected**',
  },
  {
    patterns: [/approval.*rule/i, /configure.*approval/i, /set.*approval/i],
    response: '⚙️ Approval rules define how expenses get approved.\n\n**Types:**\n• **Sequential** – Each approver in order\n• **Percentage** – Auto-approve when X% approve\n• **Specific Approver** – Auto-approve if a specific person approves\n• **Hybrid** – Combination of percentage + specific approver\n\nAdmins can configure these in **Approval Rules** page.',
  },
  {
    patterns: [/ocr/i, /scan.*receipt/i, /upload.*receipt/i, /receipt/i],
    response: '📸 Our OCR feature uses Tesseract.js to scan receipts:\n\n1. In **Submit Expense**, click the receipt scanner panel\n2. Upload a photo of your receipt\n3. The system auto-extracts amount, date, and description\n4. Review and adjust the auto-filled fields\n5. Submit your expense!\n\n*Tip: Clear, well-lit photos work best!*',
  },
  {
    patterns: [/currency/i, /convert/i, /exchange/i],
    response: '🌍 **Multi-Currency Support:**\n\n• Your company has a default currency set during signup\n• When submitting expenses, you can select any currency\n• The system auto-converts using real-time exchange rates\n• Managers always see amounts in the company currency\n\nExchange rates are fetched from exchangerate-api.com',
  },
  {
    patterns: [/role/i, /permission/i, /access/i],
    response: (ctx) => `👤 **Role Permissions:**\n\n• **Admin** – Full access: manage users, rules, override approvals, view all expenses\n• **Manager** – Approve/reject expenses, view team expenses\n• **Employee** – Submit expenses, view own expenses\n\nYour current role: **${ctx.role || 'Unknown'}**`,
  },
  {
    patterns: [/hello/i, /hi\b/i, /hey/i, /good\s*(morning|afternoon|evening)/i],
    response: (ctx) => `👋 Hello ${ctx.name || 'there'}! I'm your ReimburseFlow assistant. I can help with:\n\n• Submitting expenses\n• Checking expense status\n• Understanding approval rules\n• Using OCR receipt scanning\n• Currency conversion\n• Role permissions\n\nWhat would you like to know?`,
  },
  {
    patterns: [/help/i, /what.*can.*do/i, /guide/i],
    response: '🤖 I can help you with:\n\n1. 📝 **Submitting expenses** – How to create new expenses\n2. 📊 **Expense status** – Track your expense approvals\n3. ⚙️ **Approval rules** – Understanding approval workflows\n4. 📸 **Receipt OCR** – Scanning receipts\n5. 🌍 **Currency** – Multi-currency support\n6. 👤 **Roles** – Understanding permissions\n\nJust ask me about any of these topics!',
  },
  {
    patterns: [/manager/i, /team/i],
    response: '👥 **Manager Features:**\n\n• View pending approvals in the **Approvals** tab\n• See team expenses and their statuses\n• Approve or reject with comments\n• Expenses auto-advance to the next approver in the chain\n\nManagers can also submit their own expenses!',
  },
];

export default function Chatbot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `Hi ${user?.firstName || 'there'}! 👋 I'm your ReimburseFlow AI assistant. Ask me anything about expenses, approvals, or features!`,
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getResponse = (text: string): string => {
    const ctx = { name: user?.firstName || '', role: user?.role || '' };

    for (const sr of SMART_RESPONSES) {
      for (const pattern of sr.patterns) {
        if (pattern.test(text)) {
          return typeof sr.response === 'function' ? sr.response(ctx) : sr.response;
        }
      }
    }

    return `I'm not sure about that, but I can help with:\n• Submitting expenses\n• Checking status\n• Approval rules\n• OCR receipts\n• Currency conversion\n• Role permissions\n\nTry asking about one of these topics! 💡`;
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), text: input, sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    setTimeout(() => {
      const botMsg: Message = { id: (Date.now() + 1).toString(), text: getResponse(input), sender: 'bot', timestamp: new Date() };
      setMessages(prev => [...prev, botMsg]);
    }, 500);
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed', bottom: 24, right: 24, width: 56, height: 56,
          borderRadius: '50%', background: 'linear-gradient(135deg, #714b67, #5a3a52)',
          color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(113,75,103,0.4)',
          fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.3s ease', zIndex: 999, transform: isOpen ? 'rotate(45deg)' : 'none',
        }}
      >
        {isOpen ? '✕' : '🤖'}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div style={{
          position: 'fixed', bottom: 92, right: 24, width: 380, height: 500,
          background: '#fff', borderRadius: 16, boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
          display: 'flex', flexDirection: 'column', zIndex: 998,
          animation: 'slideUp 0.3s ease',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '16px 20px', background: 'linear-gradient(135deg, #714b67, #5a3a52)',
            color: '#fff', display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: '1.25rem' }}>🤖</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>ReimburseFlow AI</div>
              <div style={{ fontSize: '0.6875rem', opacity: 0.8 }}>Always here to help</div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map(msg => (
              <div key={msg.id} style={{
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
              }}>
                <div style={{
                  padding: '10px 14px', borderRadius: 12,
                  background: msg.sender === 'user' ? '#714b67' : '#f3f4f6',
                  color: msg.sender === 'user' ? '#fff' : '#374151',
                  fontSize: '0.8125rem', lineHeight: 1.5,
                  whiteSpace: 'pre-line',
                  borderBottomRightRadius: msg.sender === 'user' ? 4 : 12,
                  borderBottomLeftRadius: msg.sender === 'bot' ? 4 : 12,
                }}>
                  {msg.text}
                </div>
                <div style={{ fontSize: '0.625rem', color: '#9ca3af', marginTop: 4, textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '12px 16px', borderTop: '1px solid #e5e7eb',
            display: 'flex', gap: 8,
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask me anything..."
              style={{
                flex: 1, padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 8,
                fontSize: '0.875rem', outline: 'none', fontFamily: 'inherit',
              }}
            />
            <button onClick={handleSend} style={{
              padding: '10px 16px', background: '#714b67', color: '#fff', border: 'none',
              borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
            }}>
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
