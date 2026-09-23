import Link from 'next/link';

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Link href="/" className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            Honey Chain KVIC
          </Link>
          <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30">Command Center</span>
        </div>
        <div className="text-sm text-slate-400">
          Admin: <span className="text-slate-200">admin.kvic.eth</span>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900/50 border-r border-slate-800 p-4 hidden md:block">
          <nav className="space-y-2">
            <div className="px-4 py-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 font-medium">Cluster Heatmap</div>
            <div className="px-4 py-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-lg cursor-pointer transition-colors">Alerts & Anomalies</div>
            <div className="px-4 py-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-lg cursor-pointer transition-colors">Batch Registry (Sepolia)</div>
            <div className="px-4 py-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 rounded-lg cursor-pointer transition-colors">Audits & Revocations</div>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-100 mb-1">National Cluster Health</h1>
              <p className="text-slate-400 text-sm">Real-time overview of active clusters and disease risks.</p>
            </div>
            <button className="bg-slate-800 hover:bg-slate-700 text-white text-sm py-2 px-4 rounded-lg border border-slate-700 transition-colors">
              Export Report
            </button>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <StatCard title="Active Clusters" value="12" trend="+2 this month" />
            <StatCard title="Monitored Hives" value="1,248" trend="+14% YoY" />
            <StatCard title="Disease Risk" value="Low" trend="2 alerts active" color="text-emerald-400" />
            <StatCard title="Batches Minted" value="8,401" trend="On Sepolia" color="text-blue-400" />
          </div>

          {/* Mock Heatmap/Data Area */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-1 flex flex-col h-96 relative overflow-hidden group">
            {/* Fake Map Grid */}
            <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            
            <div className="absolute top-1/4 left-1/4">
              <div className="w-4 h-4 bg-emerald-500 rounded-full animate-ping absolute"></div>
              <div className="w-4 h-4 bg-emerald-500 rounded-full relative border-2 border-slate-900"></div>
            </div>
            
            <div className="absolute top-1/2 right-1/3">
              <div className="w-4 h-4 bg-amber-500 rounded-full animate-ping absolute"></div>
              <div className="w-4 h-4 bg-amber-500 rounded-full relative border-2 border-slate-900"></div>
            </div>

            <div className="absolute bottom-1/4 left-1/2">
              <div className="w-4 h-4 bg-red-500 rounded-full animate-ping absolute" style={{ animationDuration: '1s' }}></div>
              <div className="w-4 h-4 bg-red-500 rounded-full relative border-2 border-slate-900 shadow-[0_0_15px_rgba(239,68,68,0.8)]"></div>
            </div>

            <div className="mt-auto bg-slate-950/80 backdrop-blur border-t border-slate-800 p-4 z-10">
              <div className="flex justify-between items-center text-sm">
                <span className="text-red-400 font-semibold flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                  Alert: High varroa count detected in Cluster South (Hive-44)
                </span>
                <button className="text-blue-400 hover:text-blue-300">Investigate &rarr;</button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function StatCard({ title, value, trend, color = "text-white" }: { title: string, value: string, trend: string, color?: string }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl">
      <h3 className="text-slate-400 text-sm font-medium mb-1">{title}</h3>
      <div className={`text-3xl font-bold mb-2 ${color}`}>{value}</div>
      <div className="text-xs text-slate-500">{trend}</div>
    </div>
  );
}
