"use client";

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = "sm",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex max-w-full overflow-x-auto rounded-lg border border-line bg-canvas p-0.5" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors ${size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-sm"} ${
            value === o.value ? "bg-surface-3 text-ink shadow-sm" : "text-ink-3 hover:text-ink"
          }`}
        >
          {o.label}
          {o.count !== undefined && <span className="rounded bg-surface-2 px-1 text-[10px] tabular-nums text-ink-3">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
