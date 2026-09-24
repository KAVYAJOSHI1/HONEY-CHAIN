"use client";
import { useState, useEffect } from 'react';
import GlobalNavbar from '@/components/GlobalNavbar';
import HoneyBot from '@/components/HoneyBot';

export default function AIInsightCenter() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/ai-insights`);
        if (res.ok) {
          setData(await res.json());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <GlobalNavbar title="AI Insight Center" role="beekeeper" />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200">
              🧠 Central AI Intelligence Dashboard
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Real-time multi-agent intelligence combining IoT sensor telemetry, YOLO vision analysis, and IsolationForest ML.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full text-xs font-semibold">
              Live Inference Node
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse">Loading AI intelligence telemetry...</div>
        ) : !data ? (
          <div className="p-12 text-center text-red-400">Failed to load AI Insights from backend.</div>
        ) : (
          <div className="space-y-8">
            {/* Top Recommendations Banner */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
                <span>⚡ Actionable Colony Recommendations</span>
                <span className="text-xs font-normal text-slate-400">({data.recommendations?.length || 0} active recommendations)</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.recommendations?.length === 0 ? (
                  <div className="text-sm text-slate-400 p-4 bg-slate-950/50 rounded-xl">All colonies are operating inside healthy baseline parameters.</div>
                ) : (
                  data.recommendations?.map((rec: any, idx: number) => (
                    <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${rec.priority === 'HIGH' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'}`}>
                          {rec.priority} Priority
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">Hive #{rec.hive_id}</span>
                      </div>
                      <h3 className="font-bold text-slate-200 text-sm mb-1">{rec.title}</h3>
                      <p className="text-xs text-slate-400 mb-3">{rec.explanation}</p>
                      <div className="text-xs font-semibold text-slate-300 mb-1">Suggested Actions:</div>
                      <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                        {rec.actions?.map((act: string, aIdx: number) => (
                          <li key={aIdx}>{act}</li>
                        ))}
                      </ul>
                      <div className="mt-3 pt-2 border-t border-slate-900 text-[10px] text-slate-400 flex justify-between">
                        <span>Source: {rec.source}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Grid 3 Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Hive Health Intelligence */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-base font-bold text-slate-200 mb-4 flex items-center gap-2">
                  <span>🐝 Hive Health Intelligence</span>
                </h2>
                <div className="space-y-3">
                  {data.hive_intelligence?.map((h: any) => (
                    <div key={h.hive_id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-sm text-slate-200">Hive #{h.hive_id}</div>
                        <div className="text-xs text-slate-400 truncate max-w-[200px]">{h.score_explanation}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-black ${h.health_score >= 80 ? 'text-emerald-400' : h.health_score >= 65 ? 'text-amber-400' : 'text-red-400'}`}>
                          {h.health_score}
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold">{h.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Disease & Varroa Intelligence */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-base font-bold text-slate-200 mb-4 flex items-center gap-2">
                  <span>🔍 YOLO Disease Intelligence</span>
                </h2>
                <div className="space-y-3">
                  {data.disease_intelligence?.length === 0 ? (
                    <div className="text-sm text-slate-400 p-4 bg-slate-950 rounded-xl">No vision analysis runs recorded yet.</div>
                  ) : (
                    data.disease_intelligence?.map((d: any) => (
                      <div key={d.hive_id} className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-sm text-slate-200">Hive #{d.hive_id}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${d.varroa_count > 5 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                            {d.varroa_count} Varroa Mites
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">
                          Infection Rate: <span className="text-slate-200 font-semibold">{d.infection_rate}%</span> | Healthy Bees: <span className="text-slate-200 font-semibold">{d.healthy_bee_count}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Productivity Intelligence */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-base font-bold text-slate-200 mb-4 flex items-center gap-2">
                  <span>🍯 Productivity & Yield Forecast</span>
                </h2>
                <div className="space-y-3">
                  {data.productivity_intelligence?.map((p: any) => (
                    <div key={p.hive_id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                      <div>
                        <div className="font-bold text-sm text-slate-200">Hive #{p.hive_id}</div>
                        <div className="text-xs text-slate-400">Current: {p.current_weight_kg} kg</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-amber-400">Est. {p.predicted_yield_kg} kg</div>
                        <div className="text-[10px] text-slate-400">{p.harvest_window}</div>
                      </div>
                    </div>
                  ))}
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
