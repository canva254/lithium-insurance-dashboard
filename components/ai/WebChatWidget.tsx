'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import { API_BASE_URL } from '@/lib/api';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type Props = {
  tenantId?: string;
};

const scrollToBottom = (container: HTMLDivElement | null) => {
  if (!container) return;
  container.scrollTop = container.scrollHeight;
};

export function WebChatWidget({ tenantId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  const handleSend = useCallback(async () => {
    const content = input.trim();
    if (!content) return;

    const optimistic: Message = {
      id: `${Date.now()}`,
      role: 'user',
      content,
    };

    setMessages((prev) => [...prev, optimistic]);
    setInput('');
    scrollToBottom(containerRef.current);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/channels/webchat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, userId: 'preview', message: content }),
      });

      const data = (await response.json()) as { action: string; reply?: string };
      const reply = data.reply?.trim();

      if (reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-assistant`,
            role: 'assistant',
            content: reply,
          },
        ]);
      }
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-error`,
          role: 'assistant',
          content: error?.message ?? 'Unable to reach the AI service. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
      scrollToBottom(containerRef.current);
    }
  }, [input, tenantId, loading]);

  return (
    <div className="flex h-80 w-full flex-col rounded-lg border border-border bg-card shadow-sm">
      <div ref={containerRef} className="flex-1 space-y-3 overflow-y-auto p-3 text-sm">
        {messages.length === 0 && (
          <p className="text-muted-foreground">
            Start a conversation to preview how the agent responds over web chat.
          </p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[80%] rounded-md px-3 py-2 ${
              message.role === 'user' ? 'ml-auto bg-primary text-primary-foreground' : 'bg-muted text-foreground'
            }`}
          >
            {message.content}
          </div>
        ))}
      </div>
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            placeholder="Type a message"
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                if (canSend) {
                  void handleSend();
                }
              }
            }}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60"
            disabled={!canSend}
            onClick={() => {
              if (canSend) {
                void handleSend();
              }
            }}
          >
            {loading ? 'Sending…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default WebChatWidget;
