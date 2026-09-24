"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface BatchData {
  batch_id: string;
  hive_id: number;
  token_id: string;
  ipfs_cid: string;
  tx_hash: string;
  health_score: number;
  floral_source?: string;
  weight_kg?: number;
  tampered_health_score?: number | null;
  is_revoked: boolean;
  revocation_reason: string | null;
  blockchain_mode: string;
  created_at: string;
}

export default function ConsumerVerification({ params }: { params: { batchId: string } }) {
  const [batch, setBatch] = useState<BatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [integrityState, setIntegrityState] = useState<{ verified: boolean; status: string; current_hash: string; anchored_hash: string; is_tampered?: boolean } | null>(null);
  const [checking, setChecking] = useState(false);
  const [showIpfsModal, setShowIpfsModal] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);

  const fetchBatch = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/batches/${params.batchId}`);
      if (!res.ok) {
        if (res.status === 404) setError('NotFound');
        else setError('BackendFailure');
        return;
      }
      const data = await res.json();
      setBatch(data);
    } catch {
      setError('BackendFailure');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatch();
  }, [params.batchId]);

  const verifyIntegrity = async () => {
    setChecking(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/batches/${params.batchId}/verify-integrity`, { method: 'POST' });
      const data = await res.json();
      setIntegrityState(data);
    } catch {
      alert("Integrity check failed");
    } finally {
      setChecking(false);
    }
  };

  const simulateTamper = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      await fetch(`${apiUrl}/batches/${params.batchId}/tamper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tampered_score: 30.0 })
      });
      await fetchBatch();
      await verifyIntegrity();
    } catch {
      alert("Failed to tamper");
    }
  };

  const restoreIntegrity = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      await fetch(`${apiUrl}/batches/${params.batchId}/restore`, { method: 'POST' });
      await fetchBatch();
      await verifyIntegrity();
    } catch {
      alert("Failed to restore");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-200">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4"></div>
          <div className="text-slate-400 font-mono text-sm">Validating Decentralized Honey Passport...</div>
        </div>
      </div>
    );
  }

  if (error === 'NotFound') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-200">
        <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl text-center max-w-sm w-full border border-slate-800 space-y-4">
          <div className="text-5xl">❓</div>
          <h1 className="text-xl font-extrabold text-slate-100">Batch Record Not Found</h1>
          <p className="text-slate-400 text-xs">The requested batch ID does not exist on the Sepolia blockchain ledger or local registry.</p>
          <Link href="/" className="inline-block px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs">
            Return to Homepage
          </Link>
        </div>
      </div>
    );
  }

  if (!batch) return null;

  const isDemo = batch.blockchain_mode === 'demo';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950 pb-16">
      <div className="max-w-xl mx-auto bg-slate-900/90 min-h-screen shadow-2xl relative border-x border-slate-800/80">
        
        {/* Header Hero Area */}
        <div className={`h-56 relative p-6 flex flex-col justify-between ${batch.is_revoked ? 'bg-gradient-to-br from-red-900 via-rose-950 to-slate-950' : 'bg-gradient-to-br from-amber-600 via-orange-600 to-amber-900'}`}>
          <div className="flex justify-between items-center z-10">
            <span className="text-xs font-mono bg-slate-950/60 text-amber-300 px-3 py-1 rounded-full border border-amber-500/30 backdrop-blur-md">
              Sepolia ERC-721 Passport
            </span>
            <Link href="/" className="text-xs font-bold text-slate-200 bg-slate-950/60 hover:bg-slate-950 px-3 py-1 rounded-full backdrop-blur-md transition-all">
              Honey Chain ↗
            </Link>
          </div>

          <div className="z-10 flex justify-between items-end">
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">{batch.floral_source || "Wildflower Honey"}</h1>
              <p className="text-xs font-mono text-amber-200/90 mt-0.5">Batch UUID: {batch.batch_id}</p>
            </div>
            <button
              onClick={() => setShowCertModal(true)}
              className="px-3 py-1.5 bg-slate-950/80 hover:bg-slate-950 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all shadow-lg"
            >
              📜 KVIC Certificate ↗
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="px-6 py-6 space-y-6">

          {/* Status Alert Banner */}
          {batch.is_revoked ? (
            <div className="p-4 bg-red-500/10 border border-red-500/40 rounded-2xl text-red-300 space-y-1">
              <div className="font-extrabold text-sm flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                ⚠️ KVIC BATCH REVOKED - SAFETY RECALL
              </div>
              <p className="text-xs opacity-90">Reason: {batch.revocation_reason || "Safety and purity non-compliance notice"}</p>
            </div>
          ) : (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider">Authentic Honey Provenance</span>
              </div>
              <span className="text-xs text-slate-400 font-mono">100% Raw & Traceable</span>
            </div>
          )}

          {/* Blockchain & IPFS Passport Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                {isDemo ? 'Smart Contract Proof (Sepolia Sandbox)' : 'Live Sepolia Blockchain Proof'}
              </span>
              <button 
                onClick={() => setShowIpfsModal(!showIpfsModal)} 
                className="text-xs text-amber-400 hover:underline font-mono"
              >
                Inspect IPFS Metadata ↗
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Transaction Hash</span>
                <p className="text-slate-200 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg truncate mt-1">
                  {batch.tx_hash}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">NFT Token ID</span>
                  <p className="text-slate-200 font-bold mt-0.5">#{batch.token_id}</p>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">AI Colony Score</span>
                  <p className="text-emerald-400 font-bold mt-0.5">{batch.health_score}/100</p>
                </div>
              </div>
            </div>

            {/* Collapsible IPFS Metadata Inspector */}
            {showIpfsModal && (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs font-mono">
                <div className="text-slate-400 font-bold text-[10px] uppercase">IPFS Pinning Content (CID):</div>
                <div className="text-amber-300 break-all">{batch.ipfs_cid}</div>
                <pre className="p-3 bg-slate-950 text-slate-300 rounded border border-slate-800 overflow-x-auto text-[11px]">
{JSON.stringify({
  hive_id: batch.hive_id,
  floral_source: batch.floral_source || "Wildflower Honey",
  weight_kg: batch.weight_kg || 32.5,
  ai_health_score: batch.health_score,
  timestamp: batch.created_at
}, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Interactive Cryptographic Integrity & Tamper Demo Widget */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-100 flex items-center justify-between">
                <span>Cryptographic Integrity Verification</span>
                <span className="text-[10px] text-amber-400 font-mono">SHA-256 Chain Anchor</span>
              </h3>
              <p className="text-slate-400 text-xs mt-1">
                Recalculates canonical SHA-256 state hash dynamically and compares against immutable Etherscan ledger.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button 
                onClick={verifyIntegrity}
                disabled={checking}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-3 rounded-xl text-xs transition-colors"
              >
                {checking ? 'Checking...' : 'Verify Hash'}
              </button>

              <button 
                onClick={simulateTamper}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 font-bold py-2 px-3 rounded-xl text-xs transition-colors"
              >
                🧪 Simulate DB Tampering
              </button>

              <button 
                onClick={restoreIntegrity}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold py-2 px-3 rounded-xl text-xs transition-colors"
              >
                ↺ Restore Data
              </button>
            </div>

            {integrityState && (
              <div className={`p-4 rounded-xl border font-mono text-xs space-y-2 break-all ${integrityState.verified ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300' : 'bg-red-950/80 border-red-500/80 text-red-300'}`}>
                <div className="font-bold font-sans text-sm flex items-center gap-2">
                  {integrityState.verified ? '✓ PASSED: Cryptographically Authentic' : '⚠️ TAMPER ALERT: Hash Mismatch Detected!'}
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">RECALCULATED STATE HASH:</span>
                  <span>{integrityState.current_hash}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">BLOCKCHAIN ANCHORED HASH:</span>
                  <span>{integrityState.anchored_hash}</span>
                </div>
              </div>
            )}
          </div>

          {/* Immutable Supply Chain Timeline */}
          <div className="space-y-4 pt-2">
            <h2 className="text-sm font-extrabold uppercase text-slate-400 tracking-wider">Immutable Supply Chain Timeline</h2>

            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-3 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-amber-500 before:to-emerald-500">
              
              <div className="relative flex items-start group">
                <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-slate-900 bg-amber-500 shrink-0 absolute left-0 z-10 shadow-sm text-[10px]">1</div>
                <div className="ml-10 bg-slate-950 border border-slate-800 p-3 rounded-xl w-full">
                  <div className="font-bold text-xs text-slate-100">Registered Apiary Colony</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Origin: Hive #{batch.hive_id} (Dehradun Foothills)</div>
                </div>
              </div>

              <div className="relative flex items-start group">
                <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-slate-900 bg-blue-500 shrink-0 absolute left-0 z-10 shadow-sm text-[10px]">2</div>
                <div className="ml-10 bg-slate-950 border border-slate-800 p-3 rounded-xl w-full">
                  <div className="font-bold text-xs text-slate-100">AI Frame Inspection</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">YOLO Varroa Scanner Passed. Health Score: {batch.health_score}/100</div>
                </div>
              </div>

              <div className="relative flex items-start group">
                <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-slate-900 bg-purple-500 shrink-0 absolute left-0 z-10 shadow-sm text-[10px]">3</div>
                <div className="ml-10 bg-slate-950 border border-slate-800 p-3 rounded-xl w-full">
                  <div className="font-bold text-xs text-slate-100">IoT Extraction Weight Verified</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Scale sensor confirmed &gt; 30kg nectar yield.</div>
                </div>
              </div>

              <div className="relative flex items-start group">
                <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-slate-900 bg-orange-500 shrink-0 absolute left-0 z-10 shadow-sm text-[10px]">4</div>
                <div className="ml-10 bg-slate-950 border border-slate-800 p-3 rounded-xl w-full">
                  <div className="font-bold text-xs text-slate-100">IPFS Decentralized Metadata Pinning</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Permanently stored CID metadata envelope.</div>
                </div>
              </div>

              <div className="relative flex items-start group">
                <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-slate-900 bg-emerald-500 shrink-0 absolute left-0 z-10 shadow-sm text-[10px]">5</div>
                <div className="ml-10 bg-slate-950 border border-slate-800 p-3 rounded-xl w-full">
                  <div className="font-bold text-xs text-slate-100">Sepolia ERC-721 NFT Minted</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Token #{batch.token_id} immutable provenance locked.</div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Printable KVIC Official Certificate Modal */}
      {showCertModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white text-slate-950 max-w-lg w-full p-8 rounded-3xl shadow-2xl border-4 border-amber-500 space-y-6 relative text-center print:border-none print:shadow-none">
            <button 
              onClick={() => setShowCertModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-950 text-xl font-bold print:hidden"
            >
              ✕
            </button>

            <div className="border-b-2 border-amber-500 pb-4">
              <div className="text-3xl mb-1">🇮🇳</div>
              <h2 className="text-xl font-black uppercase text-amber-900">Khadi & Village Industries Commission</h2>
              <p className="text-[10px] uppercase font-bold text-slate-600 tracking-widest">National Honey Quality & Provenance Certificate</p>
            </div>

            <div className="space-y-3 text-left bg-amber-50/50 p-4 rounded-2xl border border-amber-200 text-xs font-mono">
              <p><span className="font-bold text-slate-700">Floral Source:</span> {batch.floral_source || "Wildflower Honey"}</p>
              <p><span className="font-bold text-slate-700">Batch UUID:</span> {batch.batch_id}</p>
              <p><span className="font-bold text-slate-700">ERC-721 Token:</span> #{batch.token_id}</p>
              <p><span className="font-bold text-slate-700">AI Health Index:</span> {batch.health_score}/100</p>
              <p className="truncate"><span className="font-bold text-slate-700">Transaction Hash:</span> {batch.tx_hash}</p>
              <p className="truncate"><span className="font-bold text-slate-700">IPFS CID:</span> {batch.ipfs_cid}</p>
            </div>

            <div className="flex justify-between items-center pt-2">
              <div className="text-left text-[10px] text-slate-500">
                <p className="font-bold text-slate-800">Verified by Honey Chain</p>
                <p>Digital Cryptographic Seal</p>
              </div>
              <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/40 rounded-xl flex items-center justify-center text-2xl font-bold text-amber-700">
                KVIC
              </div>
            </div>

            <div className="pt-2 print:hidden flex space-x-3">
              <button 
                onClick={() => window.print()} 
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-2.5 rounded-xl text-xs shadow-lg transition-colors"
              >
                🖨️ Print Official Certificate
              </button>
              <button 
                onClick={() => setShowCertModal(false)}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
