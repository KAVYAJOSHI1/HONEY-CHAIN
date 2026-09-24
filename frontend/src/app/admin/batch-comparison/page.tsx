"use client";
import { useState, useEffect } from 'react';
import GlobalNavbar from '@/components/GlobalNavbar';
import HoneyBot from '@/components/HoneyBot';

export default function BatchComparisonPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [batch1, setBatch1] = useState<any>(null);
  const [batch2, setBatch2] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/batches/`);
        if (res.ok) {
          const list = await res.json();
          setBatches(list);
          if (list.length >= 2) {
            setBatch1(list[0]);
            setBatch2(list[1]);
          } else if (list.length === 1) {
            setBatch1(list[0]);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchBatches();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <GlobalNavbar title="Batch Comparison" role="admin" />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8 border-b border-slate-800 pb-6">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
            ⚖️ Honey Batch Side-by-Side Comparison
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Compare IoT metrics, AI health scores, Varroa risk factors, and Sepolia ERC-721 provenance across honey batches.
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse">Loading batch registry...</div>
        ) : batches.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No honey batches found in registry.</div>
        ) : (
          <div className="space-y-8">
            {/* Batch Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900 p-6 rounded-2xl border border-slate-800">
              <div>
                <label className="block text-xs font-bold text-amber-400 uppercase mb-2">Select Primary Batch A</label>
                <select
                  value={batch1?.batch_id || ''}
                  onChange={e => setBatch1(batches.find(b => b.batch_id === e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-amber-500"
                >
                  {batches.map(b => (
                    <option key={b.batch_id} value={b.batch_id}>
                      {b.batch_id} — {b.floral_source} ({b.weight_kg}kg)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-orange-400 uppercase mb-2">Select Comparison Batch B</label>
                <select
                  value={batch2?.batch_id || ''}
                  onChange={e => setBatch2(batches.find(b => b.batch_id === e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-orange-500"
                >
                  {batches.map(b => (
                    <option key={b.batch_id} value={b.batch_id}>
                      {b.batch_id} — {b.floral_source} ({b.weight_kg}kg)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Side-by-Side Comparison Table */}
            {batch1 && batch2 && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="grid grid-cols-3 p-4 bg-slate-950 border-b border-slate-800 text-xs font-bold uppercase text-slate-400">
                  <div>Metric / Property</div>
                  <div className="text-amber-400">Batch A ({batch1.batch_id})</div>
                  <div className="text-orange-400">Batch B ({batch2.batch_id})</div>
                </div>

                <div className="divide-y divide-slate-800/60 text-sm">
                  <div className="grid grid-cols-3 p-4">
                    <div className="text-slate-400 font-semibold">Floral Source</div>
                    <div className="font-bold text-slate-100">{batch1.floral_source}</div>
                    <div className="font-bold text-slate-100">{batch2.floral_source}</div>
                  </div>

                  <div className="grid grid-cols-3 p-4">
                    <div className="text-slate-400 font-semibold">Batch Weight</div>
                    <div className="font-bold text-amber-300">{batch1.weight_kg} kg</div>
                    <div className="font-bold text-amber-300">{batch2.weight_kg} kg</div>
                  </div>

                  <div className="grid grid-cols-3 p-4">
                    <div className="text-slate-400 font-semibold">AI Health Score</div>
                    <div className="font-bold text-emerald-400">{batch1.health_score} / 100</div>
                    <div className="font-bold text-emerald-400">{batch2.health_score} / 100</div>
                  </div>

                  <div className="grid grid-cols-3 p-4">
                    <div className="text-slate-400 font-semibold">Hive Origin</div>
                    <div>Hive #{batch1.hive_id}</div>
                    <div>Hive #{batch2.hive_id}</div>
                  </div>

                  <div className="grid grid-cols-3 p-4">
                    <div className="text-slate-400 font-semibold">Blockchain Provenance</div>
                    <div className="text-xs font-mono text-emerald-400">{batch1.blockchain_mode.toUpperCase()} (Token #{batch1.token_id})</div>
                    <div className="text-xs font-mono text-emerald-400">{batch2.blockchain_mode.toUpperCase()} (Token #{batch2.token_id})</div>
                  </div>

                  <div className="grid grid-cols-3 p-4">
                    <div className="text-slate-400 font-semibold">Revocation Status</div>
                    <div>
                      {batch1.is_revoked ? (
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/40 text-xs font-bold rounded">REVOKED</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold rounded">VALID</span>
                      )}
                    </div>
                    <div>
                      {batch2.is_revoked ? (
                        <span className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/40 text-xs font-bold rounded">REVOKED</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold rounded">VALID</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 p-4">
                    <div className="text-slate-400 font-semibold">IPFS CID</div>
                    <div className="text-xs font-mono text-slate-300 truncate">{batch1.ipfs_cid}</div>
                    <div className="text-xs font-mono text-slate-300 truncate">{batch2.ipfs_cid}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <HoneyBot />
    </div>
  );
}
