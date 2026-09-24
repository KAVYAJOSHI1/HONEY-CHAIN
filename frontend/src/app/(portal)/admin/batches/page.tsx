"use client";
import { useState } from "react";
import Link from "next/link";
import { Ban, Download, ExternalLink, QrCode, Search } from "lucide-react";
import { exportUrl } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { formatDate, shortHash } from "@/lib/format";
import { scoreTone, toneClasses } from "@/lib/status";
import type { Batch } from "@/lib/types";
import { QrDialog, RevokeDialog } from "@/components/BatchDialogs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/ui/States";
import { Segmented } from "@/components/ui/Tabs";

type Filter = "all" | "valid" | "revoked";

export default function BatchRegistry() {
  const { data, error, refresh } = useApi<Batch[]>("/batches/", { interval: 20000 });
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [qrFor, setQrFor] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<Batch | null>(null);

  if (error && !data) return <ErrorState message={error} onRetry={refresh} />;
  if (!data) return <PageSkeleton />;

  const term = q.trim().toLowerCase();
  const rows = data.filter((b) => {
    if (filter === "valid" && b.is_revoked) return false;
    if (filter === "revoked" && !b.is_revoked) return false;
    if (!term) return true;
    return [b.batch_id, b.floral_source, b.origin?.apiary, b.origin?.region, `hive ${b.hive_id}`, `#${b.hive_id}`]
      .some((v) => v?.toLowerCase().includes(term));
  });
  const revokedCount = data.filter((b) => b.is_revoked).length;

  return (
    <>
      <PageHeader
        title="Batch registry"
        description="Every minted honey batch with its origin, ledger anchor and status. Revoking a batch shows a safety recall on its public passport."
        actions={
          <a href={exportUrl("/export/csv/batches")} download>
            <Button size="sm"><Download className="h-3.5 w-3.5" /> Export CSV</Button>
          </a>
        }
      />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
          <Segmented<Filter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: data.length },
              { value: "valid", label: "Valid", count: data.length - revokedCount },
              { value: "revoked", label: "Revoked", count: revokedCount },
            ]}
          />
          <div className="relative ml-auto w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by ID, floral source, apiary…" className="input h-8 pl-8 text-xs" aria-label="Filter batches" />
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState title="No batches match" />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base min-w-[980px]">
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Origin</th>
                  <th className="text-right">Weight</th>
                  <th className="text-right">Health</th>
                  <th>Ledger</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => (
                  <tr key={b.batch_id}>
                    <td>
                      <p className="font-mono text-sm">{b.batch_id}</p>
                      <p className="text-xs text-ink-3">{b.floral_source} · {formatDate(b.created_at)}</p>
                    </td>
                    <td>
                      <Link href={`/beekeeper/hives/${b.hive_id}`} className="text-sm hover:text-brand">Hive #{b.hive_id}</Link>
                      <p className="text-xs text-ink-3">{b.origin?.apiary ?? "—"}</p>
                    </td>
                    <td className="text-right tabular-nums">{b.weight_kg} kg</td>
                    <td className={`text-right tabular-nums ${toneClasses[scoreTone(b.health_score)].text}`}>{b.health_score}</td>
                    <td>
                      <p className="font-mono text-xs text-ink-2">Token #{b.token_id}</p>
                      <p className="font-mono text-[11px] text-ink-3" title={b.tx_hash}>{shortHash(b.tx_hash)} · {b.blockchain_mode}</p>
                    </td>
                    <td>
                      {b.is_revoked ? (
                        <Badge tone="critical" className="max-w-[180px]"><span className="truncate" title={b.revocation_reason ?? ""}>Revoked</span></Badge>
                      ) : b.tampered_health_score != null ? (
                        <Badge tone="serious">Integrity mismatch</Badge>
                      ) : (
                        <Badge tone="good">Valid</Badge>
                      )}
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <Link href={`/consumer/${b.batch_id}`} target="_blank" title="Open passport">
                          <Button size="sm" variant="ghost" aria-label="Open passport"><ExternalLink className="h-3.5 w-3.5" /></Button>
                        </Link>
                        <Button size="sm" variant="ghost" onClick={() => setQrFor(b.batch_id)} aria-label="Show QR code" title="QR code"><QrCode className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setRevoking(b)} disabled={b.is_revoked} aria-label="Revoke batch" title="Revoke">
                          <Ban className="h-3.5 w-3.5 text-critical" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <QrDialog batchId={qrFor} onClose={() => setQrFor(null)} />
      <RevokeDialog batch={revoking} onClose={() => setRevoking(null)} onRevoked={refresh} />
    </>
  );
}
