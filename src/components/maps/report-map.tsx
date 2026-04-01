"use client";

import dynamic from "next/dynamic";
import type { MapMarker } from "@/lib/data/signal-types";

type ReportMapProps = {
  markers: MapMarker[];
  focus?: { latitude: number; longitude: number };
  heightClassName?: string;
};

const ReportMapClient = dynamic(
  () => import("@/components/maps/report-map-client").then((mod) => mod.ReportMapClient),
  {
    ssr: false,
  },
);

export function ReportMap({
  markers,
  focus,
  heightClassName = "h-[560px]",
}: ReportMapProps) {
  return (
    <ReportMapClient
      focus={focus}
      heightClassName={heightClassName}
      markers={markers}
    />
  );
}
