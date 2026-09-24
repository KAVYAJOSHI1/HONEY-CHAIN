"use client";
import { useState, useEffect } from 'react';
import GlobalNavbar from '@/components/GlobalNavbar';
import HoneyBot from '@/components/HoneyBot';

export default function AlertCenterPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  const fetchAlerts = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const url = severityFilter === 'ALL' ? `${apiUrl}/alerts` : `${apiUrl}/alerts?severity=${severityFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        setAlerts(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [severityFilter]);

  const handleAcknowledge = async (id: number) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/alerts/${id}/acknowledge`, { method: 'POST' });
      if (res.ok) {
        fetchAlerts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolve = async (id: number) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/alerts/${id}/resolve`, { method: 'POST' });
      if (res.ok) {
        fetchAlerts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <GlobalNavbar title="Alert Center" role="beekeeper" />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
              🔔 Persistent Alert Management Center
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Filter, acknowledge, and resolve automated telemetry anomalies, disease alerts, and hardware notifications.
            </p>
          </div>

          {/* Filter Bar */}
          <div className="flex space-x-2">
            {['ALL', 'CRITICAL', 'WARNING', 'SUCCESS', 'INFO'].map(sev => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${severityFilter === sev ? 'bg-amber-500 text-slate-950 shadow-lg' : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'}`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse">Fetching persistent alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
            No alerts found matching filter <span className="text-amber-400 font-bold">{severityFilter}</span>.
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map(a => (
              <div 
                key={a.id} 
                className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  a.severity === 'CRITICAL' ? 'bg-red-950/20 border-red-500/40' :
                  a.severity === 'WARNING' ? 'bg-amber-950/20 border-amber-500/40' :
                  a.severity === 'SUCCESS' ? 'bg-emerald-950/20 border-emerald-500/40' :
                  'bg-slate-900 border-slate-800'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-xl text-xl font-bold ${
                    a.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                    a.severity === 'WARNING' ? 'bg-amber-500/20 text-amber-400' :
                    a.severity === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-400' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {a.severity === 'CRITICAL' ? '🚨' : a.severity === 'WARNING' ? '⚠️' : a.severity === 'SUCCESS' ? '✅' : 'ℹ️'}
                  </div>
                  <div>
                    <div className="flex items-center space-x-3 mb-1">
                      <span className="font-extrabold text-slate-200 text-base">Hive #{a.hive_id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        a.severity === 'CRITICAL' ? 'bg-red-500 text-slate-950' :
                        a.severity === 'WARNING' ? 'bg-amber-500 text-slate-950' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {a.severity}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">[{a.type || 'ANOMALY'}]</span>
                    </div>
                    <p className="text-sm font-medium text-slate-300 mb-1">{a.reason}</p>
                    <div className="text-xs text-slate-400 flex items-center space-x-4">
                      <span>Source: <strong className="text-slate-300">{a.source || 'IoT Telemetry'}</strong></span>
                      <span>Timestamp: {new Date(a.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  {!a.acknowledged && (
                    <button
                      onClick={() => handleAcknowledge(a.id)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}
                  {!a.resolved ? (
                    <button
                      onClick={() => handleResolve(a.id)}
                      className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Resolve Issue
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 bg-slate-900 text-emerald-400 text-xs font-bold border border-emerald-500/30 rounded-lg">
                      ✓ Resolved
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <HoneyBot />
    </div>
  );
}
