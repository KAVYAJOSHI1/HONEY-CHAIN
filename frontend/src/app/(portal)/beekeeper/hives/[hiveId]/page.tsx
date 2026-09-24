"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity, Boxes, BrainCircuit, CheckCircle2, Droplets, History, Lightbulb, MapPin, Scale, ScanSearch, Thermometer, TrendingDown, TrendingUp, Minus, Wheat,
} from "lucide-react";
import { wsUrl } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { formatDate, formatDateTime, num, timeAgo } from "@/lib/format";
import { scoreTone, toneClasses } from "@/lib/status";
import type { Analysis, Batch, Health, Hive, Productivity, Recommendation, Telemetry } from "@/lib/types";
import { MintBatchDialog } from "@/components/BatchDialogs";
import { FrameInspector } from "@/components/FrameInspector";
import { TelemetryChart } from "@/components/charts/TelemetryChart";
import { Badge, Dot, HiveStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/ui/States";
import { StatTile } from "@/components/ui/StatTile";

const priorityTone = { HIGH: "critical", MEDIUM: "warn", LOW: "neutral" } as const;

function useLiveHive(hiveId: string, onUpdate: () => void) {
  const [live, setLive] = useState(false);
  useEffect(() => {
    let ws: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout>;
    let closed = false;
    const connect = () => {
      ws = new WebSocket(wsUrl(`/ws/hives/${hiveId}`));
      ws.onopen = () => setLive(true);
      ws.onmessage = () => onUpdate();
      ws.onclose = () => {
        setLive(false);
        if (!closed) retry = setTimeout(connect, 5000);
      };
      ws.onerror = () => ws?.close();
    };
    connect();
    return () => {
      closed = true;
      clearTimeout(retry);
      ws?.close();
    };
  }, [hiveId, onUpdate]);
  return live;
}

export default function HiveDetail({ params }: { params: { hiveId: string } }) {
  const id = params.hiveId;
  const poll = { interval: 15000 };
  const hive = useApi<Hive>(`/hives/${id}`, poll);
  const health = useApi<Health>(`/hives/${id}/health`, poll);
  const prod = useApi<Productivity>(`/hives/${id}/productivity`, poll);
  const recs = useApi<Recommendation[]>(`/hives/${id}/recommendations`, poll);
  const telemetry = useApi<Telemetry[]>(`/hives/${id}/telemetry?limit=48`, poll);
  const analyses = useApi<Analysis[]>(`/hives/${id}/analyses`);
  const batches = useApi<Batch[]>(`/hives/${id}/batches`);
  const [mintOpen, setMintOpen] = useState(false);

  const { refresh: rHive } = hive, { refresh: rHealth } = health, { refresh: rProd } = prod, { refresh: rRecs } = recs, { refresh: rTel } = telemetry;
  const refreshLive = useCallback(() => {
    rHive(); rHealth(); rProd(); rRecs(); rTel();
  }, [rHive, rHealth, rProd, rRecs, rTel]);
  const live = useLiveHive(id, refreshLive);

  if (hive.error && !hive.data) {
    return hive.error.toLowerCase().includes("not found") ? (
      <Card><EmptyState title={`Hive #${id} not found`} action={<Link href="/beekeeper"><Button size="sm">Back to fleet</Button></Link>}>This hive isn&apos;t registered.</EmptyState></Card>
    ) : (
      <ErrorState message={hive.error} onRetry={hive.refresh} />
    );
  }
  if (!hive.data || !health.data) return <PageSkeleton />;

  const h = hive.data;
  const hd = health.data;
  const p = prod.data;
  const TrendIcon = p?.trend === "INCREASING" ? TrendingUp : p?.trend === "DECREASING" ? TrendingDown : Minus;

  return (
    <>
      <PageHeader
        back={{ href: "/beekeeper", label: "Hive fleet" }}
        title={`Hive #${h.id}`}
        meta={
          <div className="flex items-center gap-2">
            <HiveStatusBadge status={hd.status} />
            {h.harvest_ready && <Badge tone="brand" icon={Wheat}>Harvest ready</Badge>}
          </div>
        }
        description={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {h.cluster_name}, {h.region}</span>
            <span className="font-mono text-xs">{h.gps_lat.toFixed(4)}, {h.gps_long.toFixed(4)}</span>
            <span>Installed {formatDate(h.installed_at)}</span>
            {h.beekeeper && <span>Keeper: {h.beekeeper}</span>}
          </span>
        }
        actions={
          <>
            <span className="inline-flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-xs text-ink-2" title={live ? "Receiving live updates over WebSocket" : "Polling every 15 s"}>
              <Dot tone={live ? "good" : "neutral"} pulse={live} /> {live ? "Live" : "Polling"} · {timeAgo(h.last_seen)}
            </span>
            <Button variant="primary" onClick={() => setMintOpen(true)}>
              <Boxes className="h-4 w-4" /> Harvest &amp; mint batch
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Health score" value={hd.health_score} unit="/100" icon={Activity} tone={scoreTone(hd.health_score)} hint={hd.status === "HEALTHY" ? "All factors in range" : `${hd.alerts.length} active issue(s)`} />
        <StatTile label="Temperature" value={num(h.latest_temperature)} unit="°C" icon={Thermometer} tone={h.latest_temperature != null && (h.latest_temperature > 37 || h.latest_temperature < 32) ? "serious" : undefined} hint="Ideal 33.5–35.5 °C" />
        <StatTile label="Humidity" value={num(h.latest_humidity)} unit="%" icon={Droplets} tone={h.latest_humidity != null && h.latest_humidity > 65 ? "serious" : undefined} hint="Ideal 40–65 %" />
        <StatTile label="Hive weight" value={num(h.latest_weight)} unit="kg" icon={Scale} tone={h.harvest_ready ? "good" : undefined}
          hint={h.harvest_ready ? "Above 30 kg harvest threshold" : `${num(Math.max(0, 30 - (h.latest_weight ?? 0)))} kg to harvest threshold`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader icon={<Activity className="h-4 w-4" />} title="Sensor telemetry" description="Last 48 readings from the hive's ESP32 node" />
            <CardBody>
              {telemetry.data ? <TelemetryChart data={telemetry.data} /> : <div className="h-64 animate-pulse rounded-lg bg-surface-2" />}
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={<ScanSearch className="h-4 w-4" />} title="Frame inspection" description="Varroa mite detection on brood-frame photos" />
            <CardBody>
              <FrameInspector hiveId={h.id} onAnalyzed={() => { analyses.refresh(); refreshLive(); }} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={<History className="h-4 w-4" />} title="Inspection history" description={`${analyses.data?.length ?? 0} frame analyses`} />
            {!analyses.data?.length ? (
              <EmptyState title="No inspections yet">Run a frame inspection above to start the history.</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-base min-w-[520px]">
                  <thead><tr><th>When</th><th>Frame health</th><th className="text-right">Mites</th><th className="text-right">Bees</th><th className="text-right">Infestation</th></tr></thead>
                  <tbody>
                    {analyses.data.map((a) => (
                      <tr key={a.id}>
                        <td className="text-ink-2">{formatDateTime(a.timestamp)}</td>
                        <td><span className={`font-medium tabular-nums ${toneClasses[scoreTone(a.health_score)].text}`}>{a.health_score}</span></td>
                        <td className="text-right tabular-nums">{a.varroa_count}</td>
                        <td className="text-right tabular-nums">{a.healthy_bee_count}</td>
                        <td className="text-right tabular-nums">{num(a.infection_rate * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader icon={<BrainCircuit className="h-4 w-4" />} title="Health breakdown" description="Weighted, explainable score" />
            <CardBody className="space-y-4">
              <p className="text-sm text-ink-2">{hd.score_explanation}</p>
              <div className="space-y-3">
                <ScoreBar label="Temperature (30%)" value={hd.factors.temperature} />
                <ScoreBar label="Humidity (20%)" value={hd.factors.humidity} />
                <ScoreBar label="Weight trend (20%)" value={hd.factors.weight} />
                <ScoreBar label="Open alerts (15%)" value={hd.factors.anomalies} />
                <ScoreBar label="Disease risk (15%)" value={hd.factors.disease_risk} />
              </div>
              {hd.alerts.length > 0 && (
                <ul className="space-y-1.5 border-t border-line pt-4">
                  {hd.alerts.map((a) => (
                    <li key={a} className="flex items-start gap-2 text-sm text-ink-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-serious" /> {a}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={<Wheat className="h-4 w-4" />} title="Yield forecast" description={p?.label} />
            {p ? (
              <CardBody className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="label">Est. harvestable</p>
                    <p className="mt-1 text-xl font-semibold tabular-nums">{num(p.predicted_yield_kg)} <span className="text-sm font-normal text-ink-3">kg</span></p>
                  </div>
                  <div>
                    <p className="label">Weight trend</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xl font-semibold tabular-nums">
                      <TrendIcon className="h-4 w-4 text-ink-3" /> {p.weight_change_kg > 0 ? "+" : ""}{num(p.weight_change_kg)} <span className="text-sm font-normal text-ink-3">kg</span>
                    </p>
                  </div>
                  <div>
                    <p className="label">Harvest window</p>
                    <p className="mt-1 text-sm font-medium">{p.harvest_window}</p>
                  </div>
                  <div>
                    <p className="label">Confidence</p>
                    <p className="mt-1 text-sm font-medium tabular-nums">{Math.round(p.confidence * 100)}%</p>
                  </div>
                </div>
                <ul className="space-y-1 border-t border-line pt-3 text-xs text-ink-3">
                  {p.factors.map((f) => <li key={f}>• {f}</li>)}
                </ul>
              </CardBody>
            ) : <CardBody><div className="h-32 animate-pulse rounded bg-surface-2" /></CardBody>}
          </Card>

          <Card>
            <CardHeader icon={<Lightbulb className="h-4 w-4" />} title="Recommended actions" />
            <ul className="divide-y divide-line/60">
              {(recs.data ?? []).map((r) => (
                <li key={r.id} className="px-5 py-4">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge tone={priorityTone[r.priority]}>{r.priority.toLowerCase()}</Badge>
                    <span className="text-sm font-medium">{r.title}</span>
                  </div>
                  <p className="mb-2 text-xs text-ink-3">{r.explanation}</p>
                  <ul className="space-y-1">
                    {r.actions.map((a) => (
                      <li key={a} className="flex items-start gap-2 text-xs text-ink-2">
                        <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-ink-3" /> {a}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader icon={<Boxes className="h-4 w-4" />} title="Batches from this hive" description={`${batches.data?.length ?? 0} minted`} />
            {!batches.data?.length ? (
              <EmptyState title="No batches yet">Harvest and mint a batch to create its provenance record.</EmptyState>
            ) : (
              <ul className="divide-y divide-line/60">
                {batches.data.map((b) => (
                  <li key={b.batch_id}>
                    <Link href={`/consumer/${b.batch_id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-2/50">
                      <div className="min-w-0">
                        <p className="font-mono text-sm">{b.batch_id}</p>
                        <p className="truncate text-xs text-ink-3">{b.floral_source} · {b.weight_kg} kg · {formatDate(b.created_at)}</p>
                      </div>
                      {b.is_revoked ? <Badge tone="critical">Revoked</Badge> : <Badge tone="good">Valid</Badge>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <MintBatchDialog
        open={mintOpen}
        onClose={() => setMintOpen(false)}
        hiveId={h.id}
        healthScore={hd.health_score}
        suggestedWeight={p?.predicted_yield_kg ?? 0}
        onMinted={() => { batches.refresh(); }}
      />
    </>
  );
}
