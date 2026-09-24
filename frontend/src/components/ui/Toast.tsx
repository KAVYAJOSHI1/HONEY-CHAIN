"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type Kind = "success" | "error" | "info";
interface Toast { id: number; kind: Kind; title: string; description?: string }

const ToastContext = createContext<(t: Omit<Toast, "id">) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

const styles: Record<Kind, { icon: typeof Info; cls: string }> = {
  success: { icon: CheckCircle2, cls: "text-good" },
  error: { icon: AlertCircle, cls: "text-critical" },
  info: { icon: Info, cls: "text-info" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 5000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed left-1/2 top-16 z-[1100] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2 sm:left-auto sm:right-4 sm:translate-x-0" aria-live="polite">
        {toasts.map((t) => {
          const S = styles[t.kind];
          return (
            <div key={t.id} className="pointer-events-auto flex animate-fade-in items-start gap-3 rounded-xl border border-line bg-surface-2 p-3 shadow-pop">
              <S.icon className={`mt-0.5 h-4 w-4 shrink-0 ${S.cls}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{t.title}</p>
                {t.description && <p className="mt-0.5 break-words text-xs text-ink-3">{t.description}</p>}
              </div>
              <button onClick={() => dismiss(t.id)} className="text-ink-3 hover:text-ink" aria-label="Dismiss">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
