"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Award, Boxes, CalendarDays, CheckCircle2, ExternalLink, FlaskConical, Hexagon, MapPin, Printer, RotateCcw, ScanSearch, ShieldAlert, ShieldCheck, ShieldX, User, Wheat,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatDate, formatDateTime, shortHash } from "@/lib/format";
import { scoreTone, toneClasses } from "@/lib/status";
import type { Batch, Integrity, TimelineEvent } from "@/lib/types";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/States";

const EVENT_ICONS: Record<string, typeof Hexagon> = {
  registered: Hexagon, monitoring: ScanSearch, inspection: ScanSearch, harvest: Wheat, anchored: Boxes, revoked: ShieldX,
};

function Verdict({ batch, integrity }: { batch: Batch; integrity: Integrity | null }) {
  if (!integrity) return <Skeleton className="h-24" />;
  const v = batch.is_revoked
    ? { tone: "critical" as const, icon: ShieldX, title: "Recalled by KVIC", body: batch.revocation_reason ?? "This batch has been revoked. Do not consume." }
    : integrity.verified
      ? { tone: "good" as const, icon: ShieldCheck, title: "Authentic honey", body: "This record matches its ledger anchor. Origin and quality data have not been altered since harvest." }
      : { tone: "serious" as const, icon: ShieldAlert, title: "Record could not be verified", body: "The stored record no longer matches the hash anchored at minting. Treat the details below with caution." };
  const t = toneClasses[v.tone];
  return (
    <div className={`flex items-start gap-4 rounded-2xl border p-5 ${t.border} ${t.bg}`} role="status">
      <v.icon className={`h-8 w-8 shrink-0 ${t.text}`} aria-hidden />
      <div>
        <p className={`text-lg font-semibold ${t.text}`}>{v.title}</p>
        <p className="mt-0.5 text-sm text-ink-2">{v.body}</p>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, children }: { icon: typeof Hexagon; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" aria-hidden />
      <div className="min-w-0">
        <p className="label">{label}</p>
        <div className="mt-0.5 text-sm text-ink">{children}</div>
      </div>
    </div>
  );
}

function HashRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div>
      <p className="label">{label}</p>
      <div className="mt-1 flex items-center gap-1">
        <code className="min-w-0 flex-1 truncate rounded-md bg-canvas px-2 py-1.5 font-mono text-xs text-ink-2" title={value}>{value}</code>
        <CopyButton value={value} />
        {href && <a href={href} target="_blank" rel="noreferrer" className="rounded p-1 text-ink-3 hover:bg-surface-3 hover:text-ink" aria-label={`Open ${label}`}><ExternalLink className="h-3.5 w-3.5" /></a>}
      </div>
    </div>
  );
}

