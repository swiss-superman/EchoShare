import type {
  CleanupEventStatus,
  PollutionCategory,
  PostType,
  Prisma,
  ReportStatus,
  SeverityLevel,
} from "@prisma/client";
import { getDatasetSignals } from "@/lib/data/datasets";
import type { MapMarker, PriorityBoardEntry } from "@/lib/data/signal-types";
import { getDb } from "@/lib/prisma";

type SearchParamValue = string | string[] | undefined;
type SearchParamsInput = Record<string, SearchParamValue>;

export type ReportFilters = {
  category?: string;
  severity?: string;
  status?: string;
  waterBodyId?: string;
  timeWindow?: string;
};

export type ReportCardData = {
  id: string;
  title: string;
  description: string;
  waterBodyName: string;
  category: PollutionCategory;
  severity: SeverityLevel;
  status: ReportStatus;
  observedAt: string;
  latitude: number;
  longitude: number;
  locality: string | null;
  state: string | null;
  primaryImageUrl: string | null;
  aiSummary: string | null;
  isDevelopmentSeed: boolean;
};

export type HomePagePostSnapshot = {
  id: string;
  title: string;
  excerpt: string;
  type: PostType;
  createdAt: string;
  commentCount: number;
  waterBodyName: string | null;
  authorName: string | null;
  isDevelopmentSeed: boolean;
};

export type HomePageCleanupSnapshot = {
  id: string;
  title: string;
  scheduledAt: string;
  waterBodyName: string;
  participantCount: number;
  status: CleanupEventStatus;
  isDevelopmentSeed: boolean;
};

const numberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

export function normalizeReportFilters(searchParams: SearchParamsInput): ReportFilters {
  const firstValue = (value: SearchParamValue) =>
    Array.isArray(value) ? value[0] : value;

  return {
    category: firstValue(searchParams.category) ?? undefined,
    severity: firstValue(searchParams.severity) ?? undefined,
    status: firstValue(searchParams.status) ?? undefined,
    waterBodyId: firstValue(searchParams.waterBodyId) ?? undefined,
    timeWindow: firstValue(searchParams.timeWindow) ?? "30d",
  };
}

function toObservedAfter(timeWindow: string | undefined) {
  if (!timeWindow || timeWindow === "all") {
    return undefined;
  }

  const now = Date.now();

  switch (timeWindow) {
    case "24h":
      return new Date(now - 1000 * 60 * 60 * 24);
    case "7d":
      return new Date(now - 1000 * 60 * 60 * 24 * 7);
    default:
      return new Date(now - 1000 * 60 * 60 * 24 * 30);
  }
}

function buildReportWhere(filters: ReportFilters): Prisma.ReportWhereInput {
  return {
    status: filters.status
      ? (filters.status as ReportStatus)
      : {
          not: "REJECTED" satisfies ReportStatus,
        },
    category: filters.category ? (filters.category as PollutionCategory) : undefined,
    userSeverity: filters.severity ? (filters.severity as SeverityLevel) : undefined,
    waterBodyId: filters.waterBodyId || undefined,
    observedAt: toObservedAfter(filters.timeWindow)
      ? { gte: toObservedAfter(filters.timeWindow) }
      : undefined,
  };
}

function toReportCard(
  report: Prisma.ReportGetPayload<{
    include: {
      location: true;
      images: true;
      aiAnalyses: {
        orderBy: { createdAt: "desc" };
        take: 1;
      };
    };
  }>,
): ReportCardData {
  return {
    id: report.id,
    title: report.title,
    description: report.description,
    waterBodyName: report.waterBodyName,
    category: report.category,
    severity: report.userSeverity,
    status: report.status,
    observedAt: report.observedAt.toISOString(),
    latitude: report.location.latitude,
    longitude: report.location.longitude,
    locality: report.location.locality,
    state: report.location.state,
    primaryImageUrl: report.images.find((image) => image.isPrimary)?.publicUrl ?? report.images[0]?.publicUrl ?? null,
    aiSummary: report.aiAnalyses[0]?.summary ?? null,
    isDevelopmentSeed: report.isDevelopmentSeed,
  };
}

function severityToHeatWeight(severity: SeverityLevel) {
  if (severity === "CRITICAL") {
    return 1;
  }

  if (severity === "HIGH") {
    return 0.8;
  }

  if (severity === "MEDIUM") {
    return 0.55;
  }

  return 0.3;
}

function buildReportMarkers(reports: ReportCardData[]): MapMarker[] {
  return reports.map((report) => ({
    id: report.id,
    source: "USER_REPORT",
    sourceLabel: "Citizen report",
    title: report.title,
    waterBodyName: report.waterBodyName,
    category: report.category,
    severity: report.severity,
    status: report.status,
    observedAt: report.observedAt,
    latitude: report.latitude,
    longitude: report.longitude,
    summary: report.aiSummary,
    primaryImageUrl: report.primaryImageUrl,
    isDevelopmentSeed: report.isDevelopmentSeed,
    heatWeight: severityToHeatWeight(report.severity),
    metricLabel: null,
    href: `/reports/${report.id}`,
  }));
}

