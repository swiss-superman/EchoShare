import { NextResponse } from "next/server";
import { getReportDetail } from "@/lib/data/queries";
import { getN8nWebhookConfig } from "@/lib/env";

function isAuthorized(request: Request) {
  const sharedSecret = getN8nWebhookConfig().sharedSecret;

  if (!sharedSecret) {
    return false;
  }

  return request.headers.get("x-internal-secret") === sharedSecret;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { reportId?: string };

  if (!body.reportId) {
    return NextResponse.json({ error: "reportId is required" }, { status: 400 });
  }

  const report = await getReportDetail(body.reportId);

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const latestAnalysis = report.aiAnalyses[0] ?? null;

  return NextResponse.json({
    report: {
      id: report.id,
      title: report.title,
      waterBodyName: report.waterBodyName,
      category: report.category,
      severity: report.userSeverity,
      status: report.status,
      observedAt: report.observedAt.toISOString(),
      location: {
        latitude: report.location.latitude,
        longitude: report.location.longitude,
        locality: report.location.locality,
        state: report.location.state,
      },
      aiSummary: latestAnalysis?.summary ?? null,
      actionRecommendation: latestAnalysis?.actionRecommendation ?? null,
    },
  });
}
