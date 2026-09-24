"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import { shortHash } from "@/lib/format";
import type { Batch } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

const FLORAL_SOURCES = ["Wildflower Honey", "Acacia Honey", "Mustard Honey", "Eucalyptus Honey", "Litchi Honey", "Jamun Honey", "Sundarbans Mangrove Honey", "Multiflora Honey"];

function QrBlock({ batchId, qr, url }: { batchId: string; qr: string; url: string }) {
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URI */}
      <img src={qr} alt={`QR code for batch ${batchId}`} className="h-40 w-40 rounded-lg bg-white p-2" />
      <div className="min-w-0 flex-1 space-y-3 text-sm">
        <div>
          <p className="label">Verification link</p>
          <div className="mt-1 flex items-center gap-1">
            <code className="truncate rounded bg-canvas px-2 py-1 text-xs text-ink-2">{url}</code>
            <CopyButton value={url} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={qr} download={`honeychain-${batchId}.png`}>
            <Button size="sm"><Download className="h-3.5 w-3.5" /> Download QR</Button>
          </a>
          <Link href={`/consumer/${batchId}`} target="_blank">
            <Button size="sm"><ExternalLink className="h-3.5 w-3.5" /> Open passport</Button>
          </Link>
        </div>
        <p className="text-xs text-ink-3">Print this on the jar label. Scanning opens the public provenance passport.</p>
      </div>
    </div>
  );
}

export function MintBatchDialog({
  open,
  onClose,
  hiveId,
  healthScore,
  suggestedWeight,
  onMinted,
}: {
  open: boolean;
  onClose: () => void;
  hiveId: number;
  healthScore: number;
  suggestedWeight: number;
  onMinted?: (b: Batch) => void;
}) {
  const [source, setSource] = useState(FLORAL_SOURCES[0]);
  const [custom, setCustom] = useState("");
  const [weight, setWeight] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minted, setMinted] = useState<Batch | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (open) {
      setWeight(suggestedWeight > 0 ? suggestedWeight.toFixed(1) : "");
      setMinted(null);
      setError(null);
    }
  }, [open, suggestedWeight]);

  const floral = source === "__custom" ? custom.trim() : source;
  const weightNum = Number(weight);
  const valid = floral.length >= 2 && weightNum > 0 && weightNum <= 500;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const b = await api.post<Batch>("/mint-batch/", { hive_id: hiveId, floral_source: floral, weight: weightNum, health_score: healthScore });
      setMinted(b);
      onMinted?.(b);
      toast({ kind: "success", title: `Batch ${b.batch_id} minted`, description: b.blockchain_mode === "sepolia" ? "Anchored on Sepolia." : "Anchored on the demo ledger." });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Minting failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={minted ? "Batch minted" : `Harvest & mint batch — Hive #${hiveId}`}
      description={minted ? `${minted.weight_kg} kg of ${minted.floral_source}` : "Creates a provenance record: metadata pinned to IPFS and a token anchored on the ledger."}
      footer={
        minted ? (
          <Button variant="primary" onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={submit} loading={busy} disabled={!valid}>Mint batch</Button>
          </>
        )
      }
    >
      {minted ? (
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="label">Batch ID</dt><dd className="mt-0.5 font-mono">{minted.batch_id}</dd></div>
            <div><dt className="label">Token</dt><dd className="mt-0.5 font-mono">#{minted.token_id}</dd></div>
            <div className="col-span-2">
              <dt className="label">Transaction</dt>
              <dd className="mt-0.5 flex items-center gap-1 font-mono text-xs text-ink-2">{shortHash(minted.tx_hash, 18, 10)} <CopyButton value={minted.tx_hash} /></dd>
            </div>
          </dl>
          {minted.qr_code && <QrBlock batchId={minted.batch_id} qr={minted.qr_code} url={minted.verification_url} />}
        </div>
      ) : (
        <div className="space-y-4">
          <label className="block">
            <span className="label">Floral source</span>
            <select value={source} onChange={(e) => setSource(e.target.value)} className="input mt-1">
              {FLORAL_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              <option value="__custom">Other…</option>
            </select>
          </label>
          {source === "__custom" && (
            <label className="block">
              <span className="label">Custom floral source</span>
              <input className="input mt-1" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="e.g. Coriander Honey" maxLength={80} />
            </label>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label">Extracted honey (kg)</span>
              <input className="input mt-1" type="number" inputMode="decimal" min="0.1" max="500" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />
              <span className="mt-1 block text-[11px] text-ink-3">Prefilled from the yield forecast</span>
            </label>
            <div>
              <span className="label">Colony health score</span>
              <div className="input mt-1 flex items-center bg-surface-2 tabular-nums">{healthScore}/100</div>
              <span className="mt-1 block text-[11px] text-ink-3">From live hive diagnostics</span>
            </div>
          </div>
          {error && <p className="rounded-lg border border-critical/30 bg-critical/10 px-3 py-2 text-sm text-[#ff8f8f]">{error}</p>}
        </div>
      )}
    </Modal>
  );
}

export function QrDialog({ batchId, onClose }: { batchId: string | null; onClose: () => void }) {
  const [data, setData] = useState<{ qr_code: string; verification_url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setData(null);
    setError(null);
    if (batchId) api.get<{ qr_code: string; verification_url: string }>(`/batches/${batchId}/qr`).then(setData).catch((e) => setError(e.message));
  }, [batchId]);
  return (
    <Modal open={!!batchId} onClose={onClose} title="Batch QR code" description={batchId ?? undefined}>
      {error ? <p className="text-sm text-critical">{error}</p> : data && batchId ? <QrBlock batchId={batchId} qr={data.qr_code} url={data.verification_url} /> : <div className="h-40 animate-pulse rounded-lg bg-surface-2" />}
    </Modal>
  );
}

const REVOKE_REASONS = [
  "Pesticide / antibiotic residue detected in lab test",
  "Excess moisture content — fermentation risk",
  "Adulteration with sugar syrup suspected",
  "Contamination safety recall",
];

export function RevokeDialog({ batch, onClose, onRevoked }: { batch: Batch | null; onClose: () => void; onRevoked?: () => void }) {
  const [reason, setReason] = useState(REVOKE_REASONS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    setReason(REVOKE_REASONS[0]);
    setError(null);
  }, [batch]);

  const submit = async () => {
    if (!batch) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/batches/${batch.batch_id}/revoke`, { reason });
      toast({ kind: "success", title: `Batch ${batch.batch_id} revoked`, description: "Consumers scanning this batch will now see a recall notice." });
      onRevoked?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Revocation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!batch}
      onClose={onClose}
      title="Revoke batch"
      description={batch ? `${batch.batch_id} · ${batch.floral_source} · ${batch.weight_kg} kg from Hive #${batch.hive_id}` : undefined}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={submit} loading={busy} disabled={reason.trim().length < 3}>Revoke batch</Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-ink-2">Revocation is permanent. The batch passport will show a KVIC safety recall to every consumer who scans it.</p>
        <label className="block">
          <span className="label">Reason</span>
          <input className="input mt-1" list="revoke-reasons" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
          <datalist id="revoke-reasons">{REVOKE_REASONS.map((r) => <option key={r} value={r} />)}</datalist>
        </label>
        {error && <p className="rounded-lg border border-critical/30 bg-critical/10 px-3 py-2 text-sm text-[#ff8f8f]">{error}</p>}
      </div>
    </Modal>
  );
}
