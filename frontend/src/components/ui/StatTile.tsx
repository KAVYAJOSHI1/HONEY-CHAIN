import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { toneClasses, type Tone } from "@/lib/status";

export function StatTile({
  label,
  value,
  unit,
  hint,
  icon: Icon,
  tone,
  loading,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  loading?: boolean;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span className="label">{label}</span>
        {Icon && (
          <span className={`rounded-md p-1.5 ${tone ? `${toneClasses[tone].bg} ${toneClasses[tone].text}` : "bg-surface-2 text-ink-3"}`}>
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        {loading ? (
          <span className="h-7 w-16 animate-pulse rounded bg-surface-3" />
        ) : (
          <span className="text-2xl font-semibold tabular-nums tracking-tight text-ink">{value}</span>
        )}
        {unit && !loading && <span className="text-sm text-ink-3">{unit}</span>}
      </div>
      {hint && <div className="mt-1 text-xs text-ink-3">{hint}</div>}
    </div>
  );
}
