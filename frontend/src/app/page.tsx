"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BrainCircuit, Building2, Hexagon, Link2, QrCode, Radio, ShieldCheck, Wheat } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import type { Kpis } from "@/lib/types";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";

const PORTALS = [
  {
    href: "/beekeeper",
    icon: Hexagon,
    title: "Beekeeper portal",
    body: "Live hive telemetry, explainable health scores, Varroa frame inspection, yield forecasts and one-step batch minting.",
    cta: "Open hive fleet",
  },
  {
    href: "/admin",
    icon: Building2,
    title: "KVIC command center",
    body: "National apiary map, disease surveillance, batch registry with recalls, security integrity checks and exportable reports.",
    cta: "Open command center",
  },
  {
    href: "/verify",
    icon: QrCode,
    title: "Consumer verification",
    body: "Scan a jar to see where the honey came from, the colony's health at harvest, and a tamper-evident proof of the record.",
    cta: "Verify a batch",
  },
];

const STEPS = [
  { icon: Radio, title: "Sense", body: "ESP32 nodes stream hive temperature, humidity and weight." },
  { icon: BrainCircuit, title: "Analyze", body: "Rules, an IsolationForest model and frame inspection score colony health." },
  { icon: Link2, title: "Anchor", body: "At harvest, the batch record is hashed, pinned to IPFS and minted as an ERC-721 token." },
  { icon: ShieldCheck, title: "Verify", body: "Consumers scan the QR; the record is re-hashed and checked against its anchor." },
];

export default function Home() {
  const router = useRouter();
  const [id, setId] = useState("");
  const { data: kpis } = useApi<Kpis>("/stats/kpis");

  const verify = (e: FormEvent) => {
    e.preventDefault();
    if (id.trim()) router.push(`/consumer/${encodeURIComponent(id.trim())}`);
  };

  const stats = [
    { label: "Hives monitored", value: kpis?.total_hives },
    { label: "Apiaries", value: kpis?.clusters },
    { label: "Batches on ledger", value: kpis?.total_batches },
    { label: "Harvest ready now", value: kpis?.harvest_ready_hives },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/beekeeper" className="hidden rounded-lg px-3 py-2 text-ink-2 hover:text-ink sm:block">Beekeepers</Link>
            <Link href="/admin" className="hidden rounded-lg px-3 py-2 text-ink-2 hover:text-ink sm:block">KVIC</Link>
            <Link href="/verify"><Button size="sm" variant="primary">Verify honey</Button></Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-line">
          <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-brand/10 blur-3xl" />
          <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-line-strong px-3 py-1 text-xs text-ink-2">
              <Wheat className="h-3.5 w-3.5 text-brand" /> Smart beekeeping &amp; honey traceability · PS 26021
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
              Every jar of honey, <span className="text-brand">traceable to its hive.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-ink-2">
              Honey Chain connects IoT hive sensors, AI colony-health analysis and a tamper-evident ledger, giving beekeepers early warnings, KVIC national oversight, and consumers proof of origin.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/beekeeper"><Button variant="primary" className="h-11 px-5">Open beekeeper portal <ArrowRight className="h-4 w-4" /></Button></Link>
              <Link href="/admin"><Button className="h-11 px-5">KVIC command center</Button></Link>
            </div>
            <form onSubmit={verify} className="mt-10 flex max-w-md gap-2">
              <input value={id} onChange={(e) => setId(e.target.value)} placeholder="Have a jar? Enter its batch code" className="input h-11" aria-label="Batch code" />
              <Button className="h-11" disabled={!id.trim()}>Verify</Button>
            </form>
          </div>
        </section>

        <section className="border-b border-line bg-surface/50">
          <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 md:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="label">{s.label}</dt>
                <dd className="mt-1 text-3xl font-semibold tabular-nums">{s.value ?? <span className="inline-block h-8 w-12 animate-pulse rounded bg-surface-3 align-middle" />}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">One platform, three portals</h2>
          <p className="mt-2 text-ink-3">Each stakeholder gets the view they need, backed by the same data.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PORTALS.map((p) => (
              <Link key={p.href} href={p.href} className="card group flex flex-col p-6 transition hover:border-brand/50">
                <span className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand"><p.icon className="h-5 w-5" /></span>
                <h3 className="font-semibold">{p.title}</h3>
                <p className="mt-2 flex-1 text-sm text-ink-3">{p.body}</p>
                <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-brand">{p.cta} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
              </Link>
            ))}
          </div>
        </section>

        <section className="border-t border-line bg-surface/50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
            <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s, i) => (
                <li key={s.title}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-line-strong text-brand"><s.icon className="h-4 w-4" /></span>
                    <span className="text-xs tabular-nums text-ink-3">0{i + 1}</span>
                  </div>
                  <h3 className="mt-4 font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-ink-3">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-ink-3 sm:px-6">
          <span>Honey Chain — hackathon prototype for KVIC (PS 26021)</span>
          <span className="flex gap-4">
            <Link href="/system-health" className="hover:text-ink">System status</Link>
            <Link href="/verify" className="hover:text-ink">Verify a batch</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
