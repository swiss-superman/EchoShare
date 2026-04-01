import type { ReportStatus, SeverityLevel } from "@prisma/client";

export type HotspotSource =
  | "USER_REPORT"
  | "MUNICIPAL_DATASET"
  | "WATER_QUALITY_DATASET";

export type MapMarker = {
  id: string;
  source: HotspotSource;
  sourceLabel: string;
  title: string;
  waterBodyName: string;
  category: string;
  severity: SeverityLevel | null;
  status: ReportStatus | null;
  observedAt: string;
  latitude: number;
  longitude: number;
  summary: string | null;
  primaryImageUrl: string | null;
  isDevelopmentSeed: boolean;
  heatWeight: number;
  metricLabel: string | null;
  href: string | null;
};

export type PriorityBoardEntry = {
  id: string;
  source: HotspotSource;
  sourceLabel: string;
  title: string;
  locationLabel: string;
  summary: string;
  priorityIndex: number;
  metricLabel: string;
  severity: SeverityLevel;
  href: string | null;
};

export type WasteDatasetHotspot = {
  id: string;
  city: string;
  landfillName: string;
  landfillLatitude: number;
  landfillLongitude: number;
  dominantWasteType: string;
  totalWasteTonsPerDay: number;
  averageRecyclingRate: number;
  averageEfficiencyScore: number;
  priorityIndex: number;
  severity: SeverityLevel;
  summary: string;
};

export type WaterQualityFeedSummary = {
  id: string;
  label: string;
  dateRangeLabel: string;
  latestObservedAt: string;
  latestWqi: number;
  latestStatus: string;
  averageWqi: number;
  worstWqi: number;
  poorShare: number;
  priorityIndex: number;
  severity: SeverityLevel;
  topStatus: string;
  sampleCount: number;
};
