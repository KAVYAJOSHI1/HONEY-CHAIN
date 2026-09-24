import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 overflow-hidden relative selection:bg-amber-500 selection:text-slate-950">
      {/* Decorative ambient background gradients */}
      <div className="absolute top-[-25%] left-[-15%] w-[60%] h-[60%] rounded-full bg-amber-500/15 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-25%] right-[-15%] w-[60%] h-[60%] rounded-full bg-orange-600/15 blur-[140px] pointer-events-none" />
      
      <main className="z-10 flex flex-col items-center max-w-5xl text-center space-y-8 py-12">
        <div className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-300 backdrop-blur-md space-x-2">
          <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span>PS 26021 Hackathon Prototype • Sepolia ERC-721 Ledger Active</span>
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 pb-2">
          Honey Chain
        </h1>
        
        <p className="text-slate-300 text-lg md:text-xl max-w-3xl leading-relaxed font-light">
          A revolutionary blockchain-based system for <span className="text-amber-400 font-semibold">honey traceability</span>, <span className="text-emerald-400 font-semibold">IoT smart beekeeping management</span>, and <span className="text-blue-400 font-semibold">AI YOLO colony disease diagnostics</span>.
        </p>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-6">
          
          {/* Beekeeper Card */}
          <Link href="/beekeeper" className="group relative overflow-hidden rounded-3xl bg-slate-900/80 p-8 border border-slate-800 hover:border-amber-500/60 transition-all duration-300 hover:-translate-y-1.5 shadow-2xl flex flex-col justify-between text-left">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">
                🐝
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-2 group-hover:text-amber-400 transition-colors">Smart Beekeeper Portal</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Real-time ESP32 IoT telemetry streaming, 1-click scenario simulation, YOLO frame scan visualizer, and ERC-721 token minting.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center text-xs font-bold text-amber-400">
              Launch Beekeeper Dashboard &rarr;
            </div>
          </Link>

          {/* KVIC Command Center */}
          <Link href="/admin" className="group relative overflow-hidden rounded-3xl bg-slate-900/80 p-8 border border-slate-800 hover:border-blue-500/60 transition-all duration-300 hover:-translate-y-1.5 shadow-2xl flex flex-col justify-between text-left">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">
                🏛️
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-2 group-hover:text-blue-400 transition-colors">KVIC Command Center</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                National GIS apiary heatmap, automated Varroa disease surveillance, batch authenticity registry, and 1-click safety revocation.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center text-xs font-bold text-blue-400">
              Open KVIC Command Center &rarr;
            </div>
          </Link>

          {/* Consumer View */}
          <Link href="/consumer/demo-batch-101" className="group relative overflow-hidden rounded-3xl bg-slate-900/80 p-8 border border-slate-800 hover:border-emerald-500/60 transition-all duration-300 hover:-translate-y-1.5 shadow-2xl flex flex-col justify-between text-left">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">
                🍯
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-2 group-hover:text-emerald-400 transition-colors">Consumer QR Verification</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Immutable honey passport, SHA-256 integrity verification with interactive DB tampering demonstration, and IPFS metadata inspector.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center text-xs font-bold text-emerald-400">
              Inspect Sample Batch Passport &rarr;
            </div>
          </Link>

        </div>

        {/* System Architecture Tech Badge Bar */}
        <div className="pt-6 flex flex-wrap justify-center items-center gap-3 text-xs text-slate-400 font-mono">
          <Link href="/ai-insights" className="px-3.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/30 rounded-lg transition-colors">🧠 AI Insights</Link>
          <Link href="/alerts" className="px-3.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/30 rounded-lg transition-colors">🔔 Alert Center</Link>
          <Link href="/beekeeper/apiary" className="px-3.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/30 rounded-lg transition-colors">🐝 Apiary View</Link>
          <Link href="/admin/analytics" className="px-3.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/30 rounded-lg transition-colors">📊 Analytics</Link>
          <Link href="/admin/security" className="px-3.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/30 rounded-lg transition-colors">🛡️ Security</Link>
          <Link href="/admin/audit-logs" className="px-3.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/30 rounded-lg transition-colors">📜 Audit Trail</Link>
          <Link href="/system-health" className="px-3.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-amber-500/30 rounded-lg transition-colors">⚡ Health 2.0</Link>
        </div>
      </main>
    </div>
  );
}
