import { hiveStatusMeta, toneClasses } from "@/lib/status";
import type { HiveStatus } from "@/lib/types";

const ORDER: HiveStatus[] = ["HEALTHY", "WATCH", "WARNING", "CRITICAL"];

/** Part-to-whole of hive statuses: one stacked bar + a labelled legend (identity never by color alone). */
export function StatusDistribution({ counts }: { counts: Record<HiveStatus, number> }) {
  const total = ORDER.reduce((s, k) => s + (counts[k] || 0), 0);
  return (
    <div>
      <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-surface-3" role="img"
        aria-label={ORDER.map((k) => `${hiveStatusMeta[k].label} ${counts[k] || 0}`).join(", ")}>
        {total > 0 &&
          ORDER.filter((k) => counts[k]).map((k) => (
            <div key={k} className={`${toneClasses[hiveStatusMeta[k].tone].dot} first:rounded-l-full last:rounded-r-full`}
              style={{ width: `${(counts[k] / total) * 100}%` }} title={`${hiveStatusMeta[k].label}: ${counts[k]}`} />
          ))}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2">
        {ORDER.map((k) => {
          const m = hiveStatusMeta[k];
          return (
            <div key={k} className="flex items-center gap-2 text-xs">
              <m.icon className={`h-3.5 w-3.5 ${toneClasses[m.tone].text}`} aria-hidden />
              <dt className="text-ink-2">{m.label}</dt>
              <dd className="ml-auto font-semibold tabular-nums text-ink">
                {counts[k] || 0}
                <span className="ml-1 font-normal text-ink-3">{total ? Math.round(((counts[k] || 0) / total) * 100) : 0}%</span>
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
