'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { useAuth } from '@/context/AuthContext';

export default function Chatbot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    messages: [
      {
        id: 'welcome',
        role: 'assistant',
        parts: [{ type: 'text', text: `Hi ${user?.firstName || 'there'}! 👋 I'm your ReimburseFlow AI assistant powered by Gemini. Ask me anything about expenses, approvals, or features!` }],
        metadata: {},
        createdAt: new Date(),
      }
    ],
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput('');
  };

  const getMessageText = (msg: any): string => {
    if (msg.parts && Array.isArray(msg.parts)) {
      return msg.parts
        .filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join('');
    }
    if (typeof msg.content === 'string') return msg.content;
    return '';
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed', bottom: 24, right: 24, width: 56, height: 56,
          borderRadius: '50%', background: 'linear-gradient(135deg, #714b67, #5a3a52)',
          color: '#fff', border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(113,75,103,0.4)',
          fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.3s ease', zIndex: 999,
          transform: isOpen ? 'rotate(45deg)' : 'none',
        }}
      >
        {isOpen ? '✕' : '🤖'}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div style={{
          position: 'fixed', bottom: 92, right: 24, width: 380, height: 500,
          background: '#fff', borderRadius: 16, boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
          display: 'flex', flexDirection: 'column', zIndex: 998, overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '16px 20px', background: 'linear-gradient(135deg, #714b67, #5a3a52)',
            color: '#fff', display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: '1.25rem' }}>🤖</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>ReimburseFlow AI</div>
              <div style={{ fontSize: '0.6875rem', opacity: 0.8 }}>
                {isLoading ? '⏳ Thinking...' : 'Powered by Gemini'}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: 16,
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            {messages.map((msg: any) => {
              const text = getMessageText(msg);
              if (!text) return null;
              return (
                <div key={msg.id} style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                }}>
                  <div style={{
                    padding: '10px 14px', borderRadius: 12,
                    background: msg.role === 'user' ? '#714b67' : '#f3f4f6',
                    color: msg.role === 'user' ? '#fff' : '#374151',
                    fontSize: '0.8125rem', lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    borderBottomRightRadius: msg.role === 'user' ? 4 : 12,
                    borderBottomLeftRadius: msg.role !== 'user' ? 4 : 12,
                  }}>
                    {text}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div style={{ alignSelf: 'flex-start' }}>
                <div style={{
                  padding: '10px 14px', borderRadius: 12, background: '#f3f4f6',
                  color: '#9ca3af', fontSize: '1rem', letterSpacing: 4,
                }}>
                  ···
                </div>
              </div>
            )}

            {error && (
              <div style={{
                alignSelf: 'flex-start', padding: '8px 12px', borderRadius: 8,
                background: '#fef2f2', color: '#dc2626', fontSize: '0.75rem',
              }}>
                ⚠️ Error: {error.message}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} style={{
            padding: '12px 16px', borderTop: '1px solid #e5e7eb',
            display: 'flex', gap: 8,
          }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              disabled={isLoading}
              style={{
                flex: 1, padding: '10px 14px', border: '1px solid #e5e7eb',
                borderRadius: 8, fontSize: '0.875rem', outline: 'none',
                fontFamily: 'inherit', opacity: isLoading ? 0.6 : 1,
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              style={{
                padding: '10px 16px', background: '#714b67', color: '#fff',
                border: 'none', borderRadius: 8,
                cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                fontWeight: 600, fontSize: '0.875rem',
                opacity: isLoading || !input.trim() ? 0.5 : 1,
              }}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
