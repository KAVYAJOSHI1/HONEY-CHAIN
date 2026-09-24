"use client";
import { useState } from "react";
import Link from "next/link";
import { Database, Fingerprint, Link2, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { formatDateTime, shortHash, titleCase } from "@/lib/format";
import type { SecurityReport } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/ui/States";
import { StatTile } from "@/components/ui/StatTile";
import { Segmented } from "@/components/ui/Tabs";

const sevTone = { CRITICAL: "critical", HIGH: "critical", MEDIUM: "serious", LOW: "info" } as const;

export default function SecurityPage() {
  const { data, error, refresh } = useApi<SecurityReport>("/admin/security", { interval: 15000 });
  const [view, setView] = useState<"issues" | "all">("issues");

  if (error && !data) return <ErrorState message={error} onRetry={refresh} />;
  if (!data) return <PageSkeleton />;
  const s = data.security_status;
  const batches = data.batches.filter((b) => view === "all" || !b.verified);

  return (
    <>
      <PageHeader
        title="Security & integrity"
        description="Every batch record is re-hashed and compared with its ledger anchor on each load. Mismatches indicate the stored record was modified after minting."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Record integrity" value={s.database_integrity === "OK" ? "Intact" : "Mismatch"} icon={Database}
          tone={s.database_integrity === "OK" ? "good" : "critical"} hint={`${s.batches_checked} batches re-hashed`} />
        <StatTile label="Integrity mismatches" value={s.integrity_mismatches} icon={Fingerprint} tone={s.integrity_mismatches ? "critical" : "good"} hint={`${s.tamper_events} tamper simulations logged`} />
        <StatTile label="Ledger anchoring" value={s.blockchain_verification === "ACTIVE" ? "Sepolia" : "Demo"} icon={Link2} tone={s.blockchain_verification === "ACTIVE" ? "good" : "warn"}
          hint={s.blockchain_verification === "ACTIVE" ? "On-chain minting enabled" : "Local SHA-256 anchors"} />
        <StatTile label="High-severity events" value={s.suspicious_activity} icon={ShieldAlert} tone={s.suspicious_activity ? "serious" : undefined} hint={`Last 24 h · ${s.failed_verification} failed consumer checks`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            icon={<Fingerprint className="h-4 w-4" />}
            title="Batch integrity"
            description="Recomputed hash vs. anchored hash"
            action={<Segmented value={view} onChange={setView} options={[{ value: "issues", label: "Issues", count: data.batches.filter((b) => !b.verified).length }, { value: "all", label: "All", count: data.batches.length }]} />}
          />
          {batches.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="All batches verify">Every record matches its anchored hash.</EmptyState>
          ) : (
            <ul className="divide-y divide-line/60">
              {batches.map((b) => (
                <li key={b.batch_id} className="px-5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <Link href={`/consumer/${b.batch_id}`} className="font-mono text-sm hover:text-brand">{b.batch_id}</Link>
                    {b.verified ? <Badge tone="good" icon={ShieldCheck}>Authentic</Badge> : b.is_revoked ? <Badge tone="critical" icon={ShieldX}>Revoked</Badge> : <Badge tone="serious" icon={ShieldAlert}>Hash mismatch</Badge>}
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-ink-3">
                    computed {shortHash(b.current_hash)} · anchored {shortHash(b.anchored_hash)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader icon={<ShieldAlert className="h-4 w-4" />} title="Security events" description="Most recent first" />
          {data.events.length === 0 ? (
            <EmptyState title="No security events" />
          ) : (
            <ol className="divide-y divide-line/60">
              {data.events.map((e) => (
                <li key={e.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={sevTone[e.severity as keyof typeof sevTone] ?? "neutral"}>{titleCase(e.severity)}</Badge>
                    <span className="text-sm font-medium">{titleCase(e.event_type)}</span>
                    <span className="ml-auto text-xs text-ink-3">{formatDateTime(e.timestamp)}</span>
                  </div>
                  <p className="mt-1 text-xs text-ink-2">{e.description}</p>
                  <p className="text-[11px] text-ink-3">Actor: {e.actor}</p>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </>
  );
}
