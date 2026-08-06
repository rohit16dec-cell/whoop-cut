import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listChatMessages, sendChatMessage, type ChatMessage } from "@/lib/chat.functions";

export function CoachChatSection({
  whoop,
  refreshKey,
}: {
  whoop: { strain: number | null; recovery: number | null; calories: number | null } | null;
  refreshKey: number;
}) {
  const listFn = useServerFn(listChatMessages);
  const sendFn = useServerFn(sendChatMessage);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      setMessages(await listFn());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [listFn]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, sending]);

  const send = async () => {
    const content = input.trim();
    if (!content || sending) return;
    setInput("");
    setError(null);
    setSending(true);
    setMessages((prev) => [
      ...prev,
      { id: `tmp-${Date.now()}`, role: "user", content, created_at: new Date().toISOString() },
    ]);
    try {
      await sendFn({ data: { content, whoop } });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      await load();
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="w-full rounded-lg border p-4">
      <h2 className="mb-3 text-lg font-semibold">Coach Chat</h2>

      <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ask your coach anything — meal ideas, whether to train today, or how to hit your deficit.
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))
        )}

        {sending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
              <span className="ml-2">Coach is thinking…</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex items-end gap-2">
        <textarea
          ref={inputRef}
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Message your coach…"
          className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={sending || input.trim().length === 0}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>

      {error && (
        <p className="mt-3 whitespace-pre-wrap break-words rounded-md bg-red-50 p-2 text-xs text-red-800 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
