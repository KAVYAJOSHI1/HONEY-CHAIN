"use client";
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import GlobalNavbar from '@/components/GlobalNavbar';
import TelemetryChart from '@/components/TelemetryChart';

export default function HiveDetail({ params }: { params: { hiveId: string } }) {
  const [isSyncing, setIsSyncing] = useState(true);
  const [telemetry, setTelemetry] = useState<any[]>([]);
  const [healthData, setHealthData] = useState<any>(null);
  const [productivityData, setProductivityData] = useState<any>(null);
  const [analyses, setAnalyses] = useState<any[]>([]);
  
  // AI State
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState('');
  const [activeAnalysisResult, setActiveAnalysisResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Mint State
  const [minting, setMinting] = useState(false);
  const [mintResult, setMintResult] = useState<{ tx_hash: string; batch_id: string; qr_code: string } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsSyncing(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const fetchData = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const [telRes, healthRes, prodRes, anRes] = await Promise.all([
        fetch(`${apiUrl}/hives/${params.hiveId}/telemetry`),
        fetch(`${apiUrl}/hives/${params.hiveId}/health`),
        fetch(`${apiUrl}/hives/${params.hiveId}/productivity`),
        fetch(`${apiUrl}/hives/${params.hiveId}/analyses`)
      ]);
      
      if (telRes.ok) setTelemetry(await telRes.json());
      if (healthRes.ok) setHealthData(await healthRes.json());
      if (prodRes.ok) setProductivityData(await prodRes.json());
      if (anRes.ok) setAnalyses(await anRes.json());
    } catch {
      console.error("Failed to fetch hive data");
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [params.hiveId]);

  // Draw YOLO Bounding Boxes on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw dark honeycomb background simulation on canvas
    ctx.fillStyle = '#1e1b18';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw honeycomb pattern
    ctx.strokeStyle = '#382a17';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 30) {
      for (let y = 0; y < canvas.height; y += 35) {
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }

    if (!activeAnalysisResult || !activeAnalysisResult.detections) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Select a preset demo frame or upload an image to view YOLO inference bounding boxes', canvas.width / 2, canvas.height / 2);
      return;
    }

    // Draw Simulated Bees (Dots)
    const beeCount = activeAnalysisResult.bee_count || 45;
    for (let i = 0; i < beeCount; i++) {
      const bx = (Math.sin(i * 99) * 0.5 + 0.5) * (canvas.width - 40) + 20;
      const by = (Math.cos(i * 33) * 0.5 + 0.5) * (canvas.height - 40) + 20;
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(bx, by, 4, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Draw Detections Bounding Boxes
    activeAnalysisResult.detections.forEach((det: any) => {
      const [xmin, ymin, xmax, ymax] = det.bbox;
      const width = Math.max(30, (xmax - xmin) * (canvas.width / 500));
      const height = Math.max(30, (ymax - ymin) * (canvas.height / 500));
      const x = (xmin / 500) * canvas.width;
      const y = (ymin / 500) * canvas.height;

      if (det.class === 'varroa_mite') {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.strokeRect(x, y, width, height);
        ctx.fillRect(x, y, width, height);

        ctx.fillStyle = '#ef4444';
        ctx.fillRect(x, y - 18, 110, 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`Varroa ${Math.round(det.confidence * 100)}%`, x + 4, y - 5);
      } else {
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, width, height);
      }
    });
  }, [activeAnalysisResult]);

  const runSamplePreset = async (presetType: 'HEALTHY' | 'VARROA_ALERT') => {
    setAnalyzing(true);
    setAiError('');
    try {
      // Simulate create frame file
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));
      const sampleFile = new File([blob], `${presetType.toLowerCase()}_frame.png`, { type: 'image/png' });
      
      const formData = new FormData();
      formData.append('file', sampleFile);
      formData.append('hive_id', params.hiveId);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/analyze-frame/`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      
      if (presetType === 'VARROA_ALERT') {
        // Inject high varroa count for clear visual
        data.results.mite_count = 6;
        data.results.health_score = 52.0;
        data.results.infection_rate_percentage = 12.5;
        data.results.detections = [
          { class: 'varroa_mite', confidence: 0.96, bbox: [60, 80, 140, 160] },
          { class: 'varroa_mite', confidence: 0.92, bbox: [220, 180, 290, 250] },
          { class: 'varroa_mite', confidence: 0.88, bbox: [310, 70, 380, 130] },
        ];
      }
      
      setActiveAnalysisResult(data.results);
      await fetchData();
    } catch (e: any) {
      setAiError(e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setAiError('');
    }
  };

  const runAnalysis = async () => {
    if (!file) return;
    setAnalyzing(true);
    setAiError('');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('hive_id', params.hiveId);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/analyze-frame/`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      setActiveAnalysisResult(data.results);
      await fetchData();
      setFile(null);
    } catch (e: any) {
      setAiError(e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleMint = async () => {
    if (!healthData) return;
    setMinting(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/mint-batch/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hive_id: parseInt(params.hiveId),
          floral_source: "Wildflower Honey",
          weight: telemetry[0]?.weight || 32.5,
          health_score: healthData.health_score
        })
      });
      if (!res.ok) throw new Error("Minting failed");
      const data = await res.json();
      setMintResult(data);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setMinting(false);
    }
  };

  const latestTel = telemetry.length > 0 ? telemetry[0] : null;
  const isHarvestReady = latestTel && latestTel.weight > 30.0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-amber-500 selection:text-slate-950">
      <GlobalNavbar title={`Hive #${params.hiveId} Workspace`} role="beekeeper" />

      <div className="p-8 max-w-7xl mx-auto space-y-8">
        
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-6 gap-4">
          <div>
            <Link href="/beekeeper" className="text-xs text-amber-400 hover:underline mb-1 inline-block">&larr; Back to Hive Fleet</Link>
            <h1 className="text-3xl font-extrabold text-slate-100 flex items-center gap-3">
              Hive #{params.hiveId} Command & Inspection
              {healthData && (
                <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full border ${healthData.overall_status === 'Healthy' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                  {healthData.overall_status}
                </span>
              )}
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            <div className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${isSyncing ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`}></div>
              {isSyncing ? 'Syncing Sensors...' : 'Live Stream Active'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column: Live Sensor Telemetry & Harvest Extraction */}
          <div className="space-y-6">
            
            {/* Live Telemetry Panel */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center justify-between">
                <span>Real-Time Sensor Telemetry</span>
                <span className="text-xs text-slate-500 font-mono">ESP32 Node</span>
              </h2>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="text-slate-400 text-xs mb-1">Temperature</div>
                  <div className={`text-2xl font-extrabold font-mono ${latestTel && latestTel.temperature > 37 ? 'text-red-400' : 'text-slate-100'}`}>
                    {latestTel ? `${latestTel.temperature.toFixed(1)}°C` : '...'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Ideal: 34.0 - 36.5°C</div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="text-slate-400 text-xs mb-1">Relative Humidity</div>
                  <div className="text-2xl font-extrabold font-mono text-slate-100">
                    {latestTel ? `${latestTel.humidity.toFixed(1)}%` : '...'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">Ideal: 45 - 60%</div>
                </div>

                <div className={`bg-slate-950 p-4 rounded-xl border col-span-2 ${isHarvestReady ? 'border-amber-500/80 bg-amber-500/10' : 'border-slate-800'}`}>
                  <div className="text-slate-400 text-xs mb-1 flex justify-between">
                    <span>Nectar Scale Weight</span>
                    {isHarvestReady && <span className="text-amber-400 font-bold animate-pulse">✓ HARVEST READY</span>}
                  </div>
                  <div className={`text-3xl font-extrabold font-mono ${isHarvestReady ? 'text-amber-400' : 'text-slate-100'}`}>
                    {latestTel ? `${latestTel.weight.toFixed(1)} kg` : '...'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Threshold: 30.0 kg</div>
                </div>
              </div>

              {/* Mint & Extraction Button */}
              <button 
                onClick={handleMint} 
                disabled={minting || !healthData}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-slate-950 text-sm font-extrabold py-3.5 rounded-xl shadow-lg transition-all"
              >
                {minting ? 'Minting ERC-721 Token...' : '🍯 Harvest Honey & Mint Blockchain Batch'}
              </button>

              {mintResult && (
                <div className="mt-6 p-5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl space-y-3">
                  <div className="flex items-center text-emerald-400 font-bold text-sm">
                    <span className="mr-2">✓</span> Batch Minted Successfully!
                  </div>
                  <div className="text-xs text-slate-300 font-mono space-y-1 bg-slate-950 p-3 rounded border border-emerald-950">
                    <p><span className="text-slate-500">Batch ID:</span> {mintResult.batch_id}</p>
                    <p className="truncate"><span className="text-slate-500">Tx Hash:</span> {mintResult.tx_hash}</p>
                  </div>
                  {mintResult.qr_code && (
                    <div className="flex items-center space-x-4 pt-2">
                      <img src={mintResult.qr_code} alt="Batch QR Code" className="w-20 h-20 rounded border border-emerald-500/40 bg-white p-1" />
                      <div>
                        <p className="text-xs text-slate-300 font-semibold mb-1">Consumer Verification QR</p>
                        <Link href={`/consumer/${mintResult.batch_id}`} className="text-xs text-amber-400 hover:underline font-bold block">
                          Open Verification View &rarr;
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Historical Alerts */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-slate-100 mb-4">Hive Diagnostics & Alerts</h2>
              {healthData?.alerts && healthData.alerts.length > 0 ? (
                <div className="space-y-2">
                  {healthData.alerts.map((a: string, i: number) => (
                    <div key={i} className="text-xs bg-red-500/10 p-3 rounded-lg border border-red-500/30 text-red-300 font-medium">
                      ⚠️ {a}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-emerald-400 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/30">
                  ✓ All sensors reporting normal parameters. No active disease or thermal warnings.
                </div>
              )}
            </div>

          </div>

          {/* Middle & Right Column: AI Frame YOLO Inspector & Trends */}
          <div className="lg:col-span-2 space-y-6">

            {/* YOLO AI Varroa Detector Canvas */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    🧠 AI Colony Health Visualizer (YOLO Varroa Detector)
                  </h2>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Analyzes frame photography to detect Varroa destructor parasitic mites and colony health index.
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => runSamplePreset('HEALTHY')}
                    disabled={analyzing}
                    className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-medium transition-colors"
                  >
                    Preset 1: Healthy Frame
                  </button>
                  <button 
                    onClick={() => runSamplePreset('VARROA_ALERT')}
                    disabled={analyzing}
                    className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg text-xs font-medium transition-colors"
                  >
                    Preset 2: Varroa Alert
                  </button>
                </div>
              </div>

              {/* Bounding Box Canvas Display */}
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video flex items-center justify-center mb-4">
                <canvas 
                  ref={canvasRef} 
                  width={640} 
                  height={360} 
                  className="w-full h-full object-contain"
                />
                {analyzing && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center">
                    <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <span className="text-xs font-mono text-amber-300">Running YOLO Deep Learning Inference...</span>
                  </div>
                )}
              </div>

              {/* AI Diagnostic Breakdown Bar */}
              {activeAnalysisResult && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-950 rounded-xl border border-slate-800 mb-4">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Health Score</div>
                    <div className={`text-xl font-bold font-mono ${activeAnalysisResult.health_score > 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {activeAnalysisResult.health_score}/100
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Varroa Mites</div>
                    <div className={`text-xl font-bold font-mono ${activeAnalysisResult.mite_count > 3 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {activeAnalysisResult.mite_count} Detected
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Healthy Bees</div>
                    <div className="text-xl font-bold font-mono text-slate-200">
                      {activeAnalysisResult.bee_count}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Infection Rate</div>
                    <div className={`text-xl font-bold font-mono ${activeAnalysisResult.infection_rate_percentage > 5 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {activeAnalysisResult.infection_rate_percentage}%
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Image Upload */}
              <div className="flex items-center space-x-3">
                <input type="file" accept="image/png, image/jpeg" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-colors"
                >
                  {file ? `✓ ${file.name}` : '📁 Upload Custom Frame Image'}
                </button>
                {file && (
                  <button 
                    onClick={runAnalysis}
                    disabled={analyzing}
                    className="px-4 py-2 bg-amber-500 text-slate-950 hover:bg-amber-400 text-xs font-bold rounded-xl transition-colors"
                  >
                    Run Custom YOLO AI Scan
                  </button>
                )}
              </div>
              {aiError && <p className="text-red-400 text-xs mt-2">{aiError}</p>}
            </div>

            {/* Dynamic Telemetry Curve Chart */}
            <TelemetryChart data={telemetry} />

            {/* AI Analysis History */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-slate-100 mb-4">Historical AI Health Log</h2>
              {analyses.length === 0 ? (
                <div className="text-xs text-slate-500 py-6 text-center bg-slate-950 rounded-xl border border-slate-800">
                  No AI analyses performed yet. Click a preset frame above to run your first YOLO scan.
                </div>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {analyses.map((an: any) => (
                    <div key={an.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                      <div>
                        <div className="font-bold text-slate-200 mb-1">
                          Health Score: <span className={an.health_score > 80 ? 'text-emerald-400' : 'text-amber-400'}>{an.health_score}</span>
                        </div>
                        <div className="text-slate-400">
                          {new Date(an.timestamp).toLocaleString()} • Varroa: {an.varroa_count} • Bees: {an.healthy_bee_count}
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-[10px] text-slate-500 block uppercase">Infection</span>
                        <span className="text-red-400 font-bold">{(an.infection_rate * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Trend-based Harvest Forecast */}
            {productivityData && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-bold text-slate-100 mb-1">Trend-Based Harvest & Nectar Forecast</h2>
                <p className="text-xs text-slate-400 mb-4">Predictive yield model combining ambient thermal index and scale weight trends.</p>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                    <div className="text-slate-400 text-xs mb-1">Predicted Nectar Yield</div>
                    <div className="text-2xl font-extrabold text-amber-400 font-mono">{productivityData.predicted_yield_kg} kg</div>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                    <div className="text-slate-400 text-xs mb-1">Weight Delta Trend</div>
                    <div className="text-2xl font-extrabold text-blue-400 font-mono">
                      {productivityData.contributing_features?.weight_trend_kg > 0 ? '+' : ''}{productivityData.contributing_features?.weight_trend_kg} kg
                    </div>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                    <div className="text-slate-400 text-xs mb-1">Forecast Model Confidence</div>
                    <div className="text-2xl font-bold text-slate-200 capitalize">{productivityData.confidence}</div>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
