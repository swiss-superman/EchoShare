import { NextRequest, NextResponse } from "next/server";
import { dbOrThrow } from "@/lib/prisma";
import { getN8nWebhookConfig } from "@/lib/env";

function isAuthorized(request: Request) {
  const sharedSecret = getN8nWebhookConfig().sharedSecret;

  if (!sharedSecret) {
    return false;
  }

  return request.headers.get("x-internal-secret") === sharedSecret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const statusParam = request.nextUrl.searchParams.get("status");
  const status = statusParam === "FAILED" ? "FAILED" : "PENDING";
  const limitValue = Number(request.nextUrl.searchParams.get("limit") ?? "20");
  const limit = Number.isFinite(limitValue) ? Math.min(Math.max(limitValue, 1), 50) : 20;
  const db = dbOrThrow();

  const analyses = await db.reportAIAnalysis.findMany({
    where: { status },
    orderBy: { updatedAt: "asc" },
    take: limit,
    include: {
      report: {
        include: {
          location: true,
          images: true,
        },
      },
    },
  });

  return NextResponse.json({
    items: analyses.map((analysis) => ({
      analysisId: analysis.id,
      status: analysis.status,
      updatedAt: analysis.updatedAt.toISOString(),
      report: {
        id: analysis.report.id,
        title: analysis.report.title,
        waterBodyName: analysis.report.waterBodyName,
        category: analysis.report.category,
        severity: analysis.report.userSeverity,
        observedAt: analysis.report.observedAt.toISOString(),
        imageCount: analysis.report.images.length,
        latitude: analysis.report.location.latitude,
        longitude: analysis.report.location.longitude,
      },
    })),
  });
}
