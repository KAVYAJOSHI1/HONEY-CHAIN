"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertOctagon, ArrowRight, Boxes, Hexagon, ShieldAlert, ShieldCheck } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { formatDate, timeAgo } from "@/lib/format";
import { scoreTone, toneClasses } from "@/lib/status";
import type { Alert, Batch, Cluster } from "@/lib/types";
import { ApiaryMap } from "@/components/ApiaryMap";
import { StatusDistribution } from "@/components/charts/StatusDistribution";
import { Badge, SeverityBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/ui/States";
import { StatTile } from "@/components/ui/StatTile";
import { Segmented } from "@/components/ui/Tabs";

export default function CommandCenter() {
  const clusters = useApi<Cluster[]>("/clusters/", { interval: 20000 });
  const batches = useApi<Batch[]>("/batches/", { interval: 20000 });
  const alerts = useApi<Alert[]>("/alerts?status=open&limit=200", { interval: 10000 });
  const [sev, setSev] = useState<"ALL" | "CRITICAL" | "WARNING">("ALL");

  const hives = useMemo(() => (clusters.data ?? []).flatMap((c) => c.hives), [clusters.data]);
  const totals = useMemo(() => {
    const t = { HEALTHY: 0, WATCH: 0, WARNING: 0, CRITICAL: 0 };
    (clusters.data ?? []).forEach((c) => {
      t.HEALTHY += c.healthy;
      t.WATCH += c.watch;
      t.WARNING += c.warning;
      t.CRITICAL += c.critical;
    });
    return t;
  }, [clusters.data]);

  if (clusters.error && !clusters.data) return <ErrorState message={clusters.error} onRetry={clusters.refresh} />;
  if (!clusters.data) return <PageSkeleton />;

  const b = batches.data ?? [];
  const revoked = b.filter((x) => x.is_revoked).length;
  const surveillance = (alerts.data ?? []).filter((a) => (sev === "ALL" ? a.severity === "CRITICAL" || a.severity === "WARNING" : a.severity === sev));
  const critical = (alerts.data ?? []).filter((a) => a.severity === "CRITICAL").length;

  return (
    <>
      <PageHeader
        title="KVIC command center"
        description="National view of registered apiaries, colony health, disease surveillance and the honey batch registry."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Registered hives" value={hives.length} icon={Hexagon} hint={`${clusters.data.length} apiaries`} />
        <StatTile label="Critical alerts" value={critical} icon={AlertOctagon} tone={critical ? "critical" : "good"} hint={`${alerts.data?.length ?? "—"} open in total`} loading={alerts.loading} />
        <StatTile label="Valid batches" value={b.length - revoked} icon={ShieldCheck} tone="good" hint={`${b.length} minted`} loading={batches.loading} />
        <StatTile label="Revoked batches" value={revoked} icon={ShieldAlert} tone={revoked ? "serious" : undefined} hint="Safety recalls issued" loading={batches.loading} />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader title="Apiary map" description="Every registered hive at its GPS location, colored by health status" />
          <ApiaryMap hives={hives} height={380} />
        </Card>
        <Card>
          <CardHeader title="National colony health" description={`${hives.length} hives`} />
          <CardBody className="space-y-5">
            <StatusDistribution counts={totals} />
            <ul className="space-y-3 border-t border-line pt-4">
              {clusters.data.map((c) => (
                <li key={c.id}>
                  <Link href={`/beekeeper/apiary?cluster=${c.id}`} className="group flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm group-hover:text-brand">{c.name}</p>
                      <p className="text-xs text-ink-3">{c.region} · {c.total_hives} hives</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold tabular-nums ${c.avg_health != null ? toneClasses[scoreTone(c.avg_health)].text : ""}`}>{c.avg_health ?? "—"}</p>
                      <p className="text-[11px] text-ink-3">avg health</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Disease & risk surveillance"
            description="Open warning and critical alerts"
            action={
              <Segmented
                value={sev}
                onChange={setSev}
                options={[{ value: "ALL", label: "All" }, { value: "CRITICAL", label: "Critical" }, { value: "WARNING", label: "Warning" }]}
              />
            }
          />
          {surveillance.length === 0 ? (
            <EmptyState title="No open risks">All monitored apiaries are within safe parameters.</EmptyState>
          ) : (
            <ul className="max-h-[360px] divide-y divide-line/60 overflow-y-auto">
              {surveillance.map((a) => (
                <li key={a.id}>
                  <Link href={`/beekeeper/hives/${a.hive_id}`} className="flex items-start gap-3 px-5 py-3 hover:bg-surface-2/50">
                    <SeverityBadge severity={a.severity} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{a.reason}</p>
                      <p className="text-xs text-ink-3">Hive #{a.hive_id} · {a.source}</p>
                    </div>
                    <span className="shrink-0 text-xs text-ink-3">{timeAgo(a.timestamp)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            icon={<Boxes className="h-4 w-4" />}
            title="Recent batches"
            action={<Link href="/admin/batches"><Button size="sm" variant="ghost">Registry <ArrowRight className="h-3.5 w-3.5" /></Button></Link>}
          />
          {b.length === 0 ? (
            <EmptyState title="No batches minted yet" />
          ) : (
            <ul className="divide-y divide-line/60">
              {b.slice(0, 6).map((x) => (
                <li key={x.batch_id}>
                  <Link href={`/consumer/${x.batch_id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface-2/50">
                    <div className="min-w-0">
                      <p className="font-mono text-sm">{x.batch_id}</p>
                      <p className="truncate text-xs text-ink-3">{x.floral_source} · {x.weight_kg} kg · {x.origin?.apiary ?? `Hive #${x.hive_id}`} · {formatDate(x.created_at)}</p>
                    </div>
                    {x.is_revoked ? <Badge tone="critical">Revoked</Badge> : <Badge tone="good">Valid</Badge>}
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
