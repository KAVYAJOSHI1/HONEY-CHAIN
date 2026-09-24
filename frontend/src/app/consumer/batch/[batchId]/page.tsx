"use client";
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import GlobalNavbar from '@/components/GlobalNavbar';
import HoneyBot from '@/components/HoneyBot';

export default function ConsumerBatchPassportPage() {
  const params = useParams();
  const batchId = (params?.batchId as string) || 'demo-batch-101';
  
  const [batch, setBatch] = useState<any>(null);
  const [verification, setVerification] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPassport = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/batches/${batchId}`);
        if (res.ok) {
          const data = await res.json();
          setBatch(data);
          
          // Verify integrity
          const vRes = await fetch(`${apiUrl}/batches/${batchId}/verify-integrity`, { method: 'POST' });
          if (vRes.ok) {
            setVerification(await vRes.json());
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchPassport();
  }, [batchId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <GlobalNavbar title="Consumer Provenance Passport" role="beekeeper" />

      <main className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse">Retrieving on-chain batch passport...</div>
        ) : !batch ? (
          <div className="p-12 text-center text-red-400 bg-slate-900 border border-slate-800 rounded-2xl">
            Honey Batch <span className="font-mono font-bold text-amber-400">{batchId}</span> was not found in the provenance registry.
          </div>
        ) : (
          <div className="space-y-8">
            {/* Status Banner */}
            <div className={`p-6 rounded-2xl border text-center shadow-2xl ${
              batch.is_revoked ? 'bg-red-950/40 border-red-500/60' :
              verification?.is_tampered ? 'bg-amber-950/40 border-amber-500/60' :
              'bg-emerald-950/40 border-emerald-500/60'
            }`}>
              <div className="text-4xl mb-2">
                {batch.is_revoked ? '❌' : verification?.is_tampered ? '⚠️' : '🛡️'}
              </div>
              <h1 className={`text-2xl font-black ${
                batch.is_revoked ? 'text-red-400' : verification?.is_tampered ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {batch.is_revoked ? 'BATCH REVOKED BY KVIC' : verification?.is_tampered ? 'TAMPERING / INTEGRITY MISMATCH DETECTED' : '✓ AUTHENTIC PROVENANCE VERIFIED'}
              </h1>
              {batch.is_revoked && (
                <p className="text-sm text-red-300 mt-2 font-medium">Reason: {batch.revocation_reason}</p>
              )}
            </div>

            {/* Passport Product Details */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-amber-400 mb-4 pb-2 border-b border-slate-800">
                🍯 Product Specifications
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400 font-semibold">Floral Source</div>
                  <div className="text-base font-bold text-slate-100">{batch.floral_source}</div>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400 font-semibold">Batch Weight</div>
                  <div className="text-base font-bold text-amber-300">{batch.weight_kg} kg</div>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400 font-semibold">AI Health Score</div>
                  <div className="text-base font-bold text-emerald-400">{batch.health_score}/100</div>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400 font-semibold">Hive Origin</div>
                  <div className="text-base font-bold text-slate-100">Hive #{batch.hive_id}</div>
                </div>
              </div>
            </div>

            {/* Complete Traceability Timeline */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-amber-400 mb-6 pb-2 border-b border-slate-800">
                📜 Complete Lifecycle Provenance Timeline
              </h2>

              <div className="relative border-l-2 border-amber-500/30 ml-4 space-y-6 pl-6 text-xs">
                <div className="relative">
                  <span className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-amber-400"></span>
                  <div className="font-bold text-slate-200 text-sm">🐝 Hive Registered</div>
                  <div className="text-slate-400">Hive #{batch.hive_id} anchored with GPS IoT telemetry node.</div>
                </div>
                <div className="relative">
                  <span className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-amber-400"></span>
                  <div className="font-bold text-slate-200 text-sm">📡 IoT Sensor Monitoring</div>
                  <div className="text-slate-400">Temperature, humidity, and weight stability tracked continuously.</div>
                </div>
                <div className="relative">
                  <span className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-amber-400"></span>
                  <div className="font-bold text-slate-200 text-sm">🧠 AI Health & Vision Inspection</div>
                  <div className="text-slate-400">YOLO vision model verified frame health score: {batch.health_score}/100.</div>
                </div>
                <div className="relative">
                  <span className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-amber-400"></span>
                  <div className="font-bold text-slate-200 text-sm">🍯 Honey Harvest & Batch Creation</div>
                  <div className="text-slate-400">{batch.weight_kg}kg of {batch.floral_source} harvested.</div>
                </div>
                <div className="relative">
                  <span className="absolute -left-[31px] top-0.5 w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
                  <div className="font-bold text-emerald-400 text-sm">⛓ Sepolia ERC-721 Token #{batch.token_id}</div>
                  <div className="text-slate-400 font-mono mt-1">
                    <div>Tx Hash: {batch.tx_hash}</div>
                    <div>IPFS Metadata: {batch.ipfs_cid}</div>
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
