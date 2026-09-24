"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { Bot, Loader2, Send, X } from "lucide-react";
import { api } from "@/lib/api";

interface Message { sender: "user" | "bot"; text: string }

const INITIAL_CHIPS = ["Unhealthy hives", "Harvest ready", "Varroa risk", "Today's alerts", "Batch verification"];

export default function HoneyBot() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [chips, setChips] = useState(INITIAL_CHIPS);
  const [messages, setMessages] = useState<Message[]>([
    { sender: "bot", text: "Hi — I'm HoneyBot. Ask about hive health, Varroa risk, harvest readiness, open alerts, batch verification, or a specific hive (e.g. “hive 4”)." },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Operator assistant — not shown on public consumer pages.
  if (pathname === "/" || pathname.startsWith("/consumer") || pathname.startsWith("/verify")) return null;

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    setMessages((m) => [...m, { sender: "user", text: q }]);
    setQuery("");
    setLoading(true);
    try {
      const data = await api.post<{ reply: string; chips?: string[] }>("/honeybot/query", { query: q });
      setMessages((m) => [...m, { sender: "bot", text: data.reply }]);
      if (data.chips?.length) setChips(data.chips);
    } catch (e) {
      setMessages((m) => [...m, { sender: "bot", text: e instanceof Error ? e.message : "Something went wrong." }]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(query);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="no-print fixed bottom-5 right-5 z-[900] flex h-12 items-center gap-2 rounded-full border border-brand/40 bg-surface-2 pl-3 pr-4 text-sm font-medium text-ink shadow-pop transition hover:border-brand"
        aria-label="Open HoneyBot assistant"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-canvas">
          <Bot className="h-4 w-4" />
        </span>
        <span className="hidden sm:inline">Ask HoneyBot</span>
      </button>
    );
  }

  return (
    <div className="no-print fixed inset-x-3 bottom-3 z-[900] flex h-[min(520px,80vh)] animate-fade-in flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-pop sm:inset-x-auto sm:right-5 sm:w-96">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-canvas">
          <Bot className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">HoneyBot</p>
          <p className="text-xs text-ink-3">Answers from live apiary data</p>
        </div>
        <button onClick={() => setOpen(false)} className="rounded-md p-1 text-ink-3 hover:bg-surface-2 hover:text-ink" aria-label="Close HoneyBot">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[88%] whitespace-pre-line rounded-2xl px-3 py-2 leading-relaxed ${
                m.sender === "user" ? "rounded-br-sm bg-brand text-canvas" : "rounded-bl-sm border border-line bg-surface-2 text-ink-2"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-ink-3">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyzing apiary data…
          </div>
        )}
      </div>

      <div className="flex gap-1.5 overflow-x-auto border-t border-line px-3 py-2">
        {chips.map((chip) => (
          <button
            key={chip}
            onClick={() => send(chip)}
            disabled={loading}
            className="whitespace-nowrap rounded-full border border-line-strong px-2.5 py-1 text-xs text-ink-2 hover:border-brand/60 hover:text-ink disabled:opacity-50"
          >
            {chip}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="flex gap-2 border-t border-line p-3">
        <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ask about your hives…" className="input" aria-label="Message HoneyBot" maxLength={500} />
        <button type="submit" disabled={loading || !query.trim()} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-canvas disabled:opacity-40" aria-label="Send">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
