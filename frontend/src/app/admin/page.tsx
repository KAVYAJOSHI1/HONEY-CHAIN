"use client";
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ hives: 0, batches: 0, revoked: 0, verified: 0 });
  const [loading, setLoading] = useState(true);
  const [revokeBatchId, setRevokeBatchId] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeStatus, setRevokeStatus] = useState<{ type: 'success'|'error', msg: string } | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const [hivesRes, batchesRes] = await Promise.all([
          fetch(`${apiUrl}/hives/`),
          fetch(`${apiUrl}/batches/`)
        ]);
        const hives = await hivesRes.json();
        const batches = await batchesRes.json();
        
        const revoked = batches.filter((b: { is_revoked: boolean }) => b.is_revoked).length;
        setStats({
          hives: hives.length,
          batches: batches.length,
          revoked,
          verified: batches.length - revoked
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
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
    } catch (e: unknown) {
      setRevokeStatus({ type: 'error', msg: (e as Error).message });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link href="/" className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            Honey Chain KVIC
          </Link>
          <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30">Command Center</span>
        </div>
        <div className="text-sm text-slate-400">
          Admin: <span className="text-slate-200">admin.kvic.eth</span>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900/50 border-r border-slate-800 p-4 hidden md:block">
          <nav className="space-y-2">
            <div className="px-4 py-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 font-medium">Dashboard</div>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-100 mb-1">National Cluster Health</h1>
              <p className="text-slate-400 text-sm">Real-time overview of active clusters and disease risks.</p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <StatCard title="Total Hives" value={loading ? "..." : stats.hives.toString()} />
            <StatCard title="Total Batches" value={loading ? "..." : stats.batches.toString()} color="text-blue-400" />
            <StatCard title="Verified Batches" value={loading ? "..." : stats.verified.toString()} color="text-emerald-400" />
            <StatCard title="Revoked Batches" value={loading ? "..." : stats.revoked.toString()} color="text-red-400" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Revoke Batch Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-bold text-red-400 mb-4 flex items-center">
                <span className="mr-2">⚠</span> Revoke Batch (Admin Action)
              </h2>
              <form onSubmit={handleRevoke} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Batch ID</label>
                  <input 
                    type="text" 
                    required 
                    value={revokeBatchId}
                    onChange={e => setRevokeBatchId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                    placeholder="Enter unique batch UUID"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-bold uppercase mb-1">Revocation Reason</label>
                  <input 
                    type="text" 
                    required 
                    value={revokeReason}
                    onChange={e => setRevokeReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                    placeholder="e.g. Contamination detected"
                  />
                </div>
                <button type="submit" className="w-full bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500 hover:text-white font-bold py-2 rounded-lg transition-colors">
                  Revoke Now
                </button>
              </form>
              {revokeStatus && (
                <div className={`mt-4 p-3 rounded-lg text-sm ${revokeStatus.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                  {revokeStatus.msg}
                </div>
              )}
            </div>

            {/* Geographic Heatmap (Simulated) */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-1 flex flex-col h-full min-h-[300px] relative overflow-hidden group">
              <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
              
              <div className="absolute top-1/4 left-1/4">
                <div className="w-4 h-4 bg-emerald-500 rounded-full animate-ping absolute"></div>
                <div className="w-4 h-4 bg-emerald-500 rounded-full relative border-2 border-slate-900"></div>
              </div>
              
              <div className="absolute bottom-1/4 left-1/2">
                <div className="w-4 h-4 bg-red-500 rounded-full animate-ping absolute" style={{ animationDuration: '1s' }}></div>
                <div className="w-4 h-4 bg-red-500 rounded-full relative border-2 border-slate-900 shadow-[0_0_15px_rgba(239,68,68,0.8)]"></div>
              </div>

              <div className="mt-auto bg-slate-950/80 backdrop-blur border-t border-slate-800 p-4 z-10">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 font-semibold flex items-center">
                    <span className="px-2 py-0.5 bg-slate-800 rounded mr-2 text-xs">DEMO DATA</span> 
                    Simulated geographic heatmap
                  </span>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({ title, value, color = "text-white" }: { title: string, value: string, color?: string }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl">
      <h3 className="text-slate-400 text-sm font-medium mb-1">{title}</h3>
      <div className={`text-3xl font-bold mb-2 ${color}`}>{value}</div>
    </div>
  );
}
