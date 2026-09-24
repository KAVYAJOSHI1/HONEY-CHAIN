/** Ranked horizontal bars for magnitude by category — single hue, value in text ink, hover title per bar. */
export function BarList({ items, unit, max }: { items: { label: string; value: number; sub?: string }[]; unit?: string; max?: number }) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.label} title={`${i.label}: ${i.value}${unit ?? ""}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate text-ink-2">{i.label}</span>
            <span className="shrink-0 tabular-nums text-ink">
              <span className="font-semibold">{i.value.toLocaleString()}</span>
              {unit && <span className="ml-0.5 text-ink-3">{unit}</span>}
              {i.sub && <span className="ml-2 text-ink-3">{i.sub}</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-series" style={{ width: `${Math.max(2, (i.value / top) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