function buildReportPriorityBoard(reports: ReportCardData[]): PriorityBoardEntry[] {
  const grouped = Array.from(
    reports.reduce((accumulator, report) => {
      const key = `${report.waterBodyName}::${report.locality ?? ""}`;
      const current =
        accumulator.get(key) ??
        {
          waterBodyName: report.waterBodyName,
          locationLabel: [report.locality, report.state].filter(Boolean).join(", "),
          reportCount: 0,
          severityWeight: 0,
        };

      current.reportCount += 1;
      current.severityWeight +=
        report.severity === "CRITICAL"
          ? 4
          : report.severity === "HIGH"
            ? 3
            : report.severity === "MEDIUM"
              ? 2
              : 1;

      accumulator.set(key, current);
      return accumulator;
    }, new Map<string, { waterBodyName: string; locationLabel: string; reportCount: number; severityWeight: number }>()),
  );

  if (grouped.length === 0) {
    return [];
  }

  const withRawScores = grouped.map(([key, entry]) => ({
    id: `report-hotspot-${key.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    ...entry,
    rawScore: entry.reportCount * 16 + entry.severityWeight * 12,
  }));
  const highestRawScore = Math.max(...withRawScores.map((entry) => entry.rawScore), 1);

  return withRawScores
    .map((entry) => {
      const priorityIndex = Math.max(
        14,
        Math.round((entry.rawScore / highestRawScore) * 100),
      );
      const severity: SeverityLevel =
        priorityIndex >= 80
          ? "CRITICAL"
          : priorityIndex >= 62
            ? "HIGH"
            : priorityIndex >= 40
              ? "MEDIUM"
              : "LOW";

      return {
        id: entry.id,
        source: "USER_REPORT" as const,
        sourceLabel: "Citizen reports",
        title: entry.waterBodyName,
        locationLabel: entry.locationLabel || "Community-submitted location",
        summary: `${entry.reportCount} field reports are clustering here, increasing the need for cleanup coordination or escalation.`,
        priorityIndex,
        metricLabel: `${numberFormatter.format(entry.reportCount)} reports`,
        severity,
        href: "/reports",
      };
    })
    .sort((left, right) => right.priorityIndex - left.priorityIndex);
}

export async function getHomePageData() {
  const db = getDb();

  if (!db) {
    return {
      metrics: {
        totalReports: 0,
        openReports: 0,
        resolvedReports: 0,
        organizations: 0,
        verifiedOrganizations: 0,
        upcomingEvents: 0,
        totalCleanupEvents: 0,
        participantCount: 0,
        publishedPosts: 0,
        completedAiAnalyses: 0,
        activeWaterBodies: 0,
      },
      recentReports: [] as ReportCardData[],
      topWaterBodies: [] as Array<{ name: string; reportCount: number }>,
      latestPost: null as HomePagePostSnapshot | null,
      nextCleanup: null as HomePageCleanupSnapshot | null,
    };
  }

  return db.$transaction(async (tx) => {
    const openReports = await tx.report.count({
      where: {
        status: {
          in: ["NEW", "UNDER_REVIEW", "VERIFIED", "ACTION_PLANNED", "CLEANUP_SCHEDULED"],
        },
      },
    });
    const resolvedReports = await tx.report.count({
      where: {
        status: {
          equals: "RESOLVED",
        },
      },
    });
    const visibleReportWhere: Prisma.ReportWhereInput = {
      status: {
        not: "REJECTED",
      },
    };
    const totalVisibleReports = await tx.report.count({
      where: visibleReportWhere,
    });
    const recentReports = await tx.report.findMany({
      where: visibleReportWhere,
      orderBy: { observedAt: "desc" },
      take: 4,
      include: {
        location: true,
        images: true,
        aiAnalyses: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });
    const grouped = await tx.report.groupBy({
      by: ["waterBodyName"],
      where: {
        status: {
          not: "REJECTED",
        },
      },
      _count: {
        _all: true,
      },
      orderBy: {
        _count: {
          waterBodyName: "desc",
        },
      },
      take: 4,
    });
    const organizations = await tx.organization.count();
    const verifiedOrganizations = await tx.organization.count({
      where: {
        verification: "VERIFIED",
      },
    });
    const upcomingEvents = await tx.cleanupEvent.count({
      where: {
        scheduledAt: {
          gte: new Date(),
        },
        status: {
          in: ["PLANNED", "ACTIVE"] satisfies CleanupEventStatus[],
        },
      },
    });
    const totalCleanupEvents = await tx.cleanupEvent.count();
    const participantCount = await tx.participant.count({
      where: {
        status: {
          in: ["GOING", "CHECKED_IN", "COMPLETED"],
        },
      },
    });
    const publishedPosts = await tx.post.count({
      where: {
        status: "PUBLISHED",
      },
    });
    const completedAiAnalyses = await tx.reportAIAnalysis.count({
      where: {
        status: "COMPLETED",
      },
    });
    const activeWaterBodies = await tx.report.findMany({
      where: visibleReportWhere,
      distinct: ["waterBodyName"],
      select: {
        waterBodyName: true,
      },
    });
    const nextCleanup = await tx.cleanupEvent.findFirst({
      where: {
        scheduledAt: {
          gte: new Date(),
        },
        status: {
          in: ["PLANNED", "ACTIVE"] satisfies CleanupEventStatus[],
        },
      },
      orderBy: { scheduledAt: "asc" },
      include: {
        participants: true,
        waterBody: true,
      },
    });
    const latestPost = await tx.post.findFirst({
      where: {
        status: "PUBLISHED",
      },
      orderBy: { createdAt: "desc" },
      include: {
        waterBody: true,
        author: {
          include: {
            profile: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    return {
      metrics: {
        totalReports: totalVisibleReports,
        openReports,
        resolvedReports,
        organizations,
        verifiedOrganizations,
        upcomingEvents,
        totalCleanupEvents,
        participantCount,
        publishedPosts,
        completedAiAnalyses,
        activeWaterBodies: activeWaterBodies.length,
      },
      recentReports: recentReports.map(toReportCard),
      topWaterBodies: grouped.map((entry) => ({
        name: entry.waterBodyName,
        reportCount: entry._count._all,
      })),
      latestPost: latestPost
        ? {
            id: latestPost.id,
            title: latestPost.title,
            excerpt: latestPost.body.slice(0, 220).trim(),
            type: latestPost.type,
            createdAt: latestPost.createdAt.toISOString(),
            commentCount: latestPost._count.comments,
            waterBodyName: latestPost.waterBody?.name ?? null,
            authorName:
              latestPost.author.profile?.displayName ??
              latestPost.author.name ??
              latestPost.author.email ??
              null,
            isDevelopmentSeed: latestPost.isDevelopmentSeed,
          }
        : null,
      nextCleanup: nextCleanup
        ? {
            id: nextCleanup.id,
            title: nextCleanup.title,
            scheduledAt: nextCleanup.scheduledAt.toISOString(),
            waterBodyName: nextCleanup.waterBody.name,
            participantCount: nextCleanup.participants.length,
            status: nextCleanup.status,
            isDevelopmentSeed: nextCleanup.isDevelopmentSeed,
          }
        : null,
    };
  });
}

export async function getReportListData(filters: ReportFilters) {
  const db = getDb();

  if (!db) {
    return {
      filters,
      reports: [] as ReportCardData[],
      waterBodies: [] as Array<{ id: string; name: string }>,
    };
  }

  const [reports, waterBodies] = await db.$transaction([
    db.report.findMany({
      where: buildReportWhere(filters),
      include: {
        location: true,
        images: true,
        aiAnalyses: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { observedAt: "desc" },
    }),
    db.waterBody.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return {
    filters,
    reports: reports.map(toReportCard),
    waterBodies,
  };
}

export async function getMapData(filters: ReportFilters) {
  const [data, datasets] = await Promise.all([
    getReportListData(filters),
    getDatasetSignals(),
  ]);
  const reportMarkers = buildReportMarkers(data.reports);
  const markers: MapMarker[] = [...reportMarkers, ...datasets.waste.markers];

  return {
    ...data,
    markers,
    reportMarkerCount: reportMarkers.length,
    datasetMarkerCount: datasets.waste.markers.length,
  };
}

export async function getSignalsPageData(filters: ReportFilters) {
  const [mapData, datasets] = await Promise.all([
    getMapData(filters),
    getDatasetSignals(),
  ]);

  const datasetBoard: PriorityBoardEntry[] = datasets.waste.hotspots
    .slice(0, 6)
    .map((hotspot) => ({
      id: hotspot.id,
      source: "MUNICIPAL_DATASET",
      sourceLabel: "Municipal waste dataset",
      title: hotspot.city,
      locationLabel: hotspot.landfillName,
      summary: hotspot.summary,
      priorityIndex: hotspot.priorityIndex,
      metricLabel: `${numberFormatter.format(hotspot.totalWasteTonsPerDay)} tons/day`,
      severity: hotspot.severity,
      href: null,
    }));

  const waterQualityBoard: PriorityBoardEntry[] = datasets.waterQuality.feeds.map((feed) => ({
    id: feed.id,
    source: "WATER_QUALITY_DATASET",
    sourceLabel: "Water-quality monitoring",
    title: feed.label,
    locationLabel: "Historical monitoring stream",
    summary: `${Math.round(feed.poorShare * 100)}% of the monitoring samples were Poor or Very Poor across the recorded period.`,
    priorityIndex: feed.priorityIndex,
    metricLabel: `${feed.latestStatus} · WQI ${feed.latestWqi.toFixed(1)}`,
    severity: feed.severity,
    href: null,
  }));

  const priorityBoard = [
    ...buildReportPriorityBoard(mapData.reports),
    ...datasetBoard,
    ...waterQualityBoard,
  ]
    .sort((left, right) => right.priorityIndex - left.priorityIndex)
    .slice(0, 10);

  return {
    ...mapData,
    priorityBoard,
    wasteDatasetYear: datasets.waste.latestYear,
    wasteDatasetTotal: datasets.waste.totalWasteTonsPerDay,
    dominantWasteTypes: datasets.waste.dominantWasteTypes,
    wasteHotspots: datasets.waste.hotspots,
    waterQualityFeeds: datasets.waterQuality.feeds,
  };
}

export async function getReportDetail(reportId: string) {
  const db = getDb();

  if (!db) {
    return null;
  }

  return db.report.findUnique({
    where: { id: reportId },
    include: {
      user: {
        include: {
          profile: true,
        },
      },
      waterBody: true,
      location: true,
      images: true,
      aiAnalyses: {
        orderBy: { createdAt: "desc" },
      },
      statusHistory: {
        include: {
          changedBy: {
            include: {
              profile: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      moderationRecords: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function getCommunityData() {
  const db = getDb();

  if (!db) {
    return {
      posts: [] as Array<
        Prisma.PostGetPayload<{
          include: {
            author: {
              include: {
                profile: true;
              };
            };
            waterBody: true;
            location: true;
            comments: {
              include: {
                author: {
                  include: {
                    profile: true;
                  };
                };
              };
            };
            cleanupEvent: {
              include: {
                participants: true;
              };
            };
          };
        }>
      >,
      waterBodies: [] as Array<{ id: string; name: string }>,
    };
  }

  const [posts, waterBodies] = await db.$transaction([
    db.post.findMany({
      include: {
        author: {
          include: {
            profile: true,
          },
        },
        waterBody: true,
        location: true,
        comments: {
          include: {
            author: {
              include: {
                profile: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        cleanupEvent: {
          include: {
            participants: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.waterBody.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return {
    posts,
    waterBodies,
  };
}

export async function getDirectoryData() {
  const db = getDb();

  if (!db) {
    return [];
  }

  return db.organization.findMany({
    include: {
      location: true,
      waterBody: true,
    },
    orderBy: [{ verification: "desc" }, { name: "asc" }],
  });
}

export async function getDashboardData() {
  const db = getDb();

  if (!db) {
    return {
      totalReports: 0,
      resolvedReports: 0,
      activeWaterBodies: 0,
      participantCount: 0,
      topWaterBodies: [] as Array<{ waterBodyName: string; count: number }>,
      recentReports: [] as ReportCardData[],
    };
  }

  return db.$transaction(async (tx) => {
    const visibleReportWhere: Prisma.ReportWhereInput = {
      status: {
        not: "REJECTED",
      },
    };
    const totalReports = await tx.report.count({ where: visibleReportWhere });
    const resolvedReports = await tx.report.count({
      where: {
        status: "RESOLVED",
      },
    });
    const activeWaterBodies = await tx.report.findMany({
      where: visibleReportWhere,
      distinct: ["waterBodyName"],
      select: {
        waterBodyName: true,
      },
    });
    const participantCount = await tx.participant.count({
      where: {
        status: {
          in: ["GOING", "CHECKED_IN", "COMPLETED"],
        },
      },
    });
    const topWaterBodies = await tx.report.groupBy({
      by: ["waterBodyName"],
      where: visibleReportWhere,
      _count: {
        _all: true,
      },
      orderBy: {
        _count: {
          waterBodyName: "desc",
        },
      },
      take: 5,
    });
    const recentReports = await tx.report.findMany({
      where: visibleReportWhere,
      orderBy: { observedAt: "desc" },
      take: 5,
      include: {
        location: true,
        images: true,
        aiAnalyses: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    return {
      totalReports,
      resolvedReports,
      activeWaterBodies: activeWaterBodies.length,
      participantCount,
      topWaterBodies: topWaterBodies.map((entry) => ({
        waterBodyName: entry.waterBodyName,
        count: entry._count._all,
      })),
      recentReports: recentReports.map(toReportCard),
    };
  });
}
