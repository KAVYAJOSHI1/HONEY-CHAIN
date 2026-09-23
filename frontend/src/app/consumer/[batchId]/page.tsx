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
  is_revoked: boolean;
  revocation_reason: string | null;
  blockchain_mode: string;
  created_at: string;
}

export default function ConsumerVerification({ params }: { params: { batchId: string } }) {
  const [batch, setBatch] = useState<BatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBatch() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/batches/${params.batchId}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('NotFound');
          } else {
            setError('BackendFailure');
          }
          return;
        }
        const data = await res.json();
        setBatch(data);
      } catch {
        setError('BackendFailure');
      } finally {
        setLoading(false);
      }
    }
    fetchBatch();
  }, [params.batchId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4"></div>
          <div className="text-slate-500 font-medium">Verifying Honey Batch...</div>
        </div>
      </div>
    );
  }

  if (error === 'NotFound') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-sm w-full border border-slate-200">
          <div className="text-4xl mb-4">❓</div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Batch Not Found</h1>
          <p className="text-slate-500 text-sm">We could not locate this batch in our records. Please check the QR code or URL.</p>
        </div>
      </div>
    );
  }

  if (error === 'BackendFailure') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-sm w-full border border-slate-200">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Verification temporarily unavailable</h1>
          <p className="text-slate-500 text-sm">We are having trouble connecting to the verification network. Please try again later.</p>
        </div>
      </div>
    );
  }

  if (!batch) return null;

  const isDemo = batch.blockchain_mode === 'demo';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-200 pb-12">
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-2xl relative overflow-hidden">
        
        {/* Header Image Area */}
        <div className={`h-48 relative ${batch.is_revoked ? 'bg-gradient-to-br from-red-500 to-rose-700' : 'bg-gradient-to-br from-amber-400 to-orange-500'}`}>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/honeycomb.png')] opacity-20"></div>
          <div className="absolute bottom-[-20px] left-8 w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center border-4 border-white z-10 rotate-3">
            <span className="text-4xl">{batch.is_revoked ? '⚠️' : '🍯'}</span>
          </div>
          <Link href="/" className="absolute top-4 right-4 text-white/80 hover:text-white text-sm font-medium bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
            Honey Chain
          </Link>
        </div>

        {/* Content Body */}
        <div className="pt-10 px-8 pb-8">
          
          {/* Status Badge */}
          {batch.is_revoked ? (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <h2 className="text-red-700 font-black text-lg flex items-center mb-1">
                <span className="mr-2">⚠</span> BATCH REVOKED
              </h2>
              <p className="text-red-600 text-sm font-medium">
                Reason: {batch.revocation_reason || "Safety recall"}
              </p>
            </div>
          ) : (
            <div className="flex items-center space-x-2 mb-4">
              <span className="bg-emerald-100 text-emerald-700 text-xs uppercase font-bold px-3 py-1 rounded-full flex items-center">
                <span className="mr-1">✓</span> Honey Batch Verified
              </span>
            </div>
          )}
          
          <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Wildflower Honey</h1>
          <p className="text-slate-500 text-sm mb-6 font-mono truncate">Batch: {batch.batch_id}</p>

          {/* Blockchain Verification Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-8">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                {isDemo ? 'Demo Blockchain Record' : 'Sepolia Blockchain Record'}
              </span>
              {!isDemo && (
                <a href={`https://sepolia.etherscan.io/tx/${batch.tx_hash}`} target="_blank" rel="noreferrer" className="text-xs text-amber-600 font-medium hover:underline">
                  View Explorer
                </a>
              )}
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Transaction Hash</p>
                <p className="text-xs font-mono text-slate-700 truncate bg-white border border-slate-200 px-2 py-1 rounded mt-1">
                  {batch.tx_hash}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Token ID</p>
                  <p className="text-xs font-mono text-slate-700">{batch.token_id}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">IPFS CID</p>
                  <p className="text-xs font-mono text-slate-700 truncate">{batch.ipfs_cid.replace('ipfs://', '')}</p>
                </div>
              </div>
            </div>
          </div>

          <h2 className="text-lg font-bold mb-5 text-slate-800">Provenance Timeline</h2>
          
          {/* Timeline */}
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-3 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-amber-400 before:to-emerald-400">
            
            <div className="relative flex items-start group">
              <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-white bg-amber-500 shrink-0 absolute left-0 z-10 shadow-sm"></div>
              <div className="ml-10 bg-white border border-slate-100 p-3 rounded-lg shadow-sm w-full">
                <div className="font-bold text-sm text-slate-900 mb-1">Hive Registered</div>
                <div className="text-xs text-slate-500">Origin: Hive #{batch.hive_id}</div>
              </div>
            </div>

            <div className="relative flex items-start group">
              <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-white bg-blue-500 shrink-0 absolute left-0 z-10 shadow-sm"></div>
              <div className="ml-10 bg-white border border-slate-100 p-3 rounded-lg shadow-sm w-full">
                <div className="font-bold text-sm text-slate-900 mb-1">AI Health Assessment</div>
                <div className="text-xs text-slate-500">YOLO Prototype Inference. Score: {batch.health_score}/100</div>
              </div>
            </div>

            <div className="relative flex items-start group">
              <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-white bg-purple-500 shrink-0 absolute left-0 z-10 shadow-sm"></div>
              <div className="ml-10 bg-white border border-slate-100 p-3 rounded-lg shadow-sm w-full">
                <div className="font-bold text-sm text-slate-900 mb-1">Harvest Ready</div>
                <div className="text-xs text-slate-500">IoT Telemetry indicated optimal extraction weight.</div>
              </div>
            </div>

            <div className="relative flex items-start group">
              <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-white bg-orange-500 shrink-0 absolute left-0 z-10 shadow-sm"></div>
              <div className="ml-10 bg-white border border-slate-100 p-3 rounded-lg shadow-sm w-full">
                <div className="font-bold text-sm text-slate-900 mb-1">Honey Extracted & IPFS</div>
                <div className="text-xs text-slate-500">Metadata permanently pinned to decentralized storage.</div>
              </div>
            </div>

            <div className="relative flex items-start group">
              <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-white bg-indigo-500 shrink-0 absolute left-0 z-10 shadow-sm"></div>
              <div className="ml-10 bg-white border border-slate-100 p-3 rounded-lg shadow-sm w-full">
                <div className="font-bold text-sm text-slate-900 mb-1">Blockchain Record</div>
                <div className="text-xs text-slate-500">Minted as ERC-721 Token #{batch.token_id}.</div>
              </div>
            </div>

            <div className="relative flex items-start group">
              <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-white bg-emerald-500 shrink-0 absolute left-0 z-10 shadow-sm"></div>
              <div className="ml-10 bg-white border border-slate-100 p-3 rounded-lg shadow-sm w-full">
                <div className="font-bold text-sm text-slate-900 mb-1">Consumer Verification</div>
                <div className="text-xs text-slate-500">You successfully scanned and verified this batch!</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
