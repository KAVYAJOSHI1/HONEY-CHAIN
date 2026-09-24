"use client";
import { useState, useEffect } from 'react';
import GlobalNavbar from '@/components/GlobalNavbar';
import HoneyBot from '@/components/HoneyBot';

export default function SecurityDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSecurity = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/admin/security`);
        if (res.ok) {
          setData(await res.json());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSecurity();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <GlobalNavbar title="Security & Compliance" role="admin" />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8 border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-amber-400 to-orange-400">
            🛡️ Security & Integrity Command Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time security auditing, tamper event tracking, cryptographic verification, and batch revocation integrity.
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse">Running security diagnostic suite...</div>
        ) : !data ? (
          <div className="p-12 text-center text-red-400">Failed to load Security status.</div>
        ) : (
          <div className="space-y-8">
            {/* Security Status Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="text-xs text-slate-400 font-semibold mb-1">Database Integrity</div>
                <div className="text-2xl font-black text-emerald-400">{data.security_status?.database_integrity}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="text-xs text-slate-400 font-semibold mb-1">Blockchain Verification</div>
                <div className="text-2xl font-black text-emerald-400">{data.security_status?.blockchain_verification}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="text-xs text-slate-400 font-semibold mb-1">Revoked Batches</div>
                <div className="text-2xl font-black text-amber-400">{data.security_status?.revoked_batches}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="text-xs text-slate-400 font-semibold mb-1">Simulated Tamper Events</div>
                <div className="text-2xl font-black text-blue-400">{data.security_status?.tamper_events}</div>
              </div>
            </div>

            {/* Security Timeline */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                <span>⚡ Security Event Timeline</span>
              </h2>

              <div className="space-y-3">
                {data.events?.length === 0 ? (
                  <div className="text-sm text-slate-400 p-4 bg-slate-950 rounded-xl">No security warnings or events detected.</div>
                ) : (
                  data.events?.map((e: any) => (
                    <div key={e.id} className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                      <div>
                        <div className="flex items-center space-x-3 mb-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            e.severity === 'HIGH' ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                            e.severity === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                            'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                          }`}>
                            {e.severity} SEVERITY
                          </span>
                          <span className="font-bold text-slate-200 text-sm">{e.event_type}</span>
                        </div>
                        <p className="text-xs text-slate-400">{e.description}</p>
                      </div>
                      <div className="text-right text-xs text-slate-400 font-mono">
                        <div>Actor: {e.actor}</div>
                        <div>{new Date(e.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <HoneyBot />
    </div>
  );
}
