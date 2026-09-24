"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, CheckCheck, Download, BellOff } from "lucide-react";
import { api, exportUrl } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { formatDateTime, timeAgo, titleCase } from "@/lib/format";
import { severityOf, toneClasses } from "@/lib/status";
import type { Alert } from "@/lib/types";
import { Badge, SeverityBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/ui/States";
import { Segmented } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";

type Status = "open" | "acknowledged" | "resolved" | "all";

export default function AlertsPage() {
  const [status, setStatus] = useState<Status>("open");
  const [severity, setSeverity] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [pending, setPending] = useState<number | null>(null);
  const toast = useToast();
  const { data, error, refresh } = useApi<Alert[]>("/alerts?limit=500", { interval: 10000 });

  const counts = useMemo(() => {
    const all = data ?? [];
    return {
      open: all.filter((a) => !a.resolved).length,
      acknowledged: all.filter((a) => a.acknowledged && !a.resolved).length,
      resolved: all.filter((a) => a.resolved).length,
      all: all.length,
    };
  }, [data]);
  const types = useMemo(() => Array.from(new Set((data ?? []).map((a) => a.type))).sort(), [data]);

  const rows = (data ?? []).filter((a) => {
    if (status === "open" && a.resolved) return false;
    if (status === "acknowledged" && !(a.acknowledged && !a.resolved)) return false;
    if (status === "resolved" && !a.resolved) return false;
    if (severity !== "ALL" && a.severity !== severity) return false;
    if (type !== "ALL" && a.type !== type) return false;
    return true;
  });

  const act = async (a: Alert, action: "acknowledge" | "resolve") => {
    setPending(a.id);
    try {
      await api.post(`/alerts/${a.id}/${action}`);
      toast({ kind: "success", title: action === "resolve" ? "Alert resolved" : "Alert acknowledged", description: `Hive #${a.hive_id}: ${a.reason}` });
      await refresh();
    } catch (e) {
      toast({ kind: "error", title: "Action failed", description: e instanceof Error ? e.message : undefined });
    } finally {
      setPending(null);
    }
  };

  if (error && !data) return <ErrorState message={error} onRetry={refresh} />;
  if (!data) return <PageSkeleton />;

  return (
    <>
      <PageHeader
        title="Alerts"
        description="Threshold breaches, ML anomalies, disease detections and harvest signals across all hives. Resolving an alert removes its penalty from the hive's health score."
        actions={
          <a href={exportUrl("/export/csv/alerts")} download>
            <Button size="sm"><Download className="h-3.5 w-3.5" /> Export CSV</Button>
          </a>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
          <Segmented<Status>
            value={status}
            onChange={setStatus}
            options={[
              { value: "open", label: "Open", count: counts.open },
              { value: "acknowledged", label: "Acknowledged", count: counts.acknowledged },
              { value: "resolved", label: "Resolved", count: counts.resolved },
              { value: "all", label: "All", count: counts.all },
            ]}
          />
          <div className="ml-auto flex gap-2">
            <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="input h-8 w-auto text-xs" aria-label="Severity">
              <option value="ALL">All severities</option>
              {["CRITICAL", "WARNING", "SUCCESS", "INFO"].map((s) => <option key={s} value={s}>{severityOf(s).label}</option>)}
            </select>
            <select value={type} onChange={(e) => setType(e.target.value)} className="input h-8 w-auto text-xs" aria-label="Type">
              <option value="ALL">All types</option>
              {types.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}
            </select>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={BellOff} title="No alerts match these filters">{status === "open" ? "Nothing needs attention right now." : undefined}</EmptyState>
        ) : (
          <ul className="divide-y divide-line/60">
            {rows.map((a) => {
              const m = severityOf(a.severity);
              return (
                <li key={a.id} className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center ${a.resolved ? "opacity-60" : ""}`}>
                  <div className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:flex ${toneClasses[m.tone].bg} ${toneClasses[m.tone].text}`}>
                    <m.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={a.severity} />
                      <Badge>{titleCase(a.type)}</Badge>
                      <span className="text-sm font-medium">{a.reason}</span>
                    </div>
                    <p className="mt-1 text-xs text-ink-3">
                      <Link href={`/beekeeper/hives/${a.hive_id}`} className="text-ink-2 hover:text-brand">Hive #{a.hive_id}</Link>
                      {a.message && <> · {a.message}</>} · {a.source} · <span title={formatDateTime(a.timestamp)}>{timeAgo(a.timestamp)}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {a.resolved ? (
                      <Badge tone="good" icon={CheckCheck}>Resolved</Badge>
                    ) : (
                      <>
                        {!a.acknowledged ? (
                          <Button size="sm" variant="ghost" onClick={() => act(a, "acknowledge")} disabled={pending === a.id}>
                            <Check className="h-3.5 w-3.5" /> Acknowledge
                          </Button>
                        ) : (
                          <Badge>Acknowledged</Badge>
                        )}
                        <Button size="sm" onClick={() => act(a, "resolve")} loading={pending === a.id}>
                          <CheckCheck className="h-3.5 w-3.5" /> Resolve
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
