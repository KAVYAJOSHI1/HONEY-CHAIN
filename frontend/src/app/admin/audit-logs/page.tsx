"use client";
import { useState, useEffect } from 'react';
import GlobalNavbar from '@/components/GlobalNavbar';
import HoneyBot from '@/components/HoneyBot';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/audit-logs`);
        if (res.ok) {
          setLogs(await res.json());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAuditLogs();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <GlobalNavbar title="Audit Trail" role="admin" />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8 border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
            📜 Immutable Application Audit Trail
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Chronological audit log tracking system events, batch minting, blockchain tx hashes, tamper simulations, and KVIC administrative actions.
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse">Loading Audit Logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
            No audit records recorded yet.
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-950 border-b border-slate-800 text-xs font-bold uppercase text-slate-400 grid grid-cols-12 gap-4">
              <div className="col-span-3">Timestamp & Action</div>
              <div className="col-span-2">Actor</div>
              <div className="col-span-4">Details</div>
              <div className="col-span-3 text-right">Blockchain Tx Hash</div>
            </div>

            <div className="divide-y divide-slate-800/60 max-h-[600px] overflow-y-auto font-mono text-xs">
              {logs.map(log => (
                <div key={log.id} className="p-4 hover:bg-slate-800/40 transition-colors grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-3">
                    <div className="font-bold text-amber-400">{log.action}</div>
                    <div className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</div>
                  </div>
                  <div className="col-span-2 font-semibold text-slate-300">
                    {log.actor}
                  </div>
                  <div className="col-span-4 text-slate-300">
                    {log.details}
                  </div>
                  <div className="col-span-3 text-right text-slate-400 truncate">
                    {log.blockchain_tx ? (
                      <span className="text-emerald-400 bg-emerald-950/40 px-2 py-1 rounded border border-emerald-500/30">
                        {log.blockchain_tx}
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <HoneyBot />
    </div>
  );
}
