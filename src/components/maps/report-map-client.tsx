"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet.heat";
import "leaflet/dist/leaflet.css";
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { MapMarker } from "@/lib/data/signal-types";

type ReportMapClientProps = {
  markers: MapMarker[];
  focus?: { latitude: number; longitude: number };
  heightClassName?: string;
  mode?: "default" | "heatmap";
  viewport?: "auto" | "india";
  showHeatLegend?: boolean;
};

const INDIA_BOUNDS = L.latLngBounds(
  [6.4, 67.5],
  [37.8, 97.5],
);

function HeatLayer({
  markers,
  mode,
}: {
  markers: MapMarker[];
  mode: "default" | "heatmap";
}) {
  const map = useMap();
  const layerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    if (markers.length === 0) {
      return;
    }

    const points = markers.map((marker) => [marker.latitude, marker.longitude, marker.heatWeight] as [number, number, number]);

    const layer = (L as typeof L & {
      heatLayer: (
        latlngs: Array<[number, number, number]>,
        options: Record<string, unknown>,
      ) => L.Layer;
    }).heatLayer(points, {
      radius: mode === "heatmap" ? 24 : 28,
      blur: mode === "heatmap" ? 18 : 20,
      minOpacity: mode === "heatmap" ? 0.38 : 0.24,
      maxZoom: 15,
      gradient: {
        0.12: "#86e3ff",
        0.32: "#35b8d9",
        0.55: "#0e7fa0",
        0.75: "#e58b3a",
        1: "#b7482d",
      },
    });

    map.addLayer(layer);
    layerRef.current = layer;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, markers, mode]);

  return null;
}

function ViewportController({
  markers,
  focus,
  viewport,
}: {
  markers: MapMarker[];
  focus?: { latitude: number; longitude: number };
  viewport: "auto" | "india";
}) {
  const map = useMap();

  useEffect(() => {
    if (focus) {
      map.setView([focus.latitude, focus.longitude], Math.max(map.getZoom(), 15), {
        animate: false,
      });
      return;
    }

    if (viewport === "india") {
      map.fitBounds(INDIA_BOUNDS, { animate: false, padding: [16, 16] });
      return;
    }

    if (markers.length === 0) {
      map.setView([20.5937, 78.9629], 5, { animate: false });
      return;
    }

    if (markers.length === 1) {
      map.setView([markers[0].latitude, markers[0].longitude], 14, {
        animate: false,
      });
      return;
    }

    const bounds = L.latLngBounds(
      markers.map((marker) => [marker.latitude, marker.longitude]),
    );
    map.fitBounds(bounds.pad(0.18), { animate: false });
  }, [focus, map, markers, viewport]);

  return null;
}

function GeolocateButton() {
  const map = useMap();

  return (
    <button
      className="absolute right-3 top-3 z-[1000] rounded-full border border-line bg-white/90 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-foreground shadow-sm"
      onClick={() => {
        if (!navigator.geolocation) {
          return;
        }

        navigator.geolocation.getCurrentPosition((position) => {
          map.flyTo([position.coords.latitude, position.coords.longitude], 14, {
            duration: 1.2,
          });
        });
      }}
      type="button"
    >
      Near me
    </button>
  );
}

