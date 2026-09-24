"use client";
import Link from 'next/link';
import { useState, useEffect } from 'react';
import GlobalNavbar from '@/components/GlobalNavbar';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ hives: 0, batches: 0, revoked: 0, verified: 0 });
  const [hivesList, setHivesList] = useState<any[]>([]);
  const [batchesList, setBatchesList] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [sysHealth, setSysHealth] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [revokeBatchId, setRevokeBatchId] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeStatus, setRevokeStatus] = useState<{ type: 'success'|'error', msg: string } | null>(null);
  const [alertFilter, setAlertFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING'>('ALL');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'containment' | 'registry'>('dashboard');

  useEffect(() => {
    async function fetchData() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const [hivesRes, batchesRes, healthRes, alertsRes] = await Promise.all([
          fetch(`${apiUrl}/hives/`),
          fetch(`${apiUrl}/batches/`),
          fetch(`${apiUrl}/system-health`),
          fetch(`${apiUrl}/alerts`)
        ]);
        
        const hives = await hivesRes.json();
        const batches = await batchesRes.json();
        if (healthRes.ok) setSysHealth(await healthRes.json());
        if (alertsRes.ok) setAlerts(await alertsRes.json());
        
        const revoked = batches.filter((b: any) => b.is_revoked).length;
        setStats({
          hives: hives.length,
          batches: batches.length,
          revoked,
          verified: batches.length - revoked
        });
        setHivesList(hives);
        setBatchesList(batches);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleRevoke = async (e: React.FormEvent) => {
    e.preventDefault();
    setRevokeStatus(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/batches/${revokeBatchId}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: revokeReason })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || "Failed to revoke batch");
      }
      setRevokeStatus({ type: 'success', msg: `Batch ${revokeBatchId} revoked successfully.` });
      setStats(prev => ({ ...prev, revoked: prev.revoked + 1, verified: prev.verified - 1 }));
      setRevokeBatchId('');
      setRevokeReason('');
      
      const batchesRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/batches/`);
      if (batchesRes.ok) setBatchesList(await batchesRes.json());
    } catch (e: any) {
      setRevokeStatus({ type: 'error', msg: e.message });
    }
  };

  const handleTabClick = (tab: 'dashboard' | 'containment' | 'registry', targetId: string) => {
    setActiveTab(tab);
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const filteredAlerts = alerts.filter(a => {
    if (alertFilter === 'CRITICAL') return a.severity === 'CRITICAL';
    if (alertFilter === 'WARNING') return a.severity === 'WARNING';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col selection:bg-blue-500 selection:text-slate-950">
      <GlobalNavbar title="KVIC Command Center" role="admin" />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-64 bg-slate-900/60 border-r border-slate-800 p-6 hidden md:flex flex-col justify-between">
          <div className="space-y-6">
            <div className="text-xs font-bold uppercase text-slate-500 tracking-wider">KVIC Authority</div>
            <nav className="space-y-2 text-xs font-semibold">
              <button 
                onClick={() => handleTabClick('dashboard', 'dashboard-top')}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all border flex items-center justify-between ${activeTab === 'dashboard' ? 'bg-blue-500/15 text-blue-400 border-blue-500/40 shadow-lg' : 'hover:bg-slate-800 text-slate-400 border-transparent'}`}
              >
                <span>National Dashboard</span>
                <span className={`w-2 h-2 rounded-full ${activeTab === 'dashboard' ? 'bg-blue-400 animate-pulse' : 'bg-slate-600'}`}></span>
              </button>

              <button 
                onClick={() => handleTabClick('containment', 'containment-section')}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all border flex items-center justify-between ${activeTab === 'containment' ? 'bg-red-500/15 text-red-400 border-red-500/40 shadow-lg' : 'hover:bg-slate-800 text-slate-400 border-transparent'}`}
              >
                <span>Disease Containment</span>
                <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-mono font-bold">{alerts.length}</span>
              </button>

              <button 
                onClick={() => handleTabClick('registry', 'registry-section')}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all border flex items-center justify-between ${activeTab === 'registry' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-lg' : 'hover:bg-slate-800 text-slate-400 border-transparent'}`}
              >
                <span>Batch Registry</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold">{batchesList.length}</span>
              </button>
            </nav>
          </div>

          {/* System Mode Card */}
          {sysHealth && (
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2 text-[11px] font-mono">
              <div className="text-slate-400 font-bold font-sans">System Diagnostics</div>
              <div className="flex justify-between"><span className="text-slate-500">API:</span> <span className="text-emerald-400">{sysHealth.backend}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Database:</span> <span className="text-emerald-400">{sysHealth.database}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Chain Mode:</span> <span className="text-amber-400">{sysHealth.blockchain_mode}</span></div>
            </div>
          )}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-8 overflow-y-auto space-y-8">
          
          <div id="dashboard-top" className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-100 flex items-center gap-3">
                🇮🇳 Khadi & Village Industries Commission (KVIC)
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                National Honey Traceability Registry & Smart Apiary Disease Surveillance Command
              </p>
            </div>
            <div className="px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-mono font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
              KVIC Official Ledger Node Active
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Registered Hives" value={loading ? "..." : stats.hives.toString()} subtitle="Active IoT Telemetry Nodes" />
            <StatCard title="Total Minted Batches" value={loading ? "..." : stats.batches.toString()} color="text-blue-400" subtitle="Sepolia NFT Tokens" />
            <StatCard title="Verified Consumer Batches" value={loading ? "..." : stats.verified.toString()} color="text-emerald-400" subtitle="Authenticity Passed" />
            <StatCard title="KVIC Revoked Batches" value={loading ? "..." : stats.revoked.toString()} color="text-red-400" subtitle="Safety Recalls Active" />
          </div>

          {/* Disease Risk Center & Geographic Map Grid */}
          <div id="containment-section" className="grid grid-cols-1 lg:grid-cols-3 gap-8 scroll-mt-6">
            
            {/* Disease Risk Center */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 lg:col-span-2 shadow-xl">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                    National Disease Risk Surveillance Center
                  </h2>
                  <p className="text-slate-400 text-xs mt-0.5">Automated telemetry anomaly spikes and YOLO parasite detections</p>
                </div>
                <div className="flex space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
                  <button 
                    onClick={() => setAlertFilter('ALL')}
                    className={`px-3 py-1 rounded-lg transition-colors ${alertFilter === 'ALL' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    All ({alerts.length})
                  </button>
                  <button 
                    onClick={() => setAlertFilter('CRITICAL')}
                    className={`px-3 py-1 rounded-lg transition-colors ${alertFilter === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Critical
                  </button>
                  <button 
                    onClick={() => setAlertFilter('WARNING')}
                    className={`px-3 py-1 rounded-lg transition-colors ${alertFilter === 'WARNING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'}`}
                  >
                    Warning
                  </button>
                </div>
              </div>
              
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {filteredAlerts.length === 0 ? (
                  <div className="text-xs text-slate-500 bg-slate-950 p-8 rounded-xl border border-slate-800 text-center">
                    No active disease alerts matching filter. All monitored apiary clusters are within safe parameters.
                  </div>
                ) : (
                  filteredAlerts.map((a: any, i: number) => (
                    <div key={i} className={`flex justify-between items-center p-4 rounded-xl border text-xs font-mono ${a.severity === 'CRITICAL' ? 'bg-red-500/10 border-red-500/30 text-red-300' : a.severity === 'WARNING' ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'}`}>
                      <div>
                        <div className="font-bold font-sans text-sm">Hive #{a.hive_id} Alert</div>
                        <div className="text-xs mt-1 opacity-90">{a.reason}</div>
                      </div>
                      <div className="text-right">
                        <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded ${a.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {a.severity}
                        </span>
                        <div className="text-[10px] opacity-70 mt-1">{new Date(a.timestamp).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Geographic Heatmap */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col h-full min-h-[320px] relative overflow-hidden group shadow-xl">
              <div className="flex justify-between items-center mb-4 z-10">
                <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>GIS Apiary Cluster Map</span>
                </h2>
                <span className="text-[10px] px-2 py-0.5 bg-slate-950 text-amber-400 border border-amber-500/30 rounded font-mono">LIVE GPS</span>
              </div>

              {/* Simulated Map Visual Canvas */}
              <div className="flex-1 rounded-xl bg-slate-950 border border-slate-800 relative p-4 flex flex-col justify-between overflow-hidden">
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px]"></div>
                
                {/* Cluster Pins */}
                <div className="absolute top-1/4 left-1/3 group/pin cursor-pointer">
                  <div className="w-3.5 h-3.5 bg-emerald-500 rounded-full animate-ping absolute"></div>
                  <div className="w-3.5 h-3.5 bg-emerald-500 rounded-full relative border-2 border-slate-900"></div>
                  <div className="absolute top-5 left-0 bg-slate-900 border border-slate-700 text-[10px] text-slate-200 px-2 py-1 rounded shadow-lg whitespace-nowrap hidden group-hover/pin:block z-20">
                    Dehradun Cluster (Hive #1, #2) • Healthy
                  </div>
                </div>

                <div className="absolute top-2/3 left-1/2 group/pin cursor-pointer">
                  <div className="w-3.5 h-3.5 bg-emerald-500 rounded-full animate-ping absolute"></div>
                  <div className="w-3.5 h-3.5 bg-emerald-500 rounded-full relative border-2 border-slate-900"></div>
                  <div className="absolute top-5 left-0 bg-slate-900 border border-slate-700 text-[10px] text-slate-200 px-2 py-1 rounded shadow-lg whitespace-nowrap hidden group-hover/pin:block z-20">
                    Wayanad Biosphere (Hive #3) • Optimal
                  </div>
                </div>

                <div className="absolute top-1/2 right-1/4 group/pin cursor-pointer">
                  <div className="w-3.5 h-3.5 bg-red-500 rounded-full animate-ping absolute" style={{ animationDuration: '1s' }}></div>
                  <div className="w-3.5 h-3.5 bg-red-500 rounded-full relative border-2 border-slate-900"></div>
                  <div className="absolute top-5 right-0 bg-slate-900 border border-slate-700 text-[10px] text-red-300 px-2 py-1 rounded shadow-lg whitespace-nowrap hidden group-hover/pin:block z-20">
                    Sundarbans Hub (Hive #4) • Overheating
                  </div>
                </div>

                <div className="mt-auto z-10 text-[11px] text-slate-400 bg-slate-900/80 backdrop-blur p-2.5 rounded-lg border border-slate-800 flex justify-between items-center font-mono">
                  <span>Active Apiary Clusters: 3</span>
                  <span className="text-emerald-400 font-bold">98.2% Coverage</span>
                </div>
              </div>
            </div>

          </div>
          
          {/* Tables & Batch Management Section */}
          <div id="registry-section" className="grid grid-cols-1 lg:grid-cols-3 gap-8 scroll-mt-6">
            
            {/* Batches Table */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 lg:col-span-2 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-100">National Honey Batch Ledger & Registry</h2>
                <span className="text-xs text-slate-400 font-mono">{batchesList.length} Batches Registered</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="text-[10px] uppercase bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3 font-bold">Batch ID</th>
                      <th className="px-4 py-3 font-bold">Origin Hive</th>
                      <th className="px-4 py-3 font-bold">Status</th>
                      <th className="px-4 py-3 font-bold">Token ID</th>
                      <th className="px-4 py-3 font-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {batchesList.map((b, i) => (
                      <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 text-slate-200 font-bold">{b.batch_id}</td>
                        <td className="px-4 py-3 text-slate-400">Hive #{b.hive_id}</td>
                        <td className="px-4 py-3">
                          {b.is_revoked ? (
                            <span className="text-red-400 bg-red-500/10 px-2 py-0.5 rounded text-[10px] font-bold border border-red-500/30">REVOKED</span>
                          ) : (
                            <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] font-bold border border-emerald-500/30">VERIFIED</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-400">#{b.token_id}</td>
                        <td className="px-4 py-3">
                          <button 
                            onClick={() => { setRevokeBatchId(b.batch_id); setRevokeReason("Contamination safety recall notice"); }}
                            className="text-[10px] text-amber-400 hover:underline font-sans"
                          >
                            Select for Revoke
                          </button>
                        </td>
                      </tr>
                    ))}
                    {batchesList.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500 font-sans">No batches minted yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Revoke Batch Action Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl h-fit">
              <h2 className="text-lg font-bold text-red-400 mb-2 flex items-center gap-2">
                <span>⚠️ Authorized Batch Revocation</span>
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Execute official KVIC safety recall to burn or mark batch as revoked on public verification portals.
              </p>

              <form onSubmit={handleRevoke} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Target Batch ID</label>
                  <input 
                    type="text" 
                    required 
                    value={revokeBatchId}
                    onChange={e => setRevokeBatchId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-xs font-mono"
                    placeholder="Enter Batch ID or select from list"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Official Revocation Reason</label>
                  <input 
                    type="text" 
                    required 
                    value={revokeReason}
                    onChange={e => setRevokeReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-xs"
                    placeholder="e.g. Oxytetracycline pesticide residue detected"
                  />
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/50 font-bold py-3 rounded-xl transition-all text-xs shadow-lg"
                >
                  Execute KVIC Revocation Notice
                </button>
              </form>

              {revokeStatus && (
                <div className={`mt-4 p-3 rounded-xl text-xs font-mono ${revokeStatus.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'}`}>
                  {revokeStatus.msg}
                </div>
              )}
            </div>

          </div>

        </main>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, color = "text-slate-100" }: { title: string, value: string, subtitle?: string, color?: string }) {
  return (
    <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl hover:border-slate-700 transition-all">
      <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">{title}</div>
      <div className={`text-4xl font-extrabold font-mono mb-1 ${color}`}>{value}</div>
      {subtitle && <div className="text-[11px] text-slate-500">{subtitle}</div>}
    </div>
  );
}
