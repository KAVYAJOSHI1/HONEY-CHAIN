"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import GlobalNavbar from '@/components/GlobalNavbar';

export default function BeekeeperDashboard() {
  const [isSyncing, setIsSyncing] = useState(true);
  const [hives, setHives] = useState<any[]>([]);
  const [kpis, setKpis] = useState<{ total_hives: number; total_batches: number; alerts: number } | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [simulating, setSimulating] = useState<string | null>(null);
  const [simTargetHive, setSimTargetHive] = useState<number>(1);
  const [simFeedback, setSimFeedback] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsSyncing(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const fetchData = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const [hivesRes, kpisRes, alertsRes] = await Promise.all([
        fetch(`${apiUrl}/hives/`),
        fetch(`${apiUrl}/stats/kpis`),
        fetch(`${apiUrl}/alerts`)
      ]);
      
      if (hivesRes.ok) setHives(await hivesRes.json());
      if (kpisRes.ok) setKpis(await kpisRes.json());
      if (alertsRes.ok) setAlerts(await alertsRes.json());
    } catch {
      console.error("Failed to fetch dashboard data");
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  const triggerScenario = async (scenario: string) => {
    setSimulating(scenario);
    setSimFeedback(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/simulate-scenario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hive_id: simTargetHive, scenario })
      });
      if (res.ok) {
        const data = await res.json();
        setSimFeedback(`✓ Scenario '${scenario}' injected into Hive #${simTargetHive}! Alerts generated: ${data.alerts_generated}`);
        await fetchData();
      }
    } catch (e: any) {
      setSimFeedback(`Failed: ${e.message}`);
    } finally {
      setSimulating(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-amber-500 selection:text-slate-950">
      <GlobalNavbar title="Smart Beekeeper Portal" role="beekeeper" />

      <div className="p-8 max-w-7xl mx-auto space-y-8">

        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-6 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-100 flex items-center gap-3">
              🐝 Beekeeper Fleet Operations
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Real-time IoT Telemetry Ingestion • AI Frame Health Diagnostics • ERC-721 Token Minting
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>FastAPI & IoT Node Live</span>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-amber-400 flex items-center space-x-2 font-mono">
              <span>🧠 IsolationForest ML: ACTIVE</span>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Total Managed Hives</div>
            <div className="text-4xl font-extrabold text-slate-100 font-mono">{kpis?.total_hives || 0}</div>
            <div className="text-xs text-slate-500 mt-2">Active telemetry sensors deployed</div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur relative overflow-hidden group hover:border-amber-500/30 transition-all">
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Minted Honey Batches</div>
            <div className="text-4xl font-extrabold text-amber-400 font-mono">{kpis?.total_batches || 0}</div>
            <div className="text-xs text-slate-500 mt-2">Anchored to Etherscan / IPFS Metadata</div>
          </div>

          <div className={`bg-slate-900/80 border rounded-2xl p-6 backdrop-blur relative overflow-hidden transition-all ${kpis?.alerts && kpis.alerts > 0 ? 'border-red-500/50 bg-red-500/5' : 'border-slate-800'}`}>
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 flex justify-between">
              <span>Active Hive Alerts</span>
              {kpis?.alerts && kpis.alerts > 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>}
            </div>
            <div className={`text-4xl font-extrabold font-mono ${kpis?.alerts && kpis.alerts > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {kpis?.alerts || 0}
            </div>
            <div className="text-xs text-slate-500 mt-2">Telemetry threshold & ML anomaly spikes</div>
          </div>
        </div>

        {/* 1-Click Interactive IoT Scenario Simulator Widget */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/30 border border-amber-500/30 rounded-2xl p-6 relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
            <div>
              <h2 className="text-lg font-bold text-amber-300 flex items-center gap-2">
                ⚡ Interactive IoT Telemetry Simulator (Hackathon Demo Control)
              </h2>
              <p className="text-slate-400 text-xs mt-1">
                Inject real-time simulated IoT sensor events into any hive to test anomaly detection, alerts, and harvest logic instantly.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-xs text-slate-400 font-medium">Target Hive:</label>
              <select 
                value={simTargetHive} 
                onChange={(e) => setSimTargetHive(Number(e.target.value))}
                className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 outline-none font-bold"
              >
                {hives.map(h => (
                  <option key={h.id} value={h.id}>Hive #{h.id}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <button
              onClick={() => triggerScenario('HIGH_TEMPERATURE')}
              disabled={simulating !== null}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 p-3 rounded-xl text-left transition-all text-xs font-semibold disabled:opacity-50"
            >
              ☀️ Heatwave Overheat
              <span className="block text-[10px] text-red-400/80 font-normal mt-0.5">Temp &gt; 38°C (Critical)</span>
            </button>

            <button
              onClick={() => triggerScenario('WEIGHT_DROP')}
              disabled={simulating !== null}
              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 p-3 rounded-xl text-left transition-all text-xs font-semibold disabled:opacity-50"
            >
              🐝 Weight Drop / Swarming
              <span className="block text-[10px] text-amber-400/80 font-normal mt-0.5">Drop &gt; 1kg (Robbery)</span>
            </button>

            <button
              onClick={() => triggerScenario('WEIGHT_INCREASE')}
              disabled={simulating !== null}
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 p-3 rounded-xl text-left transition-all text-xs font-semibold disabled:opacity-50"
            >
              🍯 Nectar Surge (Harvest)
              <span className="block text-[10px] text-emerald-400/80 font-normal mt-0.5">Weight &gt; 32kg Ready</span>
            </button>

            <button
              onClick={() => triggerScenario('HIGH_HUMIDITY')}
              disabled={simulating !== null}
              className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 p-3 rounded-xl text-left transition-all text-xs font-semibold disabled:opacity-50"
            >
              💧 High Moisture Spike
              <span className="block text-[10px] text-blue-400/80 font-normal mt-0.5">Humidity &gt; 70%</span>
            </button>

            <button
              onClick={() => triggerScenario('NORMAL')}
              disabled={simulating !== null}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 p-3 rounded-xl text-left transition-all text-xs font-semibold disabled:opacity-50"
            >
              🟢 Normal Stream
              <span className="block text-[10px] text-slate-400 font-normal mt-0.5">Ideal Parameters</span>
            </button>
          </div>

          {simFeedback && (
            <div className="mt-4 p-3 bg-slate-950 border border-amber-500/40 rounded-xl text-xs font-mono text-amber-300">
              {simFeedback}
            </div>
          )}
        </div>

        {/* Hive Fleet Status Grid */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <span>Managed Apiary Hives</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-normal">{hives.length} Hives Active</span>
            </h2>
          </div>

          {hives.length === 0 ? (
            <div className="text-center text-slate-500 py-16 bg-slate-900/40 rounded-2xl border border-slate-800 border-dashed">
              No hives found. Click &quot;Reset Demo&quot; in the top bar to populate sample apiaries.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {hives.map(hive => (
                <Link href={`/beekeeper/hives/${hive.id}`} key={hive.id}>
                  <div className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/60 rounded-2xl p-6 transition-all hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] cursor-pointer relative overflow-hidden group flex flex-col justify-between">
                    <div className={`absolute top-0 left-0 w-1.5 h-full ${hive.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>

                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-slate-100 group-hover:text-amber-400 transition-colors">
                            Hive #{hive.id}
                          </h3>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">
                            GPS: {hive.gps_lat}, {hive.gps_long}
                          </p>
                        </div>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${hive.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'}`}>
                          {hive.status}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800/80 flex justify-between items-center text-xs">
                      <span className="text-slate-400">View Telemetry & AI &rarr;</span>
                      <span className="text-slate-500 font-mono">{new Date(hive.installed_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Alerts Feed */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
            Live Telemetry Alert Feed
          </h2>

          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="text-sm text-slate-500 py-6 text-center bg-slate-950/50 rounded-xl border border-slate-800">
                No active health alerts. All hives operating in optimal thermal and weight conditions.
              </div>
            ) : (
              alerts.slice(0, 5).map((a: any) => (
                <div key={a.id} className={`p-4 rounded-xl border flex justify-between items-center text-xs font-mono ${a.severity === 'CRITICAL' ? 'bg-red-500/10 border-red-500/30 text-red-300' : a.severity === 'WARNING' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'}`}>
                  <div>
                    <span className="font-bold font-sans text-sm">Hive #{a.hive_id}:</span> {a.reason}
                  </div>
                  <div className="text-right opacity-80 text-[10px]">
                    {new Date(a.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
