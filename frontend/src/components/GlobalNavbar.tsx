"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function GlobalNavbar({ title, role }: { title: string, role: 'admin' | 'beekeeper' }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ hives: any[], batches: any[] } | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/notifications`);
        if (res.ok) {
          setNotifications(await res.json());
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults(null);
      return;
    }
    const search = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          setSearchResults(await res.json());
          setShowSearch(true);
        }
      } catch (e) {
        console.error(e);
      }
    };
    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center relative z-50">
      <div className="flex items-center space-x-4">
        <Link href="/" className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
          Honey Chain
        </Link>
        <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300 border border-slate-700">{title}</span>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
          DEMO MODE
        </span>
      </div>
      
      <div className="hidden lg:flex items-center space-x-4 text-xs text-slate-300">
        <Link href="/ai-insights" className="hover:text-amber-400 transition-colors">🧠 AI Insights</Link>
        <Link href="/alerts" className="hover:text-amber-400 transition-colors">🔔 Alert Center</Link>
        <Link href="/beekeeper/apiary" className="hover:text-amber-400 transition-colors">🐝 Apiary View</Link>
        <Link href="/admin/analytics" className="hover:text-amber-400 transition-colors">📊 Analytics</Link>
        <Link href="/admin/security" className="hover:text-amber-400 transition-colors">🛡️ Security</Link>
        <Link href="/system-health" className="hover:text-amber-400 transition-colors">⚡ Health 2.0</Link>
      </div>
      
      <div className="flex items-center space-x-6 relative">
        {/* Global Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search batches or hives..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => { if (searchResults) setShowSearch(true) }}
            onBlur={() => setTimeout(() => setShowSearch(false), 200)}
            className="bg-slate-950 border border-slate-700 rounded-full px-4 py-1.5 text-sm text-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none w-64 transition-all"
          />
          {showSearch && searchResults && (
            <div className="absolute top-10 right-0 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden max-h-96 overflow-y-auto">
              <div className="p-2 text-xs font-bold text-slate-500 uppercase bg-slate-900/50">Hives</div>
              {searchResults.hives.length === 0 && <div className="p-3 text-sm text-slate-400">No hives found.</div>}
              {searchResults.hives.map(h => (
                <div key={h.id} className="p-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700/50 transition-colors" onClick={() => router.push(`/beekeeper/hives/${h.id}`)}>
                  <div className="font-bold text-slate-200 text-sm">Hive #{h.id}</div>
                  <div className="text-xs text-emerald-400">{h.status}</div>
                </div>
              ))}
              
              <div className="p-2 text-xs font-bold text-slate-500 uppercase bg-slate-900/50">Batches</div>
              {searchResults.batches.length === 0 && <div className="p-3 text-sm text-slate-400">No batches found.</div>}
              {searchResults.batches.map(b => (
                <div key={b.id} className="p-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700/50 transition-colors" onClick={() => router.push(`/consumer/${b.batch_id}`)}>
                  <div className="font-bold text-slate-200 text-sm truncate">{b.batch_id}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="text-slate-400 hover:text-white relative"
          >
            🔔
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
            )}
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
            )}
          </button>
          
          {showNotifications && (
            <div className="absolute top-10 right-0 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
              <div className="p-3 border-b border-slate-700 flex justify-between items-center bg-slate-900">
                <span className="font-bold text-sm text-slate-200">Notifications</span>
                <span className="text-xs text-slate-400">{notifications.length} Unread</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-400">You&apos;re all caught up!</div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className="p-3 border-b border-slate-700/50 hover:bg-slate-700/50 transition-colors">
                      <div className="text-sm text-slate-200 mb-1">{n.message}</div>
                      <div className="text-xs text-slate-500">{new Date(n.timestamp).toLocaleString()}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Reset Demo Button */}
        <button
          onClick={async () => {
            try {
              const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
              const res = await fetch(`${apiUrl}/system/reset-demo`, { method: 'POST' });
              if (res.ok) {
                alert("✓ Demo database reset and re-seeded successfully!");
                window.location.reload();
              }
            } catch {
              alert("Failed to reset demo");
            }
          }}
          className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-medium transition-colors"
        >
          ↻ Reset Demo
        </button>

        {/* Role Toggle & Direct Portal Links */}
        <div className="flex items-center space-x-3 text-xs">
          <Link href="/beekeeper" className={`px-2.5 py-1 rounded transition-colors ${role === 'beekeeper' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold' : 'text-slate-400 hover:text-slate-200'}`}>
            Beekeeper
          </Link>
          <Link href="/admin" className={`px-2.5 py-1 rounded transition-colors ${role === 'admin' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 font-semibold' : 'text-slate-400 hover:text-slate-200'}`}>
            KVIC Admin
          </Link>
          <Link href="/consumer/demo-batch-101" className="px-2.5 py-1 rounded text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors">
            Consumer QR View ↗
          </Link>
        </div>
      </div>
    </header>
  );
}
