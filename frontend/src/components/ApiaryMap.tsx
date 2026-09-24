"use client";
import dynamic from "next/dynamic";
import { hiveStatusMeta, toneClasses } from "@/lib/status";
import type { Hive } from "@/lib/types";

// Leaflet touches `window`, so it's client-only.
const Inner = dynamic(() => import("./ApiaryMapInner"), {
  ssr: false,
  loading: () => <div className="h-full min-h-[360px] animate-pulse rounded-b-xl bg-surface-2" />,
});

export function ApiaryMap({ hives, height }: { hives: Hive[]; height?: number }) {
  return (
    <div className="relative">
      <Inner hives={hives} height={height} />
      <div className="pointer-events-none absolute bottom-6 left-3 z-[500] flex flex-wrap gap-3 rounded-lg border border-line bg-canvas/85 px-3 py-1.5 text-[11px] backdrop-blur">
        {Object.values(hiveStatusMeta).map((m) => (
          <span key={m.label} className="flex items-center gap-1.5 text-ink-2">
            <span className={`h-2 w-2 rounded-full ${toneClasses[m.tone].dot}`} /> {m.label}
          </span>
        ))}
      </div>
    </div>
  );
}
