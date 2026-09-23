"use client";
import { useState } from 'react';
import Link from 'next/link';

export default function BeekeeperPortal() {
  const [isSyncing, setIsSyncing] = ruralOfflineSync();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8">
      <header className="flex justify-between items-center mb-12 border-b border-slate-800 pb-6">
        <div>
          <Link href="/" className="text-sm text-slate-500 hover:text-amber-500 transition-colors mb-2 inline-block">&larr; Back to Home</Link>
          <h1 className="text-3xl font-bold text-slate-100">Beekeeper Dashboard</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-xs text-slate-400 flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 ${isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
            {isSyncing ? 'Syncing Offline Data...' : 'Online & Synced'}
          </div>
          <button className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold py-2 px-4 rounded-lg transition-colors shadow-[0_0_15px_rgba(245,158,11,0.3)]">
            Connect Wallet
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Hives List */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-semibold text-slate-100">Your Active Hives</h2>
          
          {/* Hive Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">Hive Alpha-01</h3>
                <p className="text-xs text-slate-500">Installed: Mar 15, 2026 • Region: North Cluster</p>
              </div>
              <div className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-md border border-emerald-500/30">
                Healthy (98/100)
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800">
                <div className="text-slate-400 text-xs mb-1">Temperature</div>
                <div className="text-xl font-mono text-slate-200">34.5°C</div>
              </div>
              <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800">
                <div className="text-slate-400 text-xs mb-1">Humidity</div>
                <div className="text-xl font-mono text-slate-200">52%</div>
              </div>
              <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800 relative">
                <div className="absolute -top-2 -right-2 bg-amber-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg animate-bounce">
                  Harvest Ready!
                </div>
                <div className="text-slate-400 text-xs mb-1">Weight</div>
                <div className="text-xl font-mono text-amber-400">31.2 kg</div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-sm py-2 rounded-lg transition-colors border border-slate-700">
                View History
              </button>
              <button className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/50 text-sm py-2 rounded-lg transition-colors">
                Log Extraction (IPFS Mint)
              </button>
            </div>
          </div>
        </div>

        {/* AI Disease Scanner */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-fit">
          <h2 className="text-xl font-semibold text-slate-100 mb-4">AI Frame Scanner</h2>
          <p className="text-slate-400 text-sm mb-6">Upload a photo of a hive frame. Our YOLO model will analyze it for Varroa mites.</p>
          
          <div className="border-2 border-dashed border-slate-700 rounded-xl h-48 flex flex-col items-center justify-center text-slate-500 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all cursor-pointer mb-4">
            <svg className="w-8 h-8 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            <span className="text-sm">Tap to upload image</span>
          </div>
          
          <button className="w-full bg-slate-800 text-slate-300 py-2 rounded-lg cursor-not-allowed opacity-50">
            Run Analysis
          </button>
        </div>
      </div>
    </div>
  );
}

// Simple hook to simulate offline syncing state for the UI
function ruralOfflineSync() {
  const [isSyncing, setIsSyncing] = useState(true);
  
  // Simulate it finishing sync after 3 seconds
  if (typeof window !== 'undefined') {
    setTimeout(() => setIsSyncing(false), 3000);
  }
  
  return [isSyncing, setIsSyncing] as const;
}
