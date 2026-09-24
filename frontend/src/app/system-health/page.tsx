"use client";
import { useState, useEffect } from 'react';
import GlobalNavbar from '@/components/GlobalNavbar';
import HoneyBot from '@/components/HoneyBot';

export default function SystemHealthPage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/system-health`);
        if (res.ok) {
          setHealth(await res.json());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <GlobalNavbar title="System Health 2.0" role="admin" />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8 border-b border-slate-800 pb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-amber-400 to-orange-400">
              ⚡ System Health & Node Diagnostics 2.0
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Live service status monitoring for hackathon demo validation and API latency checks.
            </p>
          </div>
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-mono font-bold">
            Auto-Polling Active (5s)
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse">Pinging microservice stack...</div>
        ) : !health ? (
          <div className="p-12 text-center text-red-400">Failed to connect to backend health endpoint.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
              <div className="text-xs text-slate-400 font-semibold mb-2 uppercase">Next.js Frontend</div>
              <div className="text-2xl font-black text-emerald-400">{health.frontend}</div>
              <div className="text-xs text-slate-500 mt-1">Next.js 14 Dev/Prod</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
              <div className="text-xs text-slate-400 font-semibold mb-2 uppercase">FastAPI Backend</div>
              <div className="text-2xl font-black text-emerald-400">{health.backend}</div>
              <div className="text-xs text-slate-500 mt-1">Latency: {health.latency_ms} ms</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
              <div className="text-xs text-slate-400 font-semibold mb-2 uppercase">PostgreSQL Database</div>
              <div className="text-2xl font-black text-emerald-400">{health.database}</div>
              <div className="text-xs text-slate-500 mt-1">SQLAlchemy ORM Engine</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
              <div className="text-xs text-slate-400 font-semibold mb-2 uppercase">YOLO Vision Model</div>
              <div className="text-2xl font-black text-amber-400">{health.yolo_model}</div>
              <div className="text-xs text-slate-500 mt-1">Varroa & Bee Detection</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
              <div className="text-xs text-slate-400 font-semibold mb-2 uppercase">IsolationForest ML</div>
              <div className="text-2xl font-black text-amber-400">{health.isolation_forest}</div>
              <div className="text-xs text-slate-500 mt-1">Anomaly Detector</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
              <div className="text-xs text-slate-400 font-semibold mb-2 uppercase">Blockchain Network</div>
              <div className="text-2xl font-black text-blue-400">{health.blockchain_mode}</div>
              <div className="text-xs text-slate-500 mt-1">ERC-721 HoneyBatch</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
              <div className="text-xs text-slate-400 font-semibold mb-2 uppercase">IPFS Storage</div>
              <div className="text-2xl font-black text-purple-400">{health.ipfs_mode}</div>
              <div className="text-xs text-slate-500 mt-1">Decentralized Metadata</div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
              <div className="text-xs text-slate-400 font-semibold mb-2 uppercase">WebSockets</div>
              <div className="text-2xl font-black text-emerald-400">{health.websocket}</div>
              <div className="text-xs text-slate-500 mt-1">Real-time Ingestion Feed</div>
            </div>
          </div>
        )}
      </main>

      <HoneyBot />
    </div>
  );
}
