"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, QrCode, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";

const SAMPLES = [
  { id: "demo-batch-101", note: "Authentic" },
  { id: "demo-batch-104", note: "Recalled" },
  { id: "demo-batch-103", note: "Mangrove honey" },
];

export default function VerifyPage() {
  const router = useRouter();
  const [id, setId] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const clean = id.trim().split("/").filter(Boolean).pop() ?? "";
    if (clean) router.push(`/consumer/${encodeURIComponent(clean)}`);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4"><Link href="/"><Logo /></Link></div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-brand/15 text-brand">
          <QrCode className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Verify your honey</h1>
        <p className="mt-2 text-sm text-ink-3">
          Scan the QR code on the jar with your phone camera, or enter the batch code printed beneath it.
        </p>
        <form onSubmit={submit} className="mt-6 flex gap-2">
          <input value={id} onChange={(e) => setId(e.target.value)} placeholder="e.g. HC-1A2B3C4D" className="input h-10 font-mono" aria-label="Batch code" autoFocus />
          <Button variant="primary" className="h-10" disabled={!id.trim()}>Verify <ArrowRight className="h-4 w-4" /></Button>
        </form>
        <div className="mt-8">
          <p className="label mb-2">Try a sample batch</p>
          <ul className="divide-y divide-line rounded-xl border border-line">
            {SAMPLES.map((s) => (
              <li key={s.id}>
                <Link href={`/consumer/${s.id}`} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-surface-2/60">
                  <span className="font-mono">{s.id}</span>
                  <span className="text-xs text-ink-3">{s.note}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-8 flex items-start gap-2 text-xs text-ink-3">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Verification recomputes a cryptographic hash of the batch record and compares it with the one anchored when the honey was harvested.
        </p>
      </main>
    </div>
  );
}
