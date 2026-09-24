"use client";
import { useState, useEffect } from 'react';
import GlobalNavbar from '@/components/GlobalNavbar';
import HoneyBot from '@/components/HoneyBot';

export default function ApiaryDashboardPage() {
  const [clusters, setClusters] = useState<any[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClusters = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/clusters/`);
        if (res.ok) {
          const data = await res.json();
          setClusters(data);
          if (data.length > 0) setSelectedCluster(data[0]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchClusters();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <GlobalNavbar title="Multi-Hive Apiary Dashboard" role="beekeeper" />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
              🐝 Apiary Cluster Management Dashboard
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Multi-hive overview across regional apiaries, cluster matrix, and environmental benchmarks.
            </p>
          </div>

          {/* Apiary Cluster Selector */}
          <div className="flex space-x-2 overflow-x-auto">
            {clusters.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCluster(c)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedCluster?.id === c.id ? 'bg-amber-500 text-slate-950 shadow-lg' : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse">Loading Apiary Cluster data...</div>
        ) : !selectedCluster ? (
          <div className="p-12 text-center text-slate-400">No apiary clusters found.</div>
        ) : (
          <div className="space-y-8">
            {/* Apiary Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="text-xs text-slate-400 font-semibold mb-1">Total Hives</div>
                <div className="text-2xl font-black text-slate-100">{selectedCluster.total_hives}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="text-xs text-slate-400 font-semibold mb-1">Healthy</div>
                <div className="text-2xl font-black text-emerald-400">{selectedCluster.healthy}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="text-xs text-slate-400 font-semibold mb-1">Attention/Warning</div>
                <div className="text-2xl font-black text-amber-400">{selectedCluster.warning}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="text-xs text-slate-400 font-semibold mb-1">Critical</div>
                <div className="text-2xl font-black text-red-400">{selectedCluster.critical}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="text-xs text-slate-400 font-semibold mb-1">Avg Temperature</div>
                <div className="text-2xl font-black text-amber-300">{selectedCluster.avg_temperature}°C</div>
              </div>
            </div>

            {/* Hive Matrix Grid */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center justify-between">
                <span>Apiary Hives Health Matrix</span>
                <span className="text-xs text-slate-400 font-normal">Region: {selectedCluster.region}</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {selectedCluster.hives?.map((h: any) => (
                  <a
                    key={h.id}
                    href={`/beekeeper/hives/${h.id}`}
                    className="bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-amber-500/50 transition-all hover:scale-[1.02] block"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-extrabold text-slate-200 text-sm">Hive #{h.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        h.status === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                        h.status === 'ATTENTION_REQUIRED' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                        'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      }`}>
                        {h.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 space-y-1">
                      <div>GPS: ({h.gps_lat}, {h.gps_long})</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <HoneyBot />
    </div>
  );
}
