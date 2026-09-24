"use client";
import { useState } from 'react';

interface TelemetryPoint {
  id?: number;
  temperature: number;
  humidity: number;
  weight: number;
  timestamp: string;
}

interface TelemetryChartProps {
  data: TelemetryPoint[];
}

export default function TelemetryChart({ data }: TelemetryChartProps) {
  const [activeMetric, setActiveMetric] = useState<'temperature' | 'humidity' | 'weight'>('temperature');

  if (!data || data.length === 0) {
    return (
      <div className="text-center text-xs text-slate-500 py-12 bg-slate-950 rounded-xl border border-slate-800">
        No telemetry stream data available for chart rendering.
      </div>
    );
  }

  // Reverse data to display chronologically left-to-right
  const points = [...data].reverse().slice(-15);
  const width = 600;
  const height = 180;
  const padding = 25;

  const values = points.map(p => p[activeMetric]);
  const minVal = Math.min(...values, activeMetric === 'temperature' ? 30 : activeMetric === 'humidity' ? 40 : 10);
  const maxVal = Math.max(...values, activeMetric === 'temperature' ? 40 : activeMetric === 'humidity' ? 80 : 35);
  const range = maxVal - minVal || 1;

  const chartPoints = points.map((p, idx) => {
    const x = padding + (idx / Math.max(1, points.length - 1)) * (width - padding * 2);
    const y = height - padding - ((p[activeMetric] - minVal) / range) * (height - padding * 2);
    return { x, y, val: p[activeMetric], time: new Date(p.timestamp).toLocaleTimeString() };
  });

  const pathD = chartPoints.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${chartPoints[chartPoints.length - 1].x} ${height - padding} L ${chartPoints[0].x} ${height - padding} Z`;

  const colorMap = {
    temperature: { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.15)', label: 'Temperature (°C)', unit: '°C' },
    humidity: { stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.15)', label: 'Relative Humidity (%)', unit: '%' },
    weight: { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.15)', label: 'Hive Scale Weight (kg)', unit: 'kg' }
  };

  const currentTheme = colorMap[activeMetric];

  return (
    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <span>Dynamic Telemetry Curve</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-400">Real-Time</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Telemetry metrics streamed from ESP32 node</p>
        </div>

        {/* Metric Selector Pills */}
        <div className="flex space-x-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveMetric('temperature')}
            className={`px-3 py-1 rounded-lg transition-colors ${activeMetric === 'temperature' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Temp (°C)
          </button>
          <button
            onClick={() => setActiveMetric('humidity')}
            className={`px-3 py-1 rounded-lg transition-colors ${activeMetric === 'humidity' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Humidity (%)
          </button>
          <button
            onClick={() => setActiveMetric('weight')}
            className={`px-3 py-1 rounded-lg transition-colors ${activeMetric === 'weight' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Weight (kg)
          </button>
        </div>
      </div>

      {/* SVG Chart Render */}
      <div className="relative overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#1e293b" strokeDasharray="3 3" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#1e293b" strokeDasharray="3 3" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#1e293b" />

          {/* Area Fill */}
          <path d={areaD} fill={currentTheme.fill} />

          {/* Line Path */}
          <path d={pathD} fill="none" stroke={currentTheme.stroke} strokeWidth="2.5" strokeLinecap="round" />

          {/* Points & Labels */}
          {chartPoints.map((pt, i) => (
            <g key={i} className="group cursor-pointer">
              <circle cx={pt.x} cy={pt.y} r="4" fill={currentTheme.stroke} className="transition-transform group-hover:r-6" />
              <text x={pt.x} y={pt.y - 8} fill="#e2e8f0" fontSize="9" fontFamily="monospace" textAnchor="middle" className="opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                {pt.val}{currentTheme.unit}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="flex justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-900">
        <span>Earliest Record: {chartPoints[0]?.time}</span>
        <span>Latest Telemetry Reading: {chartPoints[chartPoints.length - 1]?.val}{currentTheme.unit}</span>
      </div>
    </div>
  );
}
