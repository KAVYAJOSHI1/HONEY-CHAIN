"use client";
import { useEffect, useState } from "react";
import { Activity, Boxes, BrainCircuit, Database, Globe, HardDrive, Radio, ScanSearch, Server, type LucideIcon } from "lucide-react";
import { API_URL, api, wsUrl } from "@/lib/api";
import { formatDateTime, timeAgo } from "@/lib/format";
import type { SystemHealth } from "@/lib/types";
import { Badge, Dot } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import type { Tone } from "@/lib/status";

function useHealth() {
  const [data, setData] = useState<SystemHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rtt, setRtt] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const t0 = performance.now();
      try {
        const h = await api.get<SystemHealth>("/system-health");
        if (!alive) return;
        setRtt(Math.round(performance.now() - t0));
        setData(h);
        setError(null);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Unreachable");
      }
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return { data, error, rtt };
}

function useWsProbe() {
  const [state, setState] = useState<"connecting" | "open" | "failed">("connecting");
  useEffect(() => {
    const ws = new WebSocket(wsUrl("/ws/alerts"));
    const timer = setTimeout(() => ws.readyState !== WebSocket.OPEN && setState("failed"), 5000);
    ws.onopen = () => setState("open");
    ws.onerror = () => setState("failed");
    return () => { clearTimeout(timer); ws.close(); };
  }, []);
  return state;
}

interface Service { name: string; icon: LucideIcon; status: string; tone: Tone; detail: string }

export default function SystemHealthPage() {
  const { data, error, rtt } = useHealth();
  const ws = useWsProbe();
  const up = !!data && !error;

  const services: Service[] = [
    { name: "Web app", icon: Globe, status: "Online", tone: "good", detail: "Next.js frontend (this page)" },
    { name: "API", icon: Server, status: up ? "Online" : error ? "Offline" : "Checking", tone: up ? "good" : error ? "critical" : "neutral", detail: up ? `v${data.version} · round trip ${rtt} ms` : error ?? API_URL },
    { name: "Database", icon: Database, status: data ? (data.database === "ONLINE" ? "Online" : "Offline") : "—", tone: data?.database === "ONLINE" ? "good" : data ? "critical" : "neutral", detail: data ? `${data.database_engine} · query ${data.latency_ms} ms` : "—" },
    { name: "Real-time channel", icon: Radio, status: ws === "open" ? "Connected" : ws === "failed" ? "Unavailable" : "Connecting", tone: ws === "open" ? "good" : ws === "failed" ? "critical" : "neutral", detail: data ? `WebSocket · ${data.websocket_clients} client(s)` : "WebSocket" },
    { name: "Anomaly model", icon: BrainCircuit, status: data?.isolation_forest === "TRAINED" ? "Trained" : data ? "Rule fallback" : "—", tone: data?.isolation_forest === "TRAINED" ? "good" : "warn", detail: "IsolationForest over temp / humidity / weight" },
    { name: "Varroa model", icon: ScanSearch, status: data?.varroa_model === "TRAINED" ? "Trained" : data?.yolo_model === "LOADED" ? "Simulated" : "—", tone: data?.varroa_model === "TRAINED" ? "good" : data?.yolo_model === "LOADED" ? "warn" : "neutral", detail: data?.varroa_model === "TRAINED" ? "YOLOv8n-cls trained on EV2 bee images" : "Prototype (simulated inference)" },
    { name: "Blockchain", icon: Boxes, status: data?.blockchain_mode === "SEPOLIA" ? "Sepolia" : data ? "Demo ledger" : "—", tone: data?.blockchain_mode === "SEPOLIA" ? "good" : "warn", detail: data?.blockchain_mode === "SEPOLIA" ? "ERC-721 HoneyBatch on Sepolia" : "SHA-256 anchors, no on-chain tx" },
    { name: "IPFS", icon: HardDrive, status: data?.ipfs_mode === "LIVE" ? "Live" : data ? "Mock" : "—", tone: data?.ipfs_mode === "LIVE" ? "good" : "warn", detail: "Deterministic content IDs" },
  ];

  return (
    <>
      <PageHeader
        title="System health"
        description="Live status of every service in the stack. Refreshes every 5 seconds."
        meta={<Badge tone={up ? "good" : error ? "critical" : "neutral"}>{up ? "Operational" : error ? "Degraded" : "Checking…"}</Badge>}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {services.map((s) => (
          <div key={s.name} className="card p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium"><s.icon className="h-4 w-4 text-ink-3" /> {s.name}</span>
              <Dot tone={s.tone} pulse={s.tone === "good"} />
            </div>
            <p className="mt-3 text-lg font-semibold">{s.status}</p>
            <p className="mt-0.5 truncate text-xs text-ink-3" title={s.detail}>{s.detail}</p>
          </div>
        ))}
      </div>
      <Card>
        <CardHeader icon={<Activity className="h-4 w-4" />} title="Telemetry pipeline" />
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <div><p className="label">Last reading received</p><p className="mt-1 text-sm">{data?.last_telemetry ? `${timeAgo(data.last_telemetry)} (${formatDateTime(data.last_telemetry)})` : "—"}</p></div>
          <div><p className="label">API endpoint</p><p className="mt-1 break-all font-mono text-xs text-ink-2">{API_URL}</p></div>
          <div><p className="label">Browser round trip</p><p className="mt-1 text-sm tabular-nums">{rtt != null ? `${rtt} ms` : "—"}</p></div>
        </div>
      </Card>
    </>
  );
}
