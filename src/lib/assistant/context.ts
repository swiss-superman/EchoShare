import type { Prisma, ReportStatus } from "@prisma/client";
import { getAppBaseUrl } from "@/lib/env";
import { getDb } from "@/lib/prisma";
import type { AssistantSource } from "@/lib/assistant/types";

function trimText(value: string, maxLength: number) {
  const normalized = value.trim().replace(/\s+/g, " ");

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function formatLocation(locality: string | null | undefined, state: string | null | undefined) {
  const pieces = [locality, state].filter(Boolean);
  return pieces.length > 0 ? pieces.join(", ") : "Location not labeled";
}

export async function buildAssistantContext() {
  const db = getDb();
  const appBaseUrl = getAppBaseUrl();

  if (!db) {
    return {
      contextText:
        "EchoShare database is not connected right now. Use only general product knowledge and clearly say that live local database context is unavailable.",
      sources: [] as AssistantSource[],
    };
  }

  const visibleReportWhere: Prisma.ReportWhereInput = {
    status: {
      not: "REJECTED" satisfies ReportStatus,
    },
  };

  const [reports, hotspots, organizations, intelligenceSignals, cleanupEvents] =
    await db.$transaction([
      db.report.findMany({
        where: visibleReportWhere,
        orderBy: { observedAt: "desc" },
        take: 6,
        include: {
          location: true,
          aiAnalyses: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
      db.report.groupBy({
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
      }),
      db.organization.findMany({
        where: {
          isDevelopmentSeed: false,
        },
        orderBy: [{ verification: "desc" }, { name: "asc" }],
        take: 6,
      }),
      db.intelligenceSignal.findMany({
        where: {
          status: "ACTIVE",
        },
        include: {
          source: true,
        },
        orderBy: [{ priorityScore: "desc" }, { publishedAt: "desc" }],
        take: 6,
      }),
      db.cleanupEvent.findMany({
        where: {
          status: {
            in: ["PLANNED", "ACTIVE"],
          },
        },
        include: {
          waterBody: true,
          participants: true,
        },
        orderBy: { scheduledAt: "asc" },
        take: 4,
      }),
    ]);

  const sources: AssistantSource[] = [];

  const reportLines = reports.map((report) => {
    sources.push({
      title: report.title,
      url: `${appBaseUrl}/reports/${report.id}`,
      kind: "local-report",
      note: `${report.waterBodyName} · ${report.userSeverity} · ${report.status}`,
    });

    return `- ${report.title} | water body: ${report.waterBodyName} | severity: ${report.userSeverity} | status: ${report.status} | location: ${formatLocation(report.location.locality, report.location.state)} | summary: ${trimText(report.aiAnalyses[0]?.summary ?? report.description, 180)}`;
  });

  const hotspotLines = hotspots.map(
    (entry) => {
      const count =
        typeof entry._count === "object" && entry._count
          ? (entry._count._all ?? 0)
          : 0;

      return `- ${entry.waterBodyName}: ${count} visible report${count === 1 ? "" : "s"}`;
    },
  );

  const organizationLines = organizations.map((organization) => {
    if (organization.website) {
      sources.push({
        title: organization.name,
        url: organization.website,
        kind: "local-organization",
        note: `${organization.type} · ${organization.areaServed}`,
      });
    }

    const metadata =
      organization.tags && typeof organization.tags === "object" && !Array.isArray(organization.tags)
        ? (organization.tags as Record<string, unknown>)
        : {};
    const issueFocus = Array.isArray(metadata.issueFocus)
      ? metadata.issueFocus.filter((item): item is string => typeof item === "string")
      : [];
    const responseModes = Array.isArray(metadata.responseModes)
      ? metadata.responseModes.filter((item): item is string => typeof item === "string")
      : [];

    return `- ${organization.name} | type: ${organization.type} | area: ${organization.areaServed} | focus: ${trimText(issueFocus.join(", ") || "not tagged", 120)} | routes: ${trimText(responseModes.join(", ") || "direct contact", 100)}`;
  });

  const intelligenceLines = intelligenceSignals.map((signal) => {
    sources.push({
      title: signal.title,
      url: signal.sourceUrl,
      kind: "local-intelligence",
      note: `${signal.publisher} · priority ${signal.priorityScore}`,
    });

    return `- ${signal.title} | publisher: ${signal.publisher} | type: ${signal.signalType} | priority: ${signal.priorityScore} | hint: ${signal.locationHint ?? signal.waterBodyHint ?? "India"} | summary: ${trimText(signal.summary, 180)}`;
  });

  const cleanupLines = cleanupEvents.map(
    (event) =>
      `- ${event.title} | water body: ${event.waterBody.name} | scheduled: ${event.scheduledAt.toISOString()} | participants: ${event.participants.length} | status: ${event.status}`,
  );

  const contextText = [
    "EchoShare platform context for the assistant:",
    "",
    "Recent visible reports:",
    reportLines.length > 0 ? reportLines.join("\n") : "- No visible reports yet.",
    "",
    "Top report hotspots:",
    hotspotLines.length > 0 ? hotspotLines.join("\n") : "- No hotspot clustering yet.",
    "",
    "Available responder organizations:",
    organizationLines.length > 0
      ? organizationLines.join("\n")
      : "- No live directory entries available.",
    "",
    "External intelligence signals:",
    intelligenceLines.length > 0
      ? intelligenceLines.join("\n")
      : "- No external signals are active.",
    "",
    "Upcoming cleanup operations:",
    cleanupLines.length > 0 ? cleanupLines.join("\n") : "- No cleanup events are scheduled.",
  ].join("\n");

  return {
    contextText,
    sources: sources.slice(0, 12),
  };
}
