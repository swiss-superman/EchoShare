import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import type { SeverityLevel } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { INDIA_CITY_COORDINATES } from "@/lib/data/india-city-coordinates";
import type {
  MapMarker,
  WasteDatasetHotspot,
  WaterQualityFeedSummary,
} from "@/lib/data/signal-types";

const DATASET_DIRECTORY = path.join(process.cwd(), "data", "datasets");

type WasteDatasetRow = {
  "City/District": string;
  "Waste Type": string;
  "Waste Generated (Tons/Day)": string;
  "Recycling Rate (%)": string;
  "Population Density (People/km²)": string;
  "Municipal Efficiency Score (1-10)": string;
  "Disposal Method": string;
  "Cost of Waste Management (₹/Ton)": string;
  "Awareness Campaigns Count": string;
  "Landfill Name": string;
  "Landfill Location (Lat, Long)": string;
  "Landfill Capacity (Tons)": string;
  Year: string;
};

type WaterQualityDatasetRow = {
  Date: string;
  DO: string;
  pH: string;
  ORP: string;
  Cond: string;
  Temp: string;
  WQI: string;
  Status: string;
};

type WasteDatasetBundle = {
  latestYear: number;
  totalWasteTonsPerDay: number;
  hotspots: WasteDatasetHotspot[];
  dominantWasteTypes: Array<{ label: string; tonsPerDay: number }>;
  markers: MapMarker[];
};

type WaterQualityDatasetBundle = {
  feeds: WaterQualityFeedSummary[];
};

const numberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

