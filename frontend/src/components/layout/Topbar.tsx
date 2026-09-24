"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Bell, Boxes, CheckCheck, Hexagon, MapPin, RotateCcw, Search } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { timeAgo } from "@/lib/format";
import type { Notification, SearchResults, SystemHealth } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Dot } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

function useOutsideClose(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (q.trim().length < 1) {
      setResults(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setResults(await api.get<SearchResults>(`/search?q=${encodeURIComponent(q.trim())}`));
        setOpen(true);
      } catch {
        setResults(null);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };
  const total = results ? results.hives.length + results.batches.length + results.clusters.length : 0;

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden />
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results && setOpen(true)}
        placeholder="Search hive #, batch ID, floral source, apiary…"
        className="input pl-9 pr-12"
        aria-label="Search"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line-strong px-1.5 text-[10px] text-ink-3 sm:block">Ctrl K</kbd>
      {open && results && (
        <div className="absolute left-0 right-0 top-11 z-50 max-h-96 animate-fade-in overflow-y-auto rounded-xl border border-line bg-surface-2 p-1.5 shadow-pop">
          {total === 0 && <p className="px-3 py-6 text-center text-sm text-ink-3">No matches for “{q}”.</p>}
          {results.hives.map((h) => (
            <button key={`h${h.id}`} onClick={() => go(`/beekeeper/hives/${h.id}`)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-3">
              <Hexagon className="h-4 w-4 text-brand" /> Hive #{h.id}
              <span className="ml-auto text-xs text-ink-3">{h.cluster_name}</span>
            </button>
          ))}
          {results.clusters.map((c) => (
            <button key={`c${c.id}`} onClick={() => go(`/beekeeper/apiary?cluster=${c.id}`)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-3">
              <MapPin className="h-4 w-4 text-info" /> {c.name}
              <span className="ml-auto text-xs text-ink-3">{c.region}</span>
            </button>
          ))}
          {results.batches.map((b) => (
            <button key={`b${b.id}`} onClick={() => go(`/consumer/${b.batch_id}`)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-3">
              <Boxes className="h-4 w-4 text-ink-3" /> <span className="font-mono text-xs">{b.batch_id}</span>
              <span className="ml-auto truncate text-xs text-ink-3">{b.floral_source}{b.is_revoked ? " · revoked" : ""}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Notifications() {
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));
  const { data, refresh } = useApi<Notification[]>("/notifications", { interval: 15000 });
  const unread = data?.filter((n) => !n.is_read).length ?? 0;

  const markAll = async () => {
    await api.post("/notifications/read-all").catch(() => undefined);
    refresh();
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-ink-2 hover:bg-surface-2 hover:text-ink"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-critical px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-[min(22rem,calc(100vw-2rem))] animate-fade-in overflow-hidden rounded-xl border border-line bg-surface-2 shadow-pop">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-sm font-medium">Notifications</span>
            {unread > 0 && (
              <button onClick={markAll} className="inline-flex items-center gap-1 text-xs text-ink-3 hover:text-ink">
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {!data?.length && <li className="px-4 py-8 text-center text-sm text-ink-3">You&apos;re all caught up.</li>}
            {data?.map((n) => (
              <li key={n.id} className="flex gap-3 border-b border-line/60 px-4 py-2.5 last:border-0">
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${n.is_read ? "bg-transparent" : "bg-brand"}`} />
                <div className="min-w-0">
                  <p className={`text-sm ${n.is_read ? "text-ink-3" : "text-ink"}`}>{n.message}</p>
                  <p className="text-xs text-ink-3">{timeAgo(n.timestamp)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ResetDemo() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const reset = async () => {
    setBusy(true);
    try {
      await api.post("/system/reset-demo");
      toast({ kind: "success", title: "Demo data reset", description: "Reloading with a fresh dataset…" });
      setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      toast({ kind: "error", title: "Reset failed", description: e instanceof Error ? e.message : undefined });
      setBusy(false);
    }
  };
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)} title="Reset demo data">
        <RotateCcw className="h-3.5 w-3.5" /> <span className="hidden xl:inline">Reset demo</span>
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Reset demo data?"
        description="All hives, telemetry, batches, alerts and logs will be replaced with the seeded demo dataset."
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="danger" loading={busy} onClick={reset}>Reset data</Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">This cannot be undone. Anything created during this session — minted batches, simulated readings, resolved alerts — will be lost.</p>
      </Modal>
    </>
  );
}

function ConnectionStatus() {
  const { data, error } = useApi<SystemHealth>("/system-health", { interval: 30000 });
  const ok = !!data && !error && data.database === "ONLINE";
  const mode = data?.blockchain_mode === "SEPOLIA" ? "Sepolia" : "Demo ledger";
  return (
    <div className="hidden items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink-2 md:flex" title={error ?? `API ${data?.backend ?? "…"} · DB ${data?.database ?? "…"}`}>
      <Dot tone={ok ? "good" : error ? "critical" : "neutral"} pulse={ok} />
      {error ? "API offline" : data ? mode : "Connecting…"}
    </div>
  );
}

export function Topbar({ menuButton }: { menuButton: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur sm:px-6 lg:px-8">
      {menuButton}
      <GlobalSearch />
      <div className="ml-auto flex items-center gap-1.5">
        <ConnectionStatus />
        <ResetDemo />
        <Notifications />
      </div>
    </header>
  );
}
