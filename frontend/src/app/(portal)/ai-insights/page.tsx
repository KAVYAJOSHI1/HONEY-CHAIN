"use client";
import { useState } from "react";
import Link from "next/link";
import { Activity, Bug, CheckCircle2, Lightbulb, TrendingDown, TrendingUp, Minus, Wheat } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { formatDate, num } from "@/lib/format";
import { scoreTone, toneClasses } from "@/lib/status";
import type { AiInsights } from "@/lib/types";
import { Badge, HiveStatusBadge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/ui/States";
import { StatTile } from "@/components/ui/StatTile";
import { Segmented } from "@/components/ui/Tabs";

export default function AiInsightsPage() {
  const { data, error, refresh } = useApi<AiInsights>("/ai-insights", { interval: 30000 });
  const [priority, setPriority] = useState<"ALL" | "HIGH" | "MEDIUM">("ALL");

  if (error && !data) return <ErrorState message={error} onRetry={refresh} />;
  if (!data) return <PageSkeleton />;

  const hives = data.hive_intelligence;
  const atRisk = hives.filter((h) => h.status === "WARNING" || h.status === "CRITICAL").length;
  const avg = hives.length ? Math.round(hives.reduce((s, h) => s + h.health_score, 0) / hives.length) : 0;
  const varroaRisk = data.disease_intelligence.filter((d) => d.varroa_count > 5).length;
  const totalYield = data.productivity_intelligence.reduce((s, p) => s + p.predicted_yield_kg, 0);
  const recs = data.recommendations.filter((r) => priority === "ALL" || r.priority === priority);

  return (
    <>
      <PageHeader
        title="AI insights"
        description="Fleet-wide intelligence combining IoT telemetry rules, the IsolationForest anomaly model and frame-inspection results."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Average health" value={avg} unit="/100" icon={Activity} tone={scoreTone(avg)} />
        <StatTile label="Hives at risk" value={atRisk} unit={`of ${hives.length}`} icon={Activity} tone={atRisk ? "serious" : "good"} hint="Warning or critical" />
        <StatTile label="Varroa risk" value={varroaRisk} unit="hives" icon={Bug} tone={varroaRisk ? "critical" : "good"} hint="> 5 mites on latest frame" />
        <StatTile label="Forecast yield" value={num(totalYield, 0)} unit="kg" icon={Wheat} tone="brand" hint="Harvestable honey, all hives" />
      </div>

      <Card className="mb-6">
        <CardHeader
          icon={<Lightbulb className="h-4 w-4" />}
          title="Recommended actions"
          description={`${data.recommendations.length} high and medium priority`}
          action={
            <Segmented
              value={priority}
              onChange={setPriority}
              options={[
                { value: "ALL", label: "All", count: data.recommendations.length },
                { value: "HIGH", label: "High", count: data.recommendations.filter((r) => r.priority === "HIGH").length },
                { value: "MEDIUM", label: "Medium", count: data.recommendations.filter((r) => r.priority === "MEDIUM").length },
              ]}
            />
          }
        />
        {recs.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Nothing to action">All colonies are within healthy baselines.</EmptyState>
        ) : (
          <div className="grid gap-px bg-line/60 sm:grid-cols-2 xl:grid-cols-3">
            {recs.map((r) => (
              <div key={r.id} className="bg-surface p-5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Badge tone={r.priority === "HIGH" ? "critical" : "warn"}>{r.priority === "HIGH" ? "High" : "Medium"} priority</Badge>
                  <Link href={`/beekeeper/hives/${r.hive_id}`} className="text-xs text-ink-3 hover:text-brand">Hive #{r.hive_id} →</Link>
                </div>
                <p className="text-sm font-medium">{r.title}</p>
                <p className="mt-1 text-xs text-ink-3">{r.explanation}</p>
                <ul className="mt-3 space-y-1">
                  {r.actions.map((a) => (
                    <li key={a} className="flex items-start gap-2 text-xs text-ink-2">
                      <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-ink-3" /> {a}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[11px] text-ink-3">Source: {r.source}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader icon={<Activity className="h-4 w-4" />} title="Health ranking" description="Lowest scores first, with the factors driving each score" />
          <div className="overflow-x-auto">
            <table className="table-base min-w-[640px]">
              <thead><tr><th>Hive</th><th>Status</th><th className="text-right">Score</th><th>Explanation</th></tr></thead>
              <tbody>
                {hives.map((h) => (
                  <tr key={h.hive_id}>
                    <td>
                      <Link href={`/beekeeper/hives/${h.hive_id}`} className="font-medium hover:text-brand">Hive #{h.hive_id}</Link>
                      <div className="text-xs text-ink-3">{h.cluster_name}</div>
                    </td>
                    <td><HiveStatusBadge status={h.status} /></td>
                    <td className={`text-right font-semibold tabular-nums ${toneClasses[scoreTone(h.health_score)].text}`}>{h.health_score}</td>
                    <td className="text-xs text-ink-2">{h.score_explanation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader icon={<Bug className="h-4 w-4" />} title="Varroa surveillance" description="Latest frame inspection per hive" />
            {data.disease_intelligence.length === 0 ? (
              <EmptyState title="No inspections recorded" />
            ) : (
              <ul className="divide-y divide-line/60">
                {data.disease_intelligence.map((d) => (
                  <li key={d.hive_id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div>
                      <Link href={`/beekeeper/hives/${d.hive_id}`} className="text-sm font-medium hover:text-brand">Hive #{d.hive_id}</Link>
                      <p className="text-xs text-ink-3">{d.infection_rate}% infestation · {formatDate(d.timestamp)}</p>
                    </div>
                    <Badge tone={d.varroa_count > 5 ? "critical" : d.varroa_count > 3 ? "warn" : "good"} icon={Bug}>{d.varroa_count} mites</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader icon={<Wheat className="h-4 w-4" />} title="Yield forecast" description="Heaviest hives first" />
            <ul className="max-h-[420px] divide-y divide-line/60 overflow-y-auto">
              {data.productivity_intelligence.map((p) => {
                const Icon = p.trend === "INCREASING" ? TrendingUp : p.trend === "DECREASING" ? TrendingDown : Minus;
                return (
                  <li key={p.hive_id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div>
                      <Link href={`/beekeeper/hives/${p.hive_id}`} className="text-sm font-medium hover:text-brand">Hive #{p.hive_id}</Link>
                      <p className="flex items-center gap-1 text-xs text-ink-3"><Icon className="h-3 w-3" /> {num(p.current_weight_kg)} kg · {p.harvest_window}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">{num(p.predicted_yield_kg)} kg</p>
                      {p.harvest_ready && <Badge tone="brand">Ready</Badge>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
