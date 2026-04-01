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
import type { MapMarker } from "@/lib/data/queries";

type ReportMapClientProps = {
  markers: MapMarker[];
  focus?: { latitude: number; longitude: number };
  heightClassName?: string;
};

function HeatLayer({ markers }: { markers: MapMarker[] }) {
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

    const points = markers.map((marker) => {
      const weight =
        marker.severity === "CRITICAL"
          ? 1
          : marker.severity === "HIGH"
            ? 0.8
            : marker.severity === "MEDIUM"
              ? 0.55
              : 0.3;

      return [marker.latitude, marker.longitude, weight] as [number, number, number];
    });

    const layer = (L as typeof L & {
      heatLayer: (
        latlngs: Array<[number, number, number]>,
        options: Record<string, unknown>,
      ) => L.Layer;
    }).heatLayer(points, {
      radius: 28,
      blur: 20,
      maxZoom: 15,
      gradient: {
        0.2: "#97d3d0",
        0.45: "#2c8f98",
        0.7: "#ca7b32",
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
  }, [map, markers]);

  return null;
}

function ViewportController({
  markers,
  focus,
}: {
  markers: MapMarker[];
  focus?: { latitude: number; longitude: number };
}) {
  const map = useMap();

  useEffect(() => {
    if (focus) {
      map.setView([focus.latitude, focus.longitude], Math.max(map.getZoom(), 15), {
        animate: false,
      });
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
  }, [focus, map, markers]);

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

export function ReportMapClient({
  markers,
  focus,
  heightClassName = "h-[560px]",
}: ReportMapClientProps) {
  const icon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: `<div style="width:16px;height:16px;border-radius:999px;background:#0d2732;border:3px solid #8ee3de;box-shadow:0 0 0 6px rgba(18,99,111,0.16)"></div>`,
        iconAnchor: [8, 8],
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
    <div className={`overflow-hidden rounded-[1.7rem] border border-line ${heightClassName}`}>
      <MapContainer
        center={initialCenter}
        className="h-full w-full"
        scrollWheelZoom
        zoom={initialZoom}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ViewportController focus={focus} markers={markers} />
        <HeatLayer markers={markers} />
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
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            icon={icon}
            position={[marker.latitude, marker.longitude]}
          >
            <Popup>
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  {marker.waterBodyName}
                </div>
                <div className="font-semibold">{marker.title}</div>
                <div className="text-sm text-slate-600">
                  {marker.summary ?? "No AI summary yet."}
                </div>
                <a
                  className="text-sm font-semibold text-teal-700"
                  href={`/reports/${marker.id}`}
                >
                  Open report
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
