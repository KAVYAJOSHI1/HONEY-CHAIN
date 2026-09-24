import type { ReactNode } from "react";
import { AlertCircle, Inbox, RefreshCw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "./Button";

export function EmptyState({ icon: Icon = Inbox, title, children, action }: { icon?: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 rounded-full bg-surface-2 p-3 text-ink-3">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <p className="text-sm font-medium text-ink">{title}</p>
      {children && <p className="mt-1 max-w-sm text-xs text-ink-3">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card flex flex-col items-center gap-3 border-critical/30 px-6 py-10 text-center">
      <AlertCircle className="h-6 w-6 text-critical" aria-hidden />
      <div>
        <p className="text-sm font-medium text-ink">Couldn&apos;t load data</p>
        <p className="mt-1 max-w-md text-xs text-ink-3">{message}</p>
      </div>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </Button>
      )}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface-2 ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[104px]" />
        ))}
      </div>
      <Skeleton className="h-72" />
      <Skeleton className="h-56" />
    </div>
  );
}
