"use client";
import Link from 'next/link';

export default function ConsumerVerification({ params }: { params: { batchId: string } }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-200">
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-2xl relative overflow-hidden">
        
        {/* Header Image Area */}
        <div className="h-48 bg-gradient-to-br from-amber-400 to-orange-500 relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/honeycomb.png')] opacity-20"></div>
          <div className="absolute bottom-[-20px] left-8 w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center border-4 border-white z-10 rotate-3">
            <span className="text-4xl">🍯</span>
          </div>
          <Link href="/" className="absolute top-4 right-4 text-white/80 hover:text-white text-sm font-medium bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
            Honey Chain
          </Link>
        </div>

        {/* Content Body */}
        <div className="pt-10 px-8 pb-12">
          <div className="flex items-center space-x-2 mb-2">
            <span className="bg-emerald-100 text-emerald-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wide">
              Verified Authentic
            </span>
            <span className="text-slate-400 text-xs">ERC-721 Token</span>
          </div>
          
          <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Wildflower Honey</h1>
          <p className="text-slate-500 text-sm mb-6 font-mono">Batch #{params.batchId || "demo-batch"}</p>

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Provenance Hash (Sepolia)</span>
              <a href="#" className="text-xs text-amber-500 hover:underline">View on Etherscan</a>
            </div>
            <div className="text-xs font-mono text-slate-600 bg-white border border-slate-200 p-2 rounded truncate">
              0x8f2d5A...3c9E41
            </div>
          </div>

          <h2 className="text-lg font-bold mb-4">Journey Timeline</h2>
          
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-amber-400 before:to-emerald-400">
            
            {/* Timeline Item 1 */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white bg-amber-500 text-slate-100 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 absolute left-0 md:left-1/2 z-10"></div>
              <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] ml-8 md:ml-0 p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
                <div className="flex items-center justify-between space-x-2 mb-1">
                  <div className="font-bold text-sm text-slate-900">Extracted & Minted</div>
                  <time className="font-mono text-[10px] text-amber-500">Mar 15, 2026</time>
                </div>
                <div className="text-xs text-slate-500">Harvested from Hive Alpha-01 (North Cluster). Telemetry logged on IPFS.</div>
              </div>
            </div>

            {/* Timeline Item 2 */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white bg-blue-500 text-slate-100 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 absolute left-0 md:left-1/2 z-10"></div>
              <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] ml-8 md:ml-0 p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
                <div className="flex items-center justify-between space-x-2 mb-1">
                  <div className="font-bold text-sm text-slate-900">AI Quality Check</div>
                  <time className="font-mono text-[10px] text-blue-500">Mar 16, 2026</time>
                </div>
                <div className="text-xs text-slate-500">YOLO CV scan verified 0% varroa mite infection. Health score: 98/100.</div>
              </div>
            </div>

            {/* Timeline Item 3 */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white bg-emerald-500 text-slate-100 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 absolute left-0 md:left-1/2 z-10"></div>
              <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] ml-8 md:ml-0 p-4 rounded-xl border border-slate-100 bg-white shadow-sm">
                <div className="flex items-center justify-between space-x-2 mb-1">
                  <div className="font-bold text-sm text-slate-900">Packaged & Shipped</div>
                  <time className="font-mono text-[10px] text-emerald-500">Mar 18, 2026</time>
                </div>
                <div className="text-xs text-slate-500">QR code generated and attached to final consumer packaging.</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
