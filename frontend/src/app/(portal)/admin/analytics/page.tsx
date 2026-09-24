"use client";
import { useState } from "react";
import { Bug, Cpu, Download, FileText, Scale, ShieldCheck, Users, Wheat } from "lucide-react";
import { exportUrl } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { num } from "@/lib/format";
import type { Analytics, Cluster } from "@/lib/types";
import { BarList } from "@/components/charts/BarList";
import { StatusDistribution } from "@/components/charts/StatusDistribution";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorState, PageSkeleton } from "@/components/ui/States";
import { StatTile } from "@/components/ui/StatTile";

function Row({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line/60 py-2.5 text-sm last:border-0">
      <span className="text-ink-2">{label}</span>
      <span className={`font-medium tabular-nums ${tone ?? "text-ink"}`}>{value}</span>
    </div>
  );
}

const CSV_EXPORTS = [
  { type: "telemetry", label: "Telemetry readings" },
  { type: "batches", label: "Honey batches" },
  { type: "alerts", label: "Alerts" },
  { type: "audit-logs", label: "Audit trail" },
];

export default function AnalyticsPage() {
  const { data, error, refresh } = useApi<Analytics>("/admin/analytics", { interval: 30000 });
  const clusters = useApi<Cluster[]>("/clusters/");
  const [clusterId, setClusterId] = useState<string>("");

  if (error && !data) return <ErrorState message={error} onRetry={refresh} />;
  if (!data) return <PageSkeleton />;

  const { production: p, hive_health: h, disease: d, iot, blockchain: bc, consumer: c } = data;
  const selectedCluster = clusterId || String(clusters.data?.[0]?.id ?? "");

  return (
    <>
      <PageHeader title="Analytics & reports" description="Production, colony health, IoT coverage and provenance metrics, computed from live records." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Honey produced" value={num(p.total_honey_produced_kg)} unit="kg" icon={Wheat} tone="brand" hint={p.production_trend} />
        <StatTile label="Avg yield / hive" value={num(p.avg_yield_per_hive_kg)} unit="kg" icon={Scale} hint={`${p.harvest_ready_hives} hives harvest-ready`} />
        <StatTile label="Healthy colonies" value={num(h.healthy_pct, 0)} unit="%" icon={ShieldCheck} tone="good" hint={`${h.warning + h.critical} at risk`} />
        <StatTile label="Verified batches" value={bc.verified_batches} unit={`of ${bc.batches_minted}`} icon={ShieldCheck} hint={`${bc.revoked_batches} revoked`} />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader icon={<Wheat className="h-4 w-4" />} title="Production by floral source" description="Total kg across all minted batches" />
          <CardBody>
            {p.by_floral_source.length ? (
              <BarList unit=" kg" items={p.by_floral_source.map((s) => ({ label: s.floral_source, value: s.weight_kg, sub: `${s.batches} batch${s.batches === 1 ? "" : "es"}` }))} />
            ) : (
              <p className="py-8 text-center text-sm text-ink-3">No batches minted yet.</p>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<ShieldCheck className="h-4 w-4" />} title="Colony health" description="Current status of every registered hive" />
          <CardBody>
            <StatusDistribution counts={{ HEALTHY: h.healthy, WATCH: h.watch, WARNING: h.warning, CRITICAL: h.critical }} />
          </CardBody>
        </Card>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader icon={<Cpu className="h-4 w-4" />} title="IoT network" />
          <CardBody className="py-2">
            <Row label="Reporting devices (24 h)" value={iot.active_devices} />
            <Row label="Silent devices" value={iot.offline_devices} tone={iot.offline_devices ? "text-serious" : "text-ink"} />
            <Row label="Readings ingested" value={iot.telemetry_points_ingested.toLocaleString()} />
            <Row label="Anomalies & warnings raised" value={iot.anomalies_detected} />
            <Row label="Open alerts" value={iot.open_alerts} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<Bug className="h-4 w-4" />} title="Disease surveillance" />
          <CardBody className="py-2">
            <Row label="Frame inspections" value={d.inspections} />
            <Row label="Varroa mites detected" value={d.total_varroa_detections} />
            <Row label="Hives at Varroa risk" value={d.disease_risk_hives} tone={d.disease_risk_hives ? "text-critical" : "text-ink"} />
            <Row label="Outbreak status" value={d.disease_trend} tone={d.disease_trend === "Contained" ? "text-good" : "text-critical"} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<Users className="h-4 w-4" />} title="Consumer verification" />
          <CardBody className="py-2">
            <Row label="Verification checks" value={c.verification_attempts} />
            <Row label="Failed checks" value={c.failed_verifications} tone={c.failed_verifications ? "text-serious" : "text-ink"} />
            <Row label="Success rate" value={c.success_rate_pct != null ? `${c.success_rate_pct}%` : "—"} />
            <Row label="Batches revoked" value={bc.revoked_batches} />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader icon={<Download className="h-4 w-4" />} title="Exports" description="Download raw data for audits and offline analysis" />
        <CardBody className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="label mb-3">CSV datasets</p>
            <div className="flex flex-wrap gap-2">
              {CSV_EXPORTS.map((e) => (
                <a key={e.type} href={exportUrl(`/export/csv/${e.type}`)} download>
                  <Button size="sm"><Download className="h-3.5 w-3.5" /> {e.label}</Button>
                </a>
              ))}
            </div>
          </div>
          <div>
            <p className="label mb-3">Apiary report</p>
            <div className="flex flex-wrap gap-2">
              <select value={selectedCluster} onChange={(e) => setClusterId(e.target.value)} className="input h-8 w-auto flex-1 text-xs" aria-label="Apiary">
                {(clusters.data ?? []).map((cl) => <option key={cl.id} value={cl.id}>{cl.name}</option>)}
              </select>
              <a href={selectedCluster ? exportUrl(`/export/report/apiary/${selectedCluster}`) : undefined} download>
                <Button size="sm" variant="primary" disabled={!selectedCluster}><FileText className="h-3.5 w-3.5" /> Download report</Button>
              </a>
            </div>
            <p className="mt-2 text-xs text-ink-3">Plain-text report: hive health, latest readings and batches for the apiary.</p>
          </div>
        </CardBody>
      </Card>
    </>
  );
}