export default function PassportPage({ params }: { params: { batchId: string } }) {
  const batchId = decodeURIComponent(params.batchId);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [integrity, setIntegrity] = useState<Integrity | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [error, setError] = useState<{ notFound: boolean; message: string } | null>(null);
  const [certOpen, setCertOpen] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [b, t] = await Promise.all([
        api.get<Batch>(`/batches/${encodeURIComponent(batchId)}`),
        api.get<TimelineEvent[]>(`/batches/${encodeURIComponent(batchId)}/timeline`),
      ]);
      setBatch(b);
      setTimeline(t);
      setIntegrity(await api.post<Integrity>(`/batches/${encodeURIComponent(batchId)}/verify-integrity`));
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load";
      setError({ notFound: /not found/i.test(msg), message: msg });
    }
  }, [batchId]);

  useEffect(() => { load(); }, [load]);

  const demo = async (action: "tamper" | "restore") => {
    setDemoBusy(true);
    try {
      await api.post(`/batches/${encodeURIComponent(batchId)}/${action}`, action === "tamper" ? { tampered_score: 35 } : undefined);
      setIntegrity(null);
      await load();
    } finally {
      setDemoBusy(false);
    }
  };

  const header = (
    <header className="no-print border-b border-line bg-surface/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link href="/"><Logo /></Link>
        <Link href="/verify" className="text-sm text-ink-3 hover:text-ink">Verify another batch</Link>
      </div>
    </header>
  );

  if (error) {
    return (
      <div className="min-h-screen">
        {header}
        <main className="mx-auto max-w-md px-4 py-20 text-center">
          <ShieldX className="mx-auto mb-4 h-10 w-10 text-ink-3" />
          <h1 className="text-xl font-semibold">{error.notFound ? "Batch not found" : "Couldn't load this batch"}</h1>
          <p className="mt-2 text-sm text-ink-3">
            {error.notFound ? <>No honey batch with ID <span className="font-mono text-ink-2">{batchId}</span> exists in the registry. Check the code on your jar label.</> : error.message}
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Link href="/verify"><Button variant="primary">Try another ID</Button></Link>
            {!error.notFound && <Button onClick={load}>Retry</Button>}
          </div>
        </main>
      </div>
    );
  }

  const b = batch;
  const isSepolia = b?.blockchain_mode === "sepolia";

  return (
    <div className="min-h-screen pb-16">
      {header}
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        {!b ? (
          <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-64" /><Skeleton className="h-80" /></div>
        ) : (
          <>
            <Verdict batch={b} integrity={integrity} />

            <section className="card overflow-hidden">
              <div className="border-b border-line bg-gradient-to-br from-brand/15 via-transparent to-transparent px-6 py-6">
                <p className="label">Provenance passport</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{b.floral_source}</h1>
                <p className="mt-1 font-mono text-xs text-ink-3">Batch {b.batch_id}</p>
              </div>
              <div className="grid gap-5 p-6 sm:grid-cols-2">
                <Field icon={Wheat} label="Net quantity">{b.weight_kg} kg</Field>
                <Field icon={CalendarDays} label="Harvested">{formatDate(b.created_at)}</Field>
                <Field icon={MapPin} label="Origin">
                  {b.origin?.apiary ?? `Hive #${b.hive_id}`}
                  {b.origin?.region && <span className="block text-xs text-ink-3">{b.origin.region}</span>}
                  {b.origin?.gps_lat != null && b.origin.gps_long != null && (
                    <a className="text-xs text-brand hover:underline" target="_blank" rel="noreferrer"
                      href={`https://www.openstreetmap.org/?mlat=${b.origin.gps_lat}&mlon=${b.origin.gps_long}#map=12/${b.origin.gps_lat}/${b.origin.gps_long}`}>
                      View on map
                    </a>
                  )}
                </Field>
                <Field icon={User} label="Beekeeper">{b.origin?.beekeeper ?? "Registered beekeeper"}</Field>
                <Field icon={Hexagon} label="Colony health at harvest">
                  <span className={`font-semibold ${toneClasses[scoreTone(b.health_score)].text}`}>{b.health_score}/100</span>
                  <span className="block text-xs text-ink-3">From IoT telemetry and frame inspection</span>
                </Field>
                <Field icon={Boxes} label="Ledger token">#{b.token_id} · {isSepolia ? "Ethereum Sepolia" : "Demo ledger"}</Field>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-line px-6 py-4">
                <Button size="sm" onClick={() => setCertOpen(true)}><Award className="h-3.5 w-3.5" /> View certificate</Button>
              </div>
            </section>

            <section className="card p-6">
              <h2 className="mb-5 text-sm font-semibold">Journey from hive to jar</h2>
              <ol className="relative space-y-6 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-line-strong">
                {timeline.map((e) => {
                  const Icon = EVENT_ICONS[e.key] ?? CheckCircle2;
                  const bad = e.key === "revoked";
                  return (
                    <li key={e.key} className="relative flex gap-4">
                      <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${bad ? "border-critical/40 bg-critical/15 text-critical" : "border-line-strong bg-surface-2 text-brand"}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 pt-1">
                        <p className="text-sm font-medium">{e.title}</p>
                        <p className="text-xs text-ink-3">{formatDateTime(e.timestamp)}</p>
                        <p className="mt-1 text-sm text-ink-2 [overflow-wrap:anywhere]">{e.detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>

            <section className="card space-y-4 p-6">
              <div>
                <h2 className="text-sm font-semibold">Cryptographic proof</h2>
                <p className="mt-1 text-xs text-ink-3">
                  The batch record is hashed (SHA-256) at minting and anchored {isSepolia ? "on Ethereum Sepolia" : "on the demo ledger"}.
                  Each scan recomputes the hash from the stored record and compares.
                </p>
              </div>
              <HashRow label="Transaction hash" value={b.tx_hash} href={isSepolia ? `https://sepolia.etherscan.io/tx/${b.tx_hash}` : undefined} />
              <HashRow label="IPFS metadata" value={b.ipfs_cid} />
              {integrity && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <HashRow label="Recomputed now" value={integrity.current_hash} />
                  <HashRow label="Anchored at minting" value={integrity.anchored_hash} />
                </div>
              )}
              {integrity && (
                <p className={`flex items-center gap-2 text-sm ${integrity.current_hash === integrity.anchored_hash ? "text-good" : "text-serious"}`}>
                  {integrity.current_hash === integrity.anchored_hash ? <CheckCircle2 className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                  {integrity.current_hash === integrity.anchored_hash ? "Hashes match" : "Hashes differ — record modified after minting"}
                </p>
              )}
            </section>

            <details className="card no-print group p-6">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold">
                <FlaskConical className="h-4 w-4 text-ink-3" /> Demo: test tamper detection
                <span className="ml-auto text-xs font-normal text-ink-3 group-open:hidden">Show</span>
              </summary>
              <p className="mt-3 text-xs text-ink-3">
                Simulates someone editing this batch&apos;s health score in the database. Verification recomputes the hash and flags the mismatch. Restore to put the original record back.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="danger" onClick={() => demo("tamper")} loading={demoBusy} disabled={b.tampered_health_score != null}>
                  <FlaskConical className="h-3.5 w-3.5" /> Tamper with record
                </Button>
                <Button size="sm" onClick={() => demo("restore")} loading={demoBusy} disabled={b.tampered_health_score == null}>
                  <RotateCcw className="h-3.5 w-3.5" /> Restore original
                </Button>
              </div>
            </details>

            <p className="text-center text-xs text-ink-3">Honey Chain · traceability prototype for KVIC (PS 26021)</p>
          </>
        )}
      </main>

      {b && (
        <Modal open={certOpen} onClose={() => setCertOpen(false)} title="Provenance certificate" size="lg"
          footer={<><Button onClick={() => setCertOpen(false)}>Close</Button><Button variant="primary" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button></>}>
          <div id="certificate" className="rounded-xl border-4 border-double border-brand/60 bg-[#fffaf0] p-6 text-[#2b1d0c]">
            <div className="border-b border-[#d9b36a] pb-4 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a5a17]">Honey Chain · Prototype for KVIC</p>
              <h3 className="mt-1 text-xl font-bold">Certificate of Honey Provenance</h3>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div><dt className="text-xs text-[#8a5a17]">Product</dt><dd className="font-semibold">{b.floral_source}</dd></div>
              <div><dt className="text-xs text-[#8a5a17]">Batch</dt><dd className="font-mono">{b.batch_id}</dd></div>
              <div><dt className="text-xs text-[#8a5a17]">Quantity</dt><dd>{b.weight_kg} kg</dd></div>
              <div><dt className="text-xs text-[#8a5a17]">Harvested</dt><dd>{formatDate(b.created_at)}</dd></div>
              <div><dt className="text-xs text-[#8a5a17]">Origin</dt><dd>{b.origin?.apiary ?? `Hive #${b.hive_id}`}{b.origin?.region ? `, ${b.origin.region}` : ""}</dd></div>
              <div><dt className="text-xs text-[#8a5a17]">Colony health</dt><dd>{b.health_score}/100</dd></div>
              <div className="col-span-2"><dt className="text-xs text-[#8a5a17]">Ledger anchor</dt><dd className="break-all font-mono text-xs">{shortHash(b.tx_hash, 24, 12)} (token #{b.token_id})</dd></div>
            </dl>
            <div className="mt-5 flex items-center justify-between border-t border-[#d9b36a] pt-4 text-xs">
              <span>Status: <strong>{b.is_revoked ? "REVOKED" : integrity?.verified ? "VERIFIED AUTHENTIC" : "UNVERIFIED"}</strong></span>
              <span>Checked {formatDateTime(new Date().toISOString())}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
