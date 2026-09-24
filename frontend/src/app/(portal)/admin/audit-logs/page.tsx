"use client";
import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { exportUrl } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { formatDateTime, shortHash } from "@/lib/format";
import type { AuditLog } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/ui/States";

const actionTone = (a: string) =>
  a.includes("Revoked") || a.includes("Tamper") ? "critical" : a.includes("Minted") ? "brand" : a.includes("Verified") || a.includes("Resolved") || a.includes("Restored") ? "good" : "neutral";

export default function AuditLogsPage() {
  const { data, error, refresh } = useApi<AuditLog[]>("/audit-logs?limit=1000", { interval: 15000 });
  const [q, setQ] = useState("");
  const [action, setAction] = useState("ALL");
  const [hideTelemetry, setHideTelemetry] = useState(true);

  const actions = useMemo(() => Array.from(new Set((data ?? []).map((l) => l.action))).sort(), [data]);

  if (error && !data) return <ErrorState message={error} onRetry={refresh} />;
  if (!data) return <PageSkeleton />;

  const term = q.trim().toLowerCase();
  const rows = data.filter((l) => {
    if (hideTelemetry && action === "ALL" && l.action === "Telemetry Ingested") return false;
    if (action !== "ALL" && l.action !== action) return false;
    return !term || [l.action, l.actor, l.details, l.blockchain_tx].some((v) => v?.toLowerCase().includes(term));
  });

  return (
    <>
      <PageHeader
        title="Audit trail"
        description="Chronological record of platform actions: minting, revocations, inspections, alert handling and verification checks."
        actions={<a href={exportUrl("/export/csv/audit-logs")} download><Button size="sm"><Download className="h-3.5 w-3.5" /> Export CSV</Button></a>}
      />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search details, actor, tx hash…" className="input h-8 pl-8 text-xs" aria-label="Search audit log" />
          </div>
          <select value={action} onChange={(e) => setAction(e.target.value)} className="input h-8 w-auto text-xs" aria-label="Action">
            <option value="ALL">All actions</option>
            {actions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <label className="flex items-center gap-2 text-xs text-ink-2">
            <input type="checkbox" checked={hideTelemetry} onChange={(e) => setHideTelemetry(e.target.checked)} className="accent-[rgb(var(--brand))]" />
            Hide telemetry ingestion
          </label>
          <span className="ml-auto text-xs text-ink-3">{rows.length} entries</span>
        </div>
        {rows.length === 0 ? (
          <EmptyState title="No matching entries" />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base min-w-[860px]">
              <thead><tr><th className="w-44">Time</th><th className="w-44">Action</th><th className="w-40">Actor</th><th>Details</th><th className="w-48">Ledger tx</th></tr></thead>
              <tbody>
                {rows.slice(0, 300).map((l) => (
                  <tr key={l.id}>
                    <td className="whitespace-nowrap text-xs text-ink-3">{formatDateTime(l.timestamp)}</td>
                    <td><Badge tone={actionTone(l.action)}>{l.action}</Badge></td>
                    <td className="text-xs text-ink-2">{l.actor}</td>
                    <td className="text-xs text-ink-2">{l.details}</td>
                    <td>
                      {l.blockchain_tx ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-ink-2">{shortHash(l.blockchain_tx)} <CopyButton value={l.blockchain_tx} /></span>
                      ) : <span className="text-ink-3">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 300 && <p className="border-t border-line px-5 py-2 text-xs text-ink-3">Showing the latest 300 of {rows.length}. Export CSV for the full log.</p>}
          </div>
        )}
      </Card>
    </>
  );
}
