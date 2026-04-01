"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

type LocationPickerProps = {
  latitude: number;
  longitude: number;
  onChange: (coords: { latitude: number; longitude: number }) => void;
};

function MapClickHandler({
  onChange,
}: {
  onChange: (coords: { latitude: number; longitude: number }) => void;
}) {
  useMapEvents({
    click(event) {
      onChange({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
  });

  return null;
}

function FlyToLocation({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const map = useMap();
  const hasCentered = useRef(false);

  useEffect(() => {
    if (!hasCentered.current) {
      map.setView([latitude, longitude], 13);
      hasCentered.current = true;
      return;
    }

    map.flyTo([latitude, longitude], map.getZoom(), {
      duration: 0.7,
    });
  }, [latitude, longitude, map]);

  return null;
}

export function LocationPicker({
  latitude,
  longitude,
  onChange,
}: LocationPickerProps) {
  const icon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: `<div style="width:20px;height:20px;border-radius:999px;background:#ca7b32;border:3px solid #f7f2e9;box-shadow:0 0 0 8px rgba(202,123,50,0.2)"></div>`,
        iconAnchor: [10, 10],
      }),
    [],
  );

  return (
    <div className="overflow-hidden rounded-[1.6rem] border border-line">
      <MapContainer
        center={[latitude, longitude]}
        className="h-[320px] w-full"
        scrollWheelZoom
        zoom={13}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyToLocation latitude={latitude} longitude={longitude} />
        <MapClickHandler onChange={onChange} />
        <Marker icon={icon} position={[latitude, longitude]} />
      </MapContainer>
    </div>
  );
}
