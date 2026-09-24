"use client";
import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Segmented } from "@/components/ui/Tabs";
import { formatDateTime, formatTime, parseDate } from "@/lib/format";
import type { Telemetry } from "@/lib/types";

type Metric = "temperature" | "humidity" | "weight";

const METRICS: Record<Metric, { label: string; unit: string; band?: [number, number]; bandLabel?: string; line?: number; lineLabel?: string }> = {
  temperature: { label: "Temperature", unit: "°C", band: [33.5, 35.5], bandLabel: "Ideal brood range" },
  humidity: { label: "Humidity", unit: "%", band: [40, 65], bandLabel: "Ideal range" },
  weight: { label: "Weight", unit: "kg", line: 30, lineLabel: "Harvest threshold" },
};

const SERIES = "rgb(var(--series))";
const GRID = "rgb(var(--line))";
const AXIS = "rgb(var(--ink-3))";

interface TooltipProps {
  active?: boolean;
  payload?: { value: number; payload: { t: string } }[];
  unit: string;
  label: string;
}

function ChartTooltip({ active, payload, unit, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs shadow-pop">
      <div className="flex items-center gap-2">
        <span className="h-0.5 w-3 rounded" style={{ background: SERIES }} />
        <span className="font-semibold tabular-nums text-ink">{p.value}{unit}</span>
        <span className="text-ink-3">{label}</span>
      </div>
      <div className="mt-1 text-ink-3">{formatDateTime(p.payload.t)}</div>
    </div>
  );
}

export function TelemetryChart({ data }: { data: Telemetry[] }) {
  const [metric, setMetric] = useState<Metric>("temperature");
  const cfg = METRICS[metric];

  const points = useMemo(
    () =>
      [...data]
        .sort((a, b) => (parseDate(a.timestamp)?.getTime() ?? 0) - (parseDate(b.timestamp)?.getTime() ?? 0))
        .slice(-48)
        .map((d) => ({ t: d.timestamp, v: d[metric] })),
    [data, metric],
  );

  const domain = useMemo<[number, number]>(() => {
    const vals = points.map((p) => p.v);
    const lo = Math.min(...vals, cfg.band?.[0] ?? Infinity, cfg.line ?? Infinity);
    const hi = Math.max(...vals, cfg.band?.[1] ?? -Infinity, cfg.line ?? -Infinity);
    const pad = Math.max(0.5, (hi - lo) * 0.12);
    return [Math.floor(lo - pad), Math.ceil(hi + pad)];
  }, [points, cfg]);

  const latest = points[points.length - 1];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={metric}
          onChange={setMetric}
          options={(Object.keys(METRICS) as Metric[]).map((m) => ({ value: m, label: `${METRICS[m].label} (${METRICS[m].unit})` }))}
        />
        {latest && (
          <p className="text-xs text-ink-3">
            Latest <span className="font-semibold tabular-nums text-ink">{latest.v}{cfg.unit}</span> · {points.length} readings
          </p>
        )}
      </div>
      {points.length < 2 ? (
        <p className="py-16 text-center text-sm text-ink-3">Not enough readings to plot yet.</p>
      ) : (
        <div className="h-64 w-full" role="img" aria-label={`${cfg.label} over time, latest ${latest?.v}${cfg.unit}`}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <defs>
                <linearGradient id="seriesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SERIES} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={SERIES} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID} strokeDasharray="2 4" vertical={false} />
              {cfg.band && (
                <ReferenceArea y1={cfg.band[0]} y2={cfg.band[1]} fill="rgb(var(--good))" fillOpacity={0.06} stroke="none"
                  label={{ value: cfg.bandLabel, position: "insideTopLeft", fill: AXIS, fontSize: 10 }} />
              )}
              {cfg.line !== undefined && (
                <ReferenceLine y={cfg.line} stroke="rgb(var(--brand))" strokeDasharray="4 4"
                  label={{ value: cfg.lineLabel, position: "insideTopLeft", fill: AXIS, fontSize: 10 }} />
              )}
              <XAxis dataKey="t" tickFormatter={formatTime} stroke={AXIS} fontSize={11} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={40} />
              <YAxis domain={domain} stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => `${v}`} />
              <Tooltip content={<ChartTooltip unit={cfg.unit} label={cfg.label} />} cursor={{ stroke: AXIS, strokeWidth: 1 }} />
              <Area type="monotone" dataKey="v" stroke={SERIES} strokeWidth={2} fill="url(#seriesFill)" dot={false}
                activeDot={{ r: 4, stroke: "rgb(var(--surface))", strokeWidth: 2 }} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