function HeatLegend() {
  return (
    <div className="pointer-events-none absolute right-4 top-4 z-[1000] w-[220px] rounded-[1.35rem] border border-black/10 bg-[rgba(255,251,245,0.94)] p-4 shadow-[0_18px_40px_rgba(18,31,40,0.16)] backdrop-blur-md">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0b5061]">
        India heat scale
      </div>
      <div className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#102934]">
        Waste and field pressure
      </div>
      <div className="mt-3 grid gap-2 text-xs text-[#415661]">
        {[
          { label: "Baseline watch", color: "#86e3ff" },
          { label: "Rising pressure", color: "#35b8d9" },
          { label: "Sustained burden", color: "#0e7fa0" },
          { label: "Critical buildup", color: "#e58b3a" },
          { label: "Immediate action", color: "#b7482d" },
        ].map((entry) => (
          <div key={entry.label} className="flex items-center gap-3">
            <span
              className="h-4 w-6 rounded-sm border border-black/5"
              style={{ backgroundColor: entry.color }}
            />
            <span>{entry.label}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-5 text-[#5c6f78]">
        Heat intensity is built from citizen-report severity plus municipal
        waste burden from the dataset. Water-quality feeds remain in the side
        panel because those CSVs do not include measurement coordinates.
      </p>
    </div>
  );
}

export function ReportMapClient({
  markers,
  focus,
  heightClassName = "h-[560px]",
  mode = "default",
  viewport = "auto",
  showHeatLegend = false,
}: ReportMapClientProps) {
  const icons = useMemo(
    () => ({
      USER_REPORT: L.divIcon({
        className: "",
        html: `<div style="width:16px;height:16px;border-radius:999px;background:#0d2732;border:3px solid #8ee3de;box-shadow:0 0 0 6px rgba(18,99,111,0.16)"></div>`,
        iconAnchor: [8, 8],
      }),
      MUNICIPAL_DATASET: L.divIcon({
        className: "",
        html: `<div style="width:16px;height:16px;border-radius:999px;background:#6d3a15;border:3px solid #ffd29a;box-shadow:0 0 0 6px rgba(196,124,56,0.18)"></div>`,
        iconAnchor: [8, 8],
      }),
      WATER_QUALITY_DATASET: L.divIcon({
        className: "",
        html: `<div style="width:16px;height:16px;border-radius:999px;background:#153b70;border:3px solid #96ccff;box-shadow:0 0 0 6px rgba(54,118,188,0.16)"></div>`,
        iconAnchor: [8, 8],
      }),
    }),
    [],
  );

  const initialCenter: [number, number] = focus
    ? [focus.latitude, focus.longitude]
    : markers[0]
      ? [markers[0].latitude, markers[0].longitude]
      : [20.5937, 78.9629];

  const initialZoom = focus || markers[0] ? 13 : 5;

  return (
    <div className={`relative overflow-hidden rounded-[1.7rem] border border-line ${heightClassName}`}>
      <MapContainer
        attributionControl={mode !== "heatmap"}
        center={initialCenter}
        className="h-full w-full"
        maxBounds={viewport === "india" ? INDIA_BOUNDS : undefined}
        maxBoundsViscosity={viewport === "india" ? 0.95 : undefined}
        scrollWheelZoom
        zoom={initialZoom}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ViewportController focus={focus} markers={markers} viewport={viewport} />
        <HeatLayer markers={markers} mode={mode} />
        <GeolocateButton />
        {focus ? (
          <Circle
            center={[focus.latitude, focus.longitude]}
            pathOptions={{
              color: "#1790d5",
              fillColor: "#56c4ff",
              fillOpacity: 0.12,
              weight: 2,
            }}
            radius={120}
          />
        ) : null}
        {mode === "default"
          ? markers.map((marker) => (
              <Marker
                key={marker.id}
                icon={icons[marker.source]}
                position={[marker.latitude, marker.longitude]}
              >
                <Popup>
                  <div className="space-y-2">
                    <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      {marker.sourceLabel}
                    </div>
                    <div className="font-semibold">{marker.title}</div>
                    <div className="text-sm text-slate-500">{marker.waterBodyName}</div>
                    <div className="text-sm text-slate-600">
                      {marker.summary ?? "No AI summary yet."}
                    </div>
                    {marker.metricLabel ? (
                      <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
                        {marker.metricLabel}
                      </div>
                    ) : null}
                    {marker.href ? (
                      <a
                        className="text-sm font-semibold text-teal-700"
                        href={marker.href}
                      >
                        Open report
                      </a>
                    ) : null}
                  </div>
                </Popup>
              </Marker>
            ))
          : null}
      </MapContainer>
      {showHeatLegend ? <HeatLegend /> : null}
    </div>
  );
}
