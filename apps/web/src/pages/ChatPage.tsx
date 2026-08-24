import { useRef, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { API_BASE } from '@/lib/env';
import { getAccessToken } from '@/lib/authStore';
import { useOutletContext } from 'react-router-dom';
import type { AppOutletContext } from '@/components/layout/AppShell';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export function ChatPage() {
  const { refreshCredits } = useOutletContext<AppOutletContext>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [useStream, setUseStream] = useState(true);
  const sessionId = useRef(crypto.randomUUID());

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', text };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setStreaming(true);

    const history = [...messages, userMsg].map((m) => ({ role: m.role, text: m.text }));

    try {
      if (useStream) {
        const assistantId = crypto.randomUUID();
        setMessages((m) => [...m, { id: assistantId, role: 'assistant', text: '' }]);

        const res = await fetch(`${API_BASE}/gateway/chat`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getAccessToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'stream',
            query: text,
            sessionId: sessionId.current,
            messages: history,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { message?: string }).message || `HTTP ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No stream body');

        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === '[DONE]') continue;
            try {
              const parsed = JSON.parse(payload) as { text?: string; content?: string; message?: string };
              const chunk = parsed.text || parsed.content || parsed.message || '';
              if (chunk) {
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantId ? { ...m, text: m.text + chunk } : m)),
                );
              }
            } catch {
              if (payload && !payload.startsWith('{')) {
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantId ? { ...m, text: m.text + payload } : m)),
                );
              }
            }
          }
        }
      } else {
        const res = await fetch(`${API_BASE}/gateway/chat`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getAccessToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'chat',
            query: text,
            sessionId: sessionId.current,
            messages: history,
          }),
        });
        const data = (await res.json()) as { message?: string; data?: { text?: string; reply?: string } };
        if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
        const reply =
          data.data?.text ||
          data.data?.reply ||
          (typeof data.data === 'string' ? data.data : '') ||
          JSON.stringify(data.data ?? data);
        setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'assistant', text: String(reply) }]);
      }
      await refreshCredits();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Chat failed');
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] max-w-3xl flex-col">
      <Card className="flex flex-1 flex-col overflow-hidden">
        <CardHeader className="border-b border-border py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Chat</CardTitle>
            <label className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={useStream}
                onChange={(e) => setUseStream(e.target.checked)}
              />
              Stream SSE
            </label>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden p-0">
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <p className="py-12 text-center text-sm text-muted">
                Hỏi bất cứ điều gì — messages[] được gửi theo yêu cầu upstream.
              </p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
                  m.role === 'user'
                    ? 'ml-auto bg-primary text-primary-foreground'
                    : 'bg-accent text-foreground',
                )}
              >
                {m.text || (streaming && m.role === 'assistant' ? '…' : '')}
              </div>
            ))}
          </div>
          <div className="flex gap-2 border-t border-border p-4">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập tin nhắn…"
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), void send())}
              disabled={streaming}
            />
            <Button size="icon" onClick={() => void send()} disabled={streaming || !input.trim()}>
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