function parseNumeric(value: string) {
  return Number.parseFloat(value.trim());
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function toSeverity(priorityIndex: number): SeverityLevel {
  if (priorityIndex >= 80) {
    return "CRITICAL";
  }

  if (priorityIndex >= 62) {
    return "HIGH";
  }

  if (priorityIndex >= 40) {
    return "MEDIUM";
  }

  return "LOW";
}

function parseLatLong(raw: string) {
  const [latitude, longitude] = raw.split(",").map((part) => Number.parseFloat(part.trim()));

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}

const readDatasetCsv = cache(async (filename: string) => {
  const filePath = path.join(DATASET_DIRECTORY, filename);
  const content = await readFile(filePath, "utf8");

  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Array<Record<string, string>>;
});

const readWasteDataset = cache(async (): Promise<WasteDatasetBundle> => {
  const rows = (await readDatasetCsv(
    "waste-management-and-recycling-india.csv",
  )) as WasteDatasetRow[];
  const latestYear = rows.reduce((latest, row) => {
    const year = Number.parseInt(row.Year, 10);
    return Number.isFinite(year) ? Math.max(latest, year) : latest;
  }, 0);
  const latestRows = rows.filter((row) => Number.parseInt(row.Year, 10) === latestYear);

  const dominantWasteTypes = Array.from(
    latestRows.reduce((accumulator, row) => {
      const current = accumulator.get(row["Waste Type"]) ?? 0;
      accumulator.set(
        row["Waste Type"],
        current + parseNumeric(row["Waste Generated (Tons/Day)"]),
      );
      return accumulator;
    }, new Map<string, number>()),
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([label, tonsPerDay]) => ({
      label,
      tonsPerDay,
    }));

  const cityAccumulator = latestRows.reduce(
    (accumulator, row) => {
      const city = row["City/District"].trim();
      const correctedCityCoordinate = INDIA_CITY_COORDINATES[city];
      const location =
        correctedCityCoordinate
          ? {
              latitude: correctedCityCoordinate.latitude,
              longitude: correctedCityCoordinate.longitude,
            }
          : parseLatLong(row["Landfill Location (Lat, Long)"]);

      if (!location) {
        return accumulator;
      }

      const existing =
        accumulator.get(city) ??
        {
          city,
        landfillName: row["Landfill Name"].trim() || `${city} landfill`,
          latitude: location.latitude,
          longitude: location.longitude,
          totalWasteTonsPerDay: 0,
          recyclingValues: [] as number[],
          efficiencyValues: [] as number[],
          wasteTypeLoads: new Map<string, number>(),
        };

      const wasteTonsPerDay = parseNumeric(row["Waste Generated (Tons/Day)"]);
      existing.totalWasteTonsPerDay += wasteTonsPerDay;
      existing.recyclingValues.push(parseNumeric(row["Recycling Rate (%)"]));
      existing.efficiencyValues.push(
        parseNumeric(row["Municipal Efficiency Score (1-10)"]),
      );
      existing.wasteTypeLoads.set(
        row["Waste Type"],
        (existing.wasteTypeLoads.get(row["Waste Type"]) ?? 0) + wasteTonsPerDay,
      );

      accumulator.set(city, existing);
      return accumulator;
    },
    new Map<
      string,
      {
        city: string;
        landfillName: string;
        latitude: number;
        longitude: number;
        totalWasteTonsPerDay: number;
        recyclingValues: number[];
        efficiencyValues: number[];
        wasteTypeLoads: Map<string, number>;
      }
    >(),
  );

  const withRawScores = Array.from(cityAccumulator.values()).map((entry) => {
    const averageRecyclingRate = average(entry.recyclingValues);
    const averageEfficiencyScore = average(entry.efficiencyValues);
    const dominantWasteType =
      Array.from(entry.wasteTypeLoads.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ??
      "Mixed waste";
    const recyclingGapFactor = 1 + (100 - averageRecyclingRate) / 100;
    const efficiencyGapFactor = 1 + ((10 - averageEfficiencyScore) / 10) * 0.65;
    const priorityRawScore =
      entry.totalWasteTonsPerDay * recyclingGapFactor * efficiencyGapFactor;

    return {
      ...entry,
      averageRecyclingRate,
      averageEfficiencyScore,
      dominantWasteType,
      priorityRawScore,
    };
  });

  const highestPriorityRaw = Math.max(
    ...withRawScores.map((entry) => entry.priorityRawScore),
    1,
  );
  const totalWasteTonsPerDay = withRawScores.reduce(
    (sum, entry) => sum + entry.totalWasteTonsPerDay,
    0,
  );

  const hotspots: WasteDatasetHotspot[] = withRawScores
    .map((entry) => {
      const priorityIndex = Math.round(
        clamp((entry.priorityRawScore / highestPriorityRaw) * 100, 16, 100),
      );
      const severity = toSeverity(priorityIndex);

      return {
        id: `waste-${entry.city.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        city: entry.city,
        landfillName: entry.landfillName,
        landfillLatitude: entry.latitude,
        landfillLongitude: entry.longitude,
        dominantWasteType: entry.dominantWasteType,
        totalWasteTonsPerDay: entry.totalWasteTonsPerDay,
        averageRecyclingRate: entry.averageRecyclingRate,
        averageEfficiencyScore: entry.averageEfficiencyScore,
        priorityIndex,
        severity,
        summary: `${numberFormatter.format(entry.totalWasteTonsPerDay)} tons/day of municipal waste in ${latestYear}, with ${Math.round(entry.averageRecyclingRate)}% recycling and an efficiency score of ${entry.averageEfficiencyScore.toFixed(1)}/10. Location is mapped to the corrected ${entry.city} city centroid because the raw landfill coordinates in the source CSV are not geographically reliable.`,
      };
    })
    .sort((left, right) => right.priorityIndex - left.priorityIndex);

  const markers: MapMarker[] = hotspots.map((hotspot) => ({
    id: hotspot.id,
    source: "MUNICIPAL_DATASET",
    sourceLabel: "Municipal waste dataset",
    title: `${hotspot.city} waste pressure`,
    waterBodyName: `${hotspot.city} municipal zone`,
    category: hotspot.dominantWasteType,
    severity: hotspot.severity,
    status: null,
    observedAt: new Date(Date.UTC(latestYear, 11, 31)).toISOString(),
    latitude: hotspot.landfillLatitude,
    longitude: hotspot.landfillLongitude,
    summary: hotspot.summary,
    primaryImageUrl: null,
    isDevelopmentSeed: false,
    heatWeight: clamp(hotspot.priorityIndex / 100, 0.34, 1),
    metricLabel: `${numberFormatter.format(hotspot.totalWasteTonsPerDay)} tons/day`,
    href: null,
  }));

  return {
    latestYear,
    totalWasteTonsPerDay,
    hotspots,
    dominantWasteTypes,
    markers,
  };
});

async function readWaterQualityFeed(filename: string, label: string) {
  const rows = (await readDatasetCsv(filename)) as WaterQualityDatasetRow[];
  const latestRow = rows[rows.length - 1];
  const statusCounts = rows.reduce((accumulator, row) => {
    accumulator.set(row.Status, (accumulator.get(row.Status) ?? 0) + 1);
    return accumulator;
  }, new Map<string, number>());
  const wqiValues = rows.map((row) => parseNumeric(row.WQI)).filter(Number.isFinite);
  const poorCount =
    (statusCounts.get("Poor") ?? 0) + (statusCounts.get("Very Poor") ?? 0);
  const poorShare = poorCount / Math.max(rows.length, 1);
  const averageWqi = average(wqiValues);
  const worstWqi = Math.max(...wqiValues, 0);
  const priorityRaw = poorShare * 100 + averageWqi * 1.15 + worstWqi * 0.55;
  const topStatus =
    Array.from(statusCounts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ??
    latestRow.Status;

  return {
    id: `water-quality-${label.toLowerCase()}`,
    label,
    dateRangeLabel: `${rows[0]?.Date ?? "Unknown"} to ${latestRow?.Date ?? "Unknown"}`,
    latestObservedAt: latestRow?.Date ?? "",
    latestWqi: parseNumeric(latestRow?.WQI ?? "0"),
    latestStatus: latestRow?.Status ?? "Unknown",
    averageWqi,
    worstWqi,
    poorShare,
    priorityRaw,
    topStatus,
    sampleCount: rows.length,
  };
}

const readWaterQualityDataset = cache(async (): Promise<WaterQualityDatasetBundle> => {
  const feedsWithRaw = await Promise.all([
    readWaterQualityFeed("ganga.csv", "Ganga"),
    readWaterQualityFeed("sangam.csv", "Sangam"),
  ]);
  const highestPriorityRaw = Math.max(
    ...feedsWithRaw.map((feed) => feed.priorityRaw),
    1,
  );

  const feeds: WaterQualityFeedSummary[] = feedsWithRaw
    .map((feed) => {
      const priorityIndex = Math.round(
        clamp((feed.priorityRaw / highestPriorityRaw) * 100, 20, 100),
      );
      const severity = toSeverity(priorityIndex);

      return {
        id: feed.id,
        label: feed.label,
        dateRangeLabel: feed.dateRangeLabel,
        latestObservedAt: feed.latestObservedAt,
        latestWqi: feed.latestWqi,
        latestStatus: feed.latestStatus,
        averageWqi: feed.averageWqi,
        worstWqi: feed.worstWqi,
        poorShare: feed.poorShare,
        priorityIndex,
        severity,
        topStatus: feed.topStatus,
        sampleCount: feed.sampleCount,
      };
    })
    .sort((left, right) => right.priorityIndex - left.priorityIndex);

  return {
    feeds,
  };
});

export async function getDatasetSignals() {
  const [waste, waterQuality] = await Promise.all([
    readWasteDataset(),
    readWaterQualityDataset(),
  ]);

  return {
    waste,
    waterQuality,
  };
}
