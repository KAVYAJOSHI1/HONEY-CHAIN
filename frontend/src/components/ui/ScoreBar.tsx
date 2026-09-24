import { scoreTone, toneClasses } from "@/lib/status";

/** Horizontal 0–100 meter. Value label sits in text ink; the bar carries the status tone. */
export function ScoreBar({ label, value }: { label: string; value: number }) {
  const tone = scoreTone(value);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-ink-2">{label}</span>
        <span className="tabular-nums font-medium text-ink">{Math.round(value)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-3" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={`h-full rounded-full ${toneClasses[tone].dot}`} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}
