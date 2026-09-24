"use client";
import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Droplets, FileDown, Hexagon, MapPin, Thermometer, Wheat } from "lucide-react";
import { exportUrl } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { num, timeAgo } from "@/lib/format";
import { hiveMeta, scoreTone, toneClasses } from "@/lib/status";
import type { Cluster } from "@/lib/types";
import { ApiaryMap } from "@/components/ApiaryMap";
import { StatusDistribution } from "@/components/charts/StatusDistribution";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/ui/States";
import { StatTile } from "@/components/ui/StatTile";

function ApiaryView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { data, error, refresh } = useApi<Cluster[]>("/clusters/", { interval: 20000 });

  if (error && !data) return <ErrorState message={error} onRetry={refresh} />;
  if (!data) return <PageSkeleton />;
  if (!data.length) return <Card><EmptyState title="No apiaries registered" /></Card>;

  const selectedId = Number(params.get("cluster")) || data[0].id;
  const c = data.find((x) => x.id === selectedId) ?? data[0];
  const select = (id: number) => router.replace(`${pathname}?cluster=${id}`, { scroll: false });

  return (
    <>
      <PageHeader
        title="Apiaries"
        description="Regional clusters of managed hives, with environmental benchmarks and health status per hive."
        actions={
          <a href={exportUrl(`/export/report/apiary/${c.id}`)} download>
            <Button size="sm"><FileDown className="h-3.5 w-3.5" /> Download apiary report</Button>
          </a>
        }
      />

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Apiary">
        {data.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={x.id === c.id}
            onClick={() => select(x.id)}
            className={`min-w-[220px] rounded-xl border px-4 py-3 text-left transition ${x.id === c.id ? "border-brand/60 bg-brand/5" : "border-line bg-surface hover:border-line-strong"}`}
          >
            <p className="text-sm font-medium text-ink">{x.name}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-3"><MapPin className="h-3 w-3" /> {x.region}</p>
            <p className="mt-2 text-xs text-ink-2">
              {x.total_hives} hives
              {x.critical > 0 && <span className="text-critical"> · {x.critical} critical</span>}
              {x.warning > 0 && <span className="text-serious"> · {x.warning} warning</span>}
            </p>
          </button>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Average health" value={c.avg_health ?? "—"} unit="/100" icon={Hexagon} tone={c.avg_health != null ? scoreTone(c.avg_health) : undefined} />
        <StatTile label="Avg temperature" value={num(c.avg_temperature)} unit="°C" icon={Thermometer} hint="Latest reading per hive" />
        <StatTile label="Avg humidity" value={num(c.avg_humidity)} unit="%" icon={Droplets} hint="Latest reading per hive" />
        <StatTile label="Harvest ready" value={c.harvest_ready} unit={`of ${c.total_hives}`} icon={Wheat} tone="good" />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader title="Hive locations" description={`${c.name} · colored by current health status`} />
          <ApiaryMap hives={c.hives} height={340} />
        </Card>
        <Card>
          <CardHeader title="Health distribution" description={`${c.total_hives} hives`} />
          <CardBody>
            <StatusDistribution counts={{ HEALTHY: c.healthy, WATCH: c.watch, WARNING: c.warning, CRITICAL: c.critical }} />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Hives" description="Select a hive to open its workspace" />
        <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {c.hives.map((h) => {
            const m = hiveMeta(h.status);
            return (
              <Link key={h.id} href={`/beekeeper/hives/${h.id}`} className="group rounded-lg border border-line bg-surface-2/40 p-4 transition hover:border-line-strong hover:bg-surface-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium group-hover:text-brand">Hive #{h.id}</span>
                  <span className={`inline-flex items-center gap-1 text-xs ${toneClasses[m.tone].text}`}>
                    <m.icon className="h-3.5 w-3.5" /> {m.label}
                  </span>
                </div>
                <div className="mt-3 h-1.5 rounded-full bg-surface-3">
                  <div className={`h-full rounded-full ${toneClasses[m.tone].dot}`} style={{ width: `${h.health_score}%` }} />
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div><dt className="text-ink-3">Temp</dt><dd className="tabular-nums">{num(h.latest_temperature)}°</dd></div>
                  <div><dt className="text-ink-3">Hum.</dt><dd className="tabular-nums">{num(h.latest_humidity, 0)}%</dd></div>
                  <div><dt className="text-ink-3">Weight</dt><dd className="tabular-nums">{num(h.latest_weight)}</dd></div>
                </dl>
                <p className="mt-2 text-[11px] text-ink-3">Health {h.health_score}/100 · {timeAgo(h.last_seen)}</p>
              </Link>
            );
          })}
        </CardBody>
      </Card>
    </>
  );
}

export default function ApiaryPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ApiaryView />
    </Suspense>
  );
}
