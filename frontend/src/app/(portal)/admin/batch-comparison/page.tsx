"use client";
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/useApi";
import { formatDate, shortHash } from "@/lib/format";
import { scoreTone, toneClasses } from "@/lib/status";
import type { Batch, Integrity } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState, ErrorState, PageSkeleton } from "@/components/ui/States";

function useIntegrity(batchId: string | undefined) {
  const [data, setData] = useState<Integrity | null>(null);
  useEffect(() => {
    setData(null);
    if (batchId) api.post<Integrity>(`/batches/${batchId}/verify-integrity?actor=KVIC%20Admin`).then(setData).catch(() => setData(null));
  }, [batchId]);
  return data;
}

function IntegrityBadge({ i }: { i: Integrity | null }) {
  if (!i) return <span className="text-ink-3">Checking…</span>;
  if (i.verified) return <Badge tone="good">Authentic</Badge>;
  if (i.is_revoked) return <Badge tone="critical">Revoked</Badge>;
  return <Badge tone="serious">Mismatch</Badge>;
}

export default function BatchComparison() {
  const { data, error, refresh } = useApi<Batch[]>("/batches/");
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");

  useEffect(() => {
    if (data && !aId && data.length) {
      setAId(data[0].batch_id);
      setBId(data[1]?.batch_id ?? data[0].batch_id);
    }
  }, [data, aId]);

  const a = data?.find((x) => x.batch_id === aId);
  const b = data?.find((x) => x.batch_id === bId);
  const ia = useIntegrity(a?.batch_id);
  const ib = useIntegrity(b?.batch_id);

  if (error && !data) return <ErrorState message={error} onRetry={refresh} />;
  if (!data) return <PageSkeleton />;
  if (data.length < 1) return <Card><EmptyState title="No batches to compare" /></Card>;

  const better = (x: number, y: number) => (x > y ? "a" : y > x ? "b" : null);
  const rows: { label: string; a: ReactNode; b: ReactNode; win?: "a" | "b" | null; differs?: boolean }[] = a && b ? [
    { label: "Floral source", a: a.floral_source, b: b.floral_source, differs: a.floral_source !== b.floral_source },
    { label: "Weight", a: `${a.weight_kg} kg`, b: `${b.weight_kg} kg`, win: better(a.weight_kg, b.weight_kg) },
    {
      label: "Colony health score",
      a: <span className={toneClasses[scoreTone(a.health_score)].text}>{a.health_score}/100</span>,
      b: <span className={toneClasses[scoreTone(b.health_score)].text}>{b.health_score}/100</span>,
      win: better(a.health_score, b.health_score),
    },
    { label: "Origin hive", a: <Link className="hover:text-brand" href={`/beekeeper/hives/${a.hive_id}`}>Hive #{a.hive_id}</Link>, b: <Link className="hover:text-brand" href={`/beekeeper/hives/${b.hive_id}`}>Hive #{b.hive_id}</Link>, differs: a.hive_id !== b.hive_id },
    { label: "Apiary", a: a.origin?.apiary ?? "—", b: b.origin?.apiary ?? "—", differs: a.origin?.apiary !== b.origin?.apiary },
    { label: "Region", a: a.origin?.region ?? "—", b: b.origin?.region ?? "—" },
    { label: "Minted", a: formatDate(a.created_at), b: formatDate(b.created_at) },
    { label: "Ledger", a: `${a.blockchain_mode} · token #${a.token_id}`, b: `${b.blockchain_mode} · token #${b.token_id}` },
    { label: "Transaction", a: <span className="font-mono text-xs">{shortHash(a.tx_hash)}</span>, b: <span className="font-mono text-xs">{shortHash(b.tx_hash)}</span> },
    { label: "Integrity check", a: <IntegrityBadge i={ia} />, b: <IntegrityBadge i={ib} /> },
    { label: "Revocation", a: a.revocation_reason ?? "—", b: b.revocation_reason ?? "—", differs: a.is_revoked !== b.is_revoked },
  ] : [];

  const Select = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) => (
    <label className="block flex-1">
      <span className="label">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input mt-1">
        {data.map((x) => <option key={x.batch_id} value={x.batch_id}>{x.batch_id} — {x.floral_source} ({x.weight_kg} kg){x.is_revoked ? " · revoked" : ""}</option>)}
      </select>
    </label>
  );

  return (
    <>
      <PageHeader title="Compare batches" description="Side-by-side quality, origin and provenance for two honey batches. Better values are highlighted; differing attributes are marked." />
      <Card className="mb-6 p-5">
        <div className="flex flex-col items-end gap-3 md:flex-row">
          <Select value={aId} onChange={setAId} label="Batch A" />
          <Button variant="ghost" onClick={() => { setAId(bId); setBId(aId); }} aria-label="Swap batches"><ArrowLeftRight className="h-4 w-4" /></Button>
          <Select value={bId} onChange={setBId} label="Batch B" />
        </div>
      </Card>
      {a && b && (
        <Card>
          <div className="overflow-x-auto">
            <table className="table-base min-w-[640px]">
              <thead><tr><th className="w-48">Attribute</th><th>{a.batch_id}</th><th>{b.batch_id}</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label}>
                    <td className="text-ink-3">{r.label}{r.differs && <span className="ml-2 text-[10px] uppercase tracking-wider text-brand">differs</span>}</td>
                    <td className={r.win === "a" ? "font-semibold" : ""}>{r.a}{r.win === "a" && <span className="ml-2 text-xs text-good">▲</span>}</td>
                    <td className={r.win === "b" ? "font-semibold" : ""}>{r.b}{r.win === "b" && <span className="ml-2 text-xs text-good">▲</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
