"use client";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import Link from "next/link";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import { hiveMeta } from "@/lib/status";
import type { Hive } from "@/lib/types";

const STATUS_HEX: Record<string, string> = { good: "#0ca30c", warn: "#fab219", serious: "#ec835a", critical: "#d03b3b" };

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [32, 32], maxZoom: 13 });
  }, [map, bounds]);
  return null;
}

export default function ApiaryMapInner({ hives, height = 360 }: { hives: Hive[]; height?: number }) {
  const pts = hives.filter((h) => h.gps_lat != null && h.gps_long != null);
  const bounds: LatLngBoundsExpression | null = pts.length
    ? [
        [Math.min(...pts.map((h) => h.gps_lat)), Math.min(...pts.map((h) => h.gps_long))],
        [Math.max(...pts.map((h) => h.gps_lat)), Math.max(...pts.map((h) => h.gps_long))],
      ]
    : null;

  return (
    <MapContainer center={[22.5, 80]} zoom={4} scrollWheelZoom={false} style={{ height, width: "100%" }} className="rounded-b-xl">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        className="map-tiles"
      />
      <FitBounds bounds={bounds} />
      {pts.map((h) => {
        const m = hiveMeta(h.status);
        const color = STATUS_HEX[m.tone] ?? "#8f8e86";
        return (
          <CircleMarker key={h.id} center={[h.gps_lat, h.gps_long]} radius={7}
            pathOptions={{ color: "#1a1a19", weight: 2, fillColor: color, fillOpacity: 0.95 }}>
            <Popup>
              <div className="space-y-0.5">
                <div className="font-semibold">Hive #{h.id} · {m.label}</div>
                <div>{h.cluster_name}</div>
                <div>Health {h.health_score}/100{h.latest_weight != null ? ` · ${h.latest_weight} kg` : ""}</div>
                <Link href={`/beekeeper/hives/${h.id}`} className="font-medium text-[#f5a524]">Open hive →</Link>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
