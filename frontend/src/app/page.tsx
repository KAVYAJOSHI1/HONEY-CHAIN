import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 overflow-hidden relative">
      {/* Decorative background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/20 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-600/20 blur-[120px]" />
      
      <main className="z-10 flex flex-col items-center max-w-4xl text-center space-y-8">
        <div className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-300 backdrop-blur-md">
          <span className="flex h-2 w-2 rounded-full bg-amber-500 mr-2 animate-pulse"></span>
          Sepolia Network Active
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-amber-200 to-orange-500 pb-2">
          Honey Chain
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl leading-relaxed">
          Data-driven trust from hive to home. Real-time IoT telemetry, AI-powered Varroa disease detection, and immutable blockchain provenance.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-8">
          <Link href="/beekeeper" className="group relative overflow-hidden rounded-2xl bg-slate-900/50 p-8 border border-slate-800 hover:border-amber-500/50 transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <h3 className="text-xl font-semibold text-slate-200 mb-2 group-hover:text-amber-400 transition-colors">Beekeeper Portal</h3>
            <p className="text-slate-500 text-sm">Log extractions, scan frames for AI analysis, and monitor hive health.</p>
          </Link>

          <Link href="/admin" className="group relative overflow-hidden rounded-2xl bg-slate-900/50 p-8 border border-slate-800 hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <h3 className="text-xl font-semibold text-slate-200 mb-2 group-hover:text-blue-400 transition-colors">KVIC Dashboard</h3>
            <p className="text-slate-500 text-sm">Command center for geographic heatmaps and cluster health monitoring.</p>
          </Link>

          <Link href="/consumer/demo-batch" className="group relative overflow-hidden rounded-2xl bg-slate-900/50 p-8 border border-slate-800 hover:border-emerald-500/50 transition-all duration-300 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <h3 className="text-xl font-semibold text-slate-200 mb-2 group-hover:text-emerald-400 transition-colors">Consumer View</h3>
            <p className="text-slate-500 text-sm">Scan QR codes to view the immutable supply chain timeline.</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
