"use client";
import { useState, useEffect } from 'react';
import GlobalNavbar from '@/components/GlobalNavbar';
import HoneyBot from '@/components/HoneyBot';

export default function AnalyticsDashboardPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/admin/analytics`);
        if (res.ok) {
          setAnalytics(await res.json());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const handleExportCSV = (type: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    window.open(`${apiUrl}/export/csv/${type}`, '_blank');
  };

  const handleExportPDF = (clusterId: number = 1) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    window.open(`${apiUrl}/export/pdf/apiary/${cluster_id}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <GlobalNavbar title="KVIC Analytics & Reports" role="admin" />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
              📊 KVIC Honey Production & Quality Analytics
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              National honey yield forecasts, disease containment statistics, and blockchain batch verification metrics.
            </p>
          </div>

          {/* Export Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleExportCSV('telemetry')}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              📥 CSV Telemetry
            </button>
            <button
              onClick={() => handleExportCSV('batches')}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              📥 CSV Batches
            </button>
            <button
              onClick={() => handleExportCSV('audit-logs')}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              📥 CSV Audit Trail
            </button>
            <button
              onClick={() => handleExportPDF(1)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition-colors shadow-lg"
            >
              📄 Official PDF Report
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse">Computing national analytics engine...</div>
        ) : !analytics ? (
          <div className="p-12 text-center text-red-400">Failed to load analytics dashboard.</div>
        ) : (
          <div className="space-y-8">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="text-xs text-slate-400 font-semibold mb-1">Total Honey Produced</div>
                <div className="text-3xl font-black text-amber-400">{analytics.production?.total_honey_produced_kg} kg</div>
                <div className="text-[11px] text-emerald-400 mt-1 font-semibold">{analytics.production?.production_trend}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="text-xs text-slate-400 font-semibold mb-1">Avg Yield / Hive</div>
                <div className="text-3xl font-black text-slate-100">{analytics.production?.avg_yield_per_hive_kg} kg</div>
                <div className="text-[11px] text-slate-400 mt-1">{analytics.production?.harvest_ready_hives} hives harvest-ready</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="text-xs text-slate-400 font-semibold mb-1">Healthy Colony Ratio</div>
                <div className="text-3xl font-black text-emerald-400">{analytics.hive_health?.healthy_pct}%</div>
                <div className="text-[11px] text-slate-400 mt-1">{analytics.hive_health?.warning_pct}% warning / {analytics.hive_health?.critical_pct}% critical</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="text-xs text-slate-400 font-semibold mb-1">Batches Minted</div>
                <div className="text-3xl font-black text-blue-400">{analytics.blockchain?.batches_minted}</div>
                <div className="text-[11px] text-slate-400 mt-1">{analytics.blockchain?.verified_batches} verified / {analytics.blockchain?.revoked_batches} revoked</div>
              </div>
            </div>

            {/* Grid 2 Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* IoT Telemetry Metrics */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-base font-bold text-slate-200 mb-4 flex items-center justify-between">
                  <span>📡 IoT Hardware & Telemetry Ingestion</span>
                </h2>
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">Active IoT Sensor Nodes</span>
                    <span className="font-bold text-slate-200">{analytics.iot?.active_devices}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">Offline Devices</span>
                    <span className="font-bold text-emerald-400">{analytics.iot?.offline_devices}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">Telemetry Data Points Ingested</span>
                    <span className="font-bold text-slate-200">{analytics.iot?.telemetry_points_ingested}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-400">Anomalies Detected</span>
                    <span className="font-bold text-amber-400">{analytics.iot?.anomalies_detected}</span>
                  </div>
                </div>
              </div>

              {/* Disease Containment Metrics */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-base font-bold text-slate-200 mb-4 flex items-center justify-between">
                  <span>🐝 Disease & Varroa Containment</span>
                </h2>
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">Total Varroa Mites Detected</span>
                    <span className="font-bold text-slate-200">{analytics.disease?.total_varroa_detections}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">At-Risk Colonies</span>
                    <span className="font-bold text-amber-400">{analytics.disease?.disease_risk_hives}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-400">Outbreak Containment Status</span>
                    <span className="font-bold text-emerald-400">{analytics.disease?.disease_trend}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <HoneyBot />
    </div>
  );
}
