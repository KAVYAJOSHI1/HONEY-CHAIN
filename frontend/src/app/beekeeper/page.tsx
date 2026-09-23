"use client";
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function BeekeeperPortal() {
  const [isSyncing, setIsSyncing] = useState(true);
  const [telemetry, setTelemetry] = useState<{ temperature: number; humidity: number; weight: number } | null>(null);
  
  // AI State
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<{ results: { health_score: number; detections: { class: string }[] } } | null>(null);
  const [aiError, setAiError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mint State
  const [minting, setMinting] = useState(false);
  const [mintResult, setMintResult] = useState<{ tx_hash: string; batch_id: string } | null>(null);

  useEffect(() => {
    // Simulate offline sync
    const timer = setTimeout(() => setIsSyncing(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Fetch telemetry periodically
    const fetchTelemetry = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/telemetry/1?limit=1`);
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) setTelemetry(data[0]);
        }
      } catch {
        console.error("Failed to fetch telemetry");
      }
    };
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setAiResult(null);
      setAiError('');
    }
  };

  const runAnalysis = async () => {
    if (!file) return;
    setAnalyzing(true);
    setAiError('');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/analyze-frame/`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Analysis failed");
      }
      const data = await res.json();
      setAiResult(data);
    } catch (e: unknown) {
      setAiError((e as Error).message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleMint = async () => {
    if (!aiResult) {
      alert("Run AI Analysis first to get a health score.");
      return;
    }
    setMinting(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/mint-batch/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hive_id: 1,
          floral_source: "Wildflower",
          weight: telemetry?.weight || 32.5,
          health_score: aiResult.results.health_score
        })
      });
      if (!res.ok) throw new Error("Minting failed");
      const data = await res.json();
      setMintResult(data);
    } catch (e: unknown) {
      alert((e as Error).message);
    } finally {
      setMinting(false);
    }
  };

  const isHarvestReady = telemetry && telemetry.weight > 30.0;

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
          
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full ${isHarvestReady ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-white transition-colors">Hive Alpha-01</h3>
                <p className="text-xs text-slate-500">Installed: Mar 15, 2026 • Region: North Cluster</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800">
                <div className="text-slate-400 text-xs mb-1">Temperature</div>
                <div className="text-xl font-mono text-slate-200">
                  {telemetry ? `${telemetry.temperature.toFixed(1)}°C` : '...'}
                </div>
              </div>
              <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800">
                <div className="text-slate-400 text-xs mb-1">Humidity</div>
                <div className="text-xl font-mono text-slate-200">
                  {telemetry ? `${telemetry.humidity.toFixed(1)}%` : '...'}
                </div>
              </div>
              <div className={`bg-slate-950/50 rounded-lg p-3 border ${isHarvestReady ? 'border-amber-500' : 'border-slate-800'} relative`}>
                {isHarvestReady && (
                  <div className="absolute -top-2 -right-2 bg-amber-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg animate-pulse">
                    Harvest Ready!
                  </div>
                )}
                <div className="text-slate-400 text-xs mb-1">Weight</div>
                <div className={`text-xl font-mono ${isHarvestReady ? 'text-amber-400' : 'text-slate-200'}`}>
                  {telemetry ? `${telemetry.weight.toFixed(1)} kg` : '...'}
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button 
                onClick={handleMint} 
                disabled={minting || !aiResult}
                className="w-full bg-amber-500/20 disabled:opacity-50 hover:bg-amber-500/30 text-amber-400 border border-amber-500/50 text-sm font-bold py-3 rounded-lg transition-colors"
              >
                {minting ? 'Minting Batch...' : 'Log Extraction (IPFS Mint)'}
              </button>
            </div>
            
            {mintResult && (
              <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <h4 className="text-emerald-400 font-bold mb-2">✓ Minting Successful!</h4>
                <p className="text-xs text-slate-400 mb-2">Tx: {mintResult.tx_hash}</p>
                <Link href={`/consumer/${mintResult.batch_id}`} className="text-sm text-blue-400 hover:underline">
                  &rarr; View Consumer Portal
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* AI Disease Scanner */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-fit">
          <h2 className="text-xl font-semibold text-slate-100 mb-1">AI Frame Scanner</h2>
          <p className="text-slate-500 text-[10px] uppercase font-bold mb-4 tracking-wider">Prototype Inference Pipeline</p>
          <p className="text-slate-400 text-sm mb-6">Upload a photo of a hive frame. Our YOLO model will analyze it for Varroa mites.</p>
          
          <input 
            type="file" 
            accept="image/png, image/jpeg" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            className="hidden" 
          />
          
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed ${file ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-700 hover:border-amber-500/50 hover:bg-amber-500/5'} rounded-xl h-48 flex flex-col items-center justify-center text-slate-500 transition-all cursor-pointer mb-4 overflow-hidden relative`}
          >
            {file ? (
              <div className="text-emerald-500 font-semibold text-sm">
                ✓ {file.name}
              </div>
            ) : (
              <>
                <svg className="w-8 h-8 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                <span className="text-sm">Tap to upload image (Max 5MB)</span>
              </>
            )}
          </div>
          
          {aiError && <p className="text-red-400 text-xs mb-4">{aiError}</p>}
          
          <button 
            onClick={runAnalysis}
            disabled={!file || analyzing}
            className="w-full bg-slate-800 disabled:opacity-50 hover:bg-slate-700 text-slate-200 font-medium py-2 rounded-lg transition-colors mb-4"
          >
            {analyzing ? 'Analyzing Frame...' : 'Run YOLO Analysis'}
          </button>

          {aiResult && (
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <h4 className="text-sm font-bold text-slate-300 mb-2">Analysis Results</h4>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">Varroa Mites Detected:</span>
                <span className="text-red-400 font-bold">{aiResult.results.detections.filter((d: { class: string }) => d.class === 'varroa_mite').length}</span>
              </div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">Healthy Bees Detected:</span>
                <span className="text-emerald-400 font-bold">{aiResult.results.detections.filter((d: { class: string }) => d.class === 'bee').length}</span>
              </div>
              <div className="flex justify-between text-xs mt-3 pt-3 border-t border-slate-800">
                <span className="text-slate-400 font-semibold">Overall Health Score:</span>
                <span className="text-amber-400 font-bold text-sm">{aiResult.results.health_score}/100</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
