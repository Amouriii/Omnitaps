import { FormEvent, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { ApiError, apiRequest } from "../../../lib/apiClient";

type ChatWidgetProps = {
  tenantId: string;
  className?: string;
};

type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatWidget({ tenantId, className = "" }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      role: "assistant",
      content: "Hi — ask about hours, the menu, or Wi‑Fi and we will help.",
    },
  ]);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || sending) return;

    setSending(true);
    setError("");
    setInput("");
    setTurns((current) => [...current, { role: "user", content: message }]);

    try {
      const result = await apiRequest("/api/chatbot/message", {
        method: "POST",
        body: {
          tenantId,
          message,
          conversationId,
        },
      });

      if (result?.conversationId) {
        setConversationId(result.conversationId);
      }

      setTurns((current) => [
        ...current,
        {
          role: "assistant",
          content: result?.reply || "Thanks — we received your message.",
        },
      ]);
    } catch (err) {
      const messageText =
        err instanceof ApiError
          ? err.code === "CHATBOT_NOT_FOUND"
            ? "Chat is not enabled for this business yet."
            : err.code === "DB_UNAVAILABLE"
              ? "Chat is temporarily unavailable."
              : err.message
          : "Unable to send your message.";
      setError(messageText);
      setTurns((current) => [
        ...current,
        {
          role: "assistant",
          content: messageText,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={`fixed bottom-5 right-5 z-50 ${className}`}>
      {open ? (
        <div className="flex h-[28rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-3xl border border-hairline bg-surface shadow-[0_28px_60px_-30px_rgba(18,21,26,0.45)]">
          <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-tap">Support</p>
              <p className="text-[14px] font-semibold text-ink">Ask OmniTaps</p>
            </div>
            <button
              type="button"
              aria-label="Close chat"
              className="rounded-full p-2 text-ink-muted hover:bg-porcelain hover:text-ink"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" role="log" aria-live="polite" aria-relevant="additions">
            {turns.map((turn, index) => (
              <div
                key={`${turn.role}-${index}`}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-[1.6] ${
                  turn.role === "user"
                    ? "ml-auto bg-ink text-white"
                    : "bg-porcelain text-ink"
                }`}
              >
                <span className="sr-only">{turn.role === "user" ? "You: " : "Assistant: "}</span>
                {turn.content}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-hairline p-3">
            {error ? (
              <p className="mb-2 text-[12px] text-red-700" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor={`chat-input-${tenantId}`}>
                Message
              </label>
              <input
                id={`chat-input-${tenantId}`}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                className="min-w-0 flex-1 rounded-2xl border border-hairline bg-porcelain px-3 py-2.5 text-[14px] text-ink placeholder:text-ink-faint focus:border-tap focus:outline-none"
                placeholder="Ask a question…"
                maxLength={2000}
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || !input.trim()}
                aria-label="Send message"
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-tap text-white disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-3 text-[14px] font-semibold text-white shadow-[0_18px_40px_-22px_rgba(18,21,26,0.55)]"
        >
          <MessageCircle className="h-4 w-4" />
          Chat
        </button>
      )}
    </div>
  );
}
