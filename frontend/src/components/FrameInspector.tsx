"use client";
import { useEffect, useRef, useState } from "react";
import { ImageUp, ScanSearch, ShieldCheck, Bug } from "lucide-react";
import { api } from "@/lib/api";
import { num } from "@/lib/format";
import { scoreTone, toneClasses } from "@/lib/status";
import type { FrameResult } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

/** Draws a synthetic brood-comb frame so the demo presets have a real image to analyze. */
async function syntheticFrame(kind: "healthy" | "varroa"): Promise<File> {
  const c = document.createElement("canvas");
  c.width = 960;
  c.height = 600;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#3b2a12";
  ctx.fillRect(0, 0, c.width, c.height);
  const r = 18;
  const w = Math.sqrt(3) * r;
  for (let row = 0; row * r * 1.5 < c.height + r; row++) {
    for (let col = 0; col * w < c.width + w; col++) {
      const cx = col * w + (row % 2 ? w / 2 : 0);
      const cy = row * r * 1.5;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i + Math.PI / 6;
        ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
      }
      ctx.closePath();
      const capped = Math.random() < 0.55;
      ctx.fillStyle = capped ? "#c98b2b" : "#8a5a17";
      ctx.fill();
      ctx.strokeStyle = "#5a3c10";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * c.width;
    const y = Math.random() * c.height;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.random() * Math.PI);
    ctx.fillStyle = "#2b1d0c";
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e0a93a";
    ctx.fillRect(-4, -6, 3, 12);
    ctx.fillRect(3, -6, 3, 12);
    ctx.restore();
  }
  const blob = await new Promise<Blob>((res) => c.toBlob((b) => res(b!), "image/png"));
  return new File([blob], `${kind}_sample_frame.png`, { type: "image/png" });
}

export function FrameInspector({ hiveId, onAnalyzed }: { hiveId: number; onAnalyzed?: () => void }) {
  const [result, setResult] = useState<FrameResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const analyze = async (file: File, scenario?: "healthy" | "varroa") => {
    setBusy(scenario ?? "upload");
    const form = new FormData();
    form.append("file", file);
    form.append("hive_id", String(hiveId));
    if (scenario) form.append("scenario", scenario);
    try {
      const data = await api.upload<{ results: FrameResult }>("/analyze-frame/", form);
      setPreview(URL.createObjectURL(file));
      setResult(data.results);
      onAnalyzed?.();
      const r = data.results;
      toast({
        kind: r.health_score < 70 ? "error" : "success",
        title: r.health_score < 70 ? "Varroa risk detected" : "Frame looks healthy",
        description: `${r.mite_count} mites · frame health ${r.health_score}/100`,
      });
    } catch (e) {
      toast({ kind: "error", title: "Analysis failed", description: e instanceof Error ? e.message : undefined });
    } finally {
      setBusy(null);
    }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ kind: "error", title: "File too large", description: "Maximum size is 5 MB." });
      return;
    }
    analyze(file);
  };

  const tone = result ? scoreTone(result.health_score) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input ref={inputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={onFile} />
        <Button size="sm" variant="primary" onClick={() => inputRef.current?.click()} loading={busy === "upload"} disabled={!!busy}>
          <ImageUp className="h-3.5 w-3.5" /> Upload frame photo
        </Button>
        <Button size="sm" onClick={async () => analyze(await syntheticFrame("healthy"), "healthy")} loading={busy === "healthy"} disabled={!!busy}>
          <ShieldCheck className="h-3.5 w-3.5 text-good" /> Sample: healthy
        </Button>
        <Button size="sm" onClick={async () => analyze(await syntheticFrame("varroa"), "varroa")} loading={busy === "varroa"} disabled={!!busy}>
          <Bug className="h-3.5 w-3.5 text-critical" /> Sample: infested
        </Button>
      </div>

      <div className="relative flex min-h-[260px] items-center justify-center overflow-hidden rounded-lg border border-line bg-canvas p-2">
        {preview && result ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
            <img src={preview} alt="Analyzed hive frame" className="block max-h-[420px] max-w-full rounded" />
            <div className="absolute inset-0">
              {result.detections.map((d, i) => {
                const [x, y, w, h] = d.bbox_norm;
                return (
                  <div key={i} className="absolute rounded-sm border-2 border-critical bg-critical/15"
                    style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` }}>
                    <span className="absolute -top-5 left-[-2px] whitespace-nowrap rounded-sm bg-critical px-1 text-[10px] font-semibold text-white">
                      Varroa {Math.round(d.confidence * 100)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="px-6 text-center text-ink-3">
            <ScanSearch className="mx-auto mb-2 h-8 w-8" />
            <p className="text-sm">Upload a brood-frame photo (JPEG/PNG, ≤ 5 MB) or run a sample.</p>
            <p className="mt-1 text-xs">Detections are drawn over the image.</p>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-canvas/80 text-sm text-ink-2 backdrop-blur-sm">
            <ScanSearch className="mr-2 h-4 w-4 animate-pulse text-brand" /> Running detection…
          </div>
        )}
      </div>

      {result && tone && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-line bg-surface-2/50 p-3">
            <dt className="label">Frame health</dt>
            <dd className={`mt-1 text-lg font-semibold tabular-nums ${toneClasses[tone].text}`}>{result.health_score}<span className="text-xs text-ink-3">/100</span></dd>
          </div>
          <div className="rounded-lg border border-line bg-surface-2/50 p-3">
            <dt className="label">Varroa mites</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{result.mite_count}</dd>
          </div>
          <div className="rounded-lg border border-line bg-surface-2/50 p-3">
            <dt className="label">Bees counted</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{result.bee_count}</dd>
          </div>
          <div className="rounded-lg border border-line bg-surface-2/50 p-3">
            <dt className="label">Infestation</dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">{num(result.infection_rate_percentage)}%</dd>
          </div>
        </dl>
      )}
      <p className="text-[11px] text-ink-3">Prototype detector: inference is simulated but deterministic per image. Not a substitute for a sticky-board count.</p>
    </div>
  );
}
