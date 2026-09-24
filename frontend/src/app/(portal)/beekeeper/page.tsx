"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Boxes, CloudRain, Droplets, Hexagon, Scale, Sun, ThermometerSnowflake, Wand2, Wheat } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { num, timeAgo } from "@/lib/format";
import { hiveMeta, scoreTone, toneClasses } from "@/lib/status";
import type { Alert, Hive, HiveStatus, Kpis } from "@/lib/types";
import { Badge, HiveStatusBadge, SeverityBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/ui/States";
import { StatTile } from "@/components/ui/StatTile";
import { Segmented } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";

const SCENARIOS = [
  { id: "NORMAL", label: "Normal reading", hint: "Ideal ranges", icon: Hexagon },
  { id: "HIGH_TEMPERATURE", label: "Heatwave", hint: "Temp > 38 °C", icon: Sun },
  { id: "LOW_TEMPERATURE", label: "Cold snap", hint: "Temp < 32 °C", icon: ThermometerSnowflake },
  { id: "HIGH_HUMIDITY", label: "Moisture spike", hint: "Humidity > 70 %", icon: CloudRain },
  { id: "WEIGHT_INCREASE", label: "Nectar flow", hint: "Crosses 30 kg", icon: Wheat },
  { id: "WEIGHT_DROP", label: "Swarm / robbing", hint: "−3 kg drop", icon: Scale },
];

type Filter = "ALL" | HiveStatus;

function Simulator({ hives, onDone }: { hives: Hive[]; onDone: () => void }) {
  const [target, setTarget] = useState<number>(hives[0]?.id ?? 1);
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();

  const run = async (scenario: string, label: string) => {
    setBusy(scenario);
    try {
      const res = await api.post<{ alerts_generated: number; hive_status: string; telemetry: { temperature: number; humidity: number; weight: number } }>(
        "/simulate-scenario",
        { hive_id: target, scenario },
      );
      const t = res.telemetry;
      toast({
        kind: res.alerts_generated ? "info" : "success",
        title: `${label} → Hive #${target}`,
        description: `${t.temperature} °C · ${t.humidity}% · ${t.weight} kg — ${res.alerts_generated} alert(s), status ${hiveMeta(res.hive_status).label.toLowerCase()}`,
      });
      onDone();
    } catch (e) {
      toast({ kind: "error", title: "Simulation failed", description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardHeader
        icon={<Wand2 className="h-4 w-4" />}
        title="Sensor simulator"
        description="Push a simulated ESP32 reading to test alerts, health scoring and harvest logic."
        action={
          <select value={target} onChange={(e) => setTarget(Number(e.target.value))} className="input h-8 w-auto text-xs" aria-label="Target hive">
            {hives.map((h) => <option key={h.id} value={h.id}>Hive #{h.id}</option>)}
          </select>
        }
      />
      <CardBody className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => run(s.id, s.label)}
            disabled={!!busy}
            className="flex items-start gap-2.5 rounded-lg border border-line bg-surface-2/40 p-3 text-left transition hover:border-line-strong hover:bg-surface-2 disabled:opacity-50"
          >
            <s.icon className={`mt-0.5 h-4 w-4 shrink-0 ${busy === s.id ? "animate-pulse text-brand" : "text-ink-3"}`} />
            <span>
              <span className="block text-sm font-medium text-ink">{s.label}</span>
              <span className="block text-xs text-ink-3">{s.hint}</span>
            </span>
          </button>
        ))}
      </CardBody>
    </Card>
  );
}

export default function BeekeeperFleet() {
  const router = useRouter();
  const hives = useApi<Hive[]>("/hives/", { interval: 10000 });
  const kpis = useApi<Kpis>("/stats/kpis", { interval: 10000 });
  const alerts = useApi<Alert[]>("/alerts?status=open&limit=8", { interval: 10000 });
  const [filter, setFilter] = useState<Filter>("ALL");
  const [apiary, setApiary] = useState<string>("ALL");

  const refreshAll = () => {
    hives.refresh();
    kpis.refresh();
    alerts.refresh();
  };

  const apiaries = useMemo(() => Array.from(new Set((hives.data ?? []).map((h) => h.cluster_name ?? "Unassigned"))), [hives.data]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: 0, HEALTHY: 0, WATCH: 0, WARNING: 0, CRITICAL: 0 };
    (hives.data ?? []).forEach((h) => {
      if (apiary !== "ALL" && (h.cluster_name ?? "Unassigned") !== apiary) return;
      c.ALL++;
      c[h.status]++;
    });
    return c;
  }, [hives.data, apiary]);
  const rows = useMemo(
    () =>
      (hives.data ?? [])
        .filter((h) => (filter === "ALL" || h.status === filter) && (apiary === "ALL" || (h.cluster_name ?? "Unassigned") === apiary))
        .sort((a, b) => a.health_score - b.health_score),
    [hives.data, filter, apiary],
  );

  if (hives.error && !hives.data) return <ErrorState message={hives.error} onRetry={refreshAll} />;
  if (!hives.data) return <PageSkeleton />;

  const online = hives.data.filter((h) => h.online).length;

  return (
    <>
      <PageHeader
        title="Hive fleet"
        description="Live telemetry, health scoring and harvest readiness for every managed hive. Sorted by health — hives needing attention first."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Managed hives" value={kpis.data?.total_hives ?? hives.data.length} icon={Hexagon} hint={`${online} reporting in the last 24 h`} loading={kpis.loading} />
        <StatTile label="Harvest ready" value={kpis.data?.harvest_ready_hives ?? "—"} icon={Wheat} tone="good" hint="Weight ≥ 30 kg" loading={kpis.loading} />
        <StatTile label="Open alerts" value={kpis.data?.alerts ?? "—"} icon={AlertTriangle} tone={kpis.data?.critical_alerts ? "critical" : undefined}
          hint={kpis.data ? `${kpis.data.critical_alerts} critical` : undefined} loading={kpis.loading} />
        <StatTile label="Batches minted" value={kpis.data?.total_batches ?? "—"} icon={Boxes} tone="brand" hint={kpis.data ? `${kpis.data.revoked_batches} revoked` : undefined} loading={kpis.loading} />
      </div>

      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
          <Segmented<Filter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: "ALL", label: "All", count: counts.ALL },
              { value: "CRITICAL", label: "Critical", count: counts.CRITICAL },
              { value: "WARNING", label: "Warning", count: counts.WARNING },
              { value: "WATCH", label: "Watch", count: counts.WATCH },
              { value: "HEALTHY", label: "Healthy", count: counts.HEALTHY },
            ]}
          />
          <select value={apiary} onChange={(e) => setApiary(e.target.value)} className="input h-8 w-auto text-xs" aria-label="Filter by apiary">
            <option value="ALL">All apiaries</option>
            {apiaries.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        {rows.length === 0 ? (
          <EmptyState title="No hives match these filters" />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base min-w-[860px]">
              <thead>
                <tr>
                  <th>Hive</th>
                  <th>Status</th>
                  <th>Health</th>
                  <th className="text-right">Temp</th>
                  <th className="text-right">Humidity</th>
                  <th className="text-right">Weight</th>
                  <th>Last reading</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map((h) => {
                  const tone = scoreTone(h.health_score);
                  return (
                    <tr key={h.id} className="cursor-pointer" onClick={() => router.push(`/beekeeper/hives/${h.id}`)}>
                      <td>
                        <Link href={`/beekeeper/hives/${h.id}`} className="font-medium text-ink hover:text-brand" onClick={(e) => e.stopPropagation()}>
                          Hive #{h.id}
                        </Link>
                        <div className="text-xs text-ink-3">{h.cluster_name}</div>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          <HiveStatusBadge status={h.status} />
                          {h.harvest_ready && <Badge tone="brand" icon={Wheat}>Harvest</Badge>}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-surface-3">
                            <div className={`h-full rounded-full ${toneClasses[tone].dot}`} style={{ width: `${h.health_score}%` }} />
                          </div>
                          <span className="tabular-nums text-ink">{h.health_score}</span>
                        </div>
                      </td>
                      <td className={`text-right tabular-nums ${h.latest_temperature != null && (h.latest_temperature > 37 || h.latest_temperature < 32) ? "text-serious" : ""}`}>
                        {num(h.latest_temperature)} °C
                      </td>
                      <td className={`text-right tabular-nums ${h.latest_humidity != null && h.latest_humidity > 65 ? "text-serious" : ""}`}>
                        {num(h.latest_humidity)} %
                      </td>
                      <td className="text-right tabular-nums">{num(h.latest_weight)} kg</td>
                      <td className="text-xs text-ink-3">
                        <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${h.online ? "bg-good" : "bg-ink-3"}`} />
                        {timeAgo(h.last_seen)}
                      </td>
                      <td><ArrowRight className="h-4 w-4 text-ink-3" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Simulator hives={hives.data} onDone={refreshAll} />
        <Card>
          <CardHeader
            icon={<Droplets className="h-4 w-4" />}
            title="Open alerts"
            description="Most recent unresolved alerts across the fleet"
            action={<Link href="/alerts"><Button size="sm" variant="ghost">View all <ArrowRight className="h-3.5 w-3.5" /></Button></Link>}
          />
          {alerts.data && alerts.data.length === 0 ? (
            <EmptyState title="No open alerts">All hives are within safe parameters.</EmptyState>
          ) : (
            <ul className="divide-y divide-line/60">
              {(alerts.data ?? []).map((a) => (
                <li key={a.id}>
                  <Link href={`/beekeeper/hives/${a.hive_id}`} className="flex items-start gap-3 px-5 py-3 hover:bg-surface-2/50">
                    <SeverityBadge severity={a.severity} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">{a.reason}</p>
                      <p className="text-xs text-ink-3">Hive #{a.hive_id} · {a.message}</p>
                    </div>
                    <span className="shrink-0 text-xs text-ink-3">{timeAgo(a.timestamp)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
