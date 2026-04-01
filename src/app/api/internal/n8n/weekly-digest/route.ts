import { NextResponse } from "next/server";
import { buildWeeklyDigestPayload } from "@/lib/automation/n8n";
import { getDashboardData } from "@/lib/data/queries";
import { getN8nWebhookConfig } from "@/lib/env";

function isAuthorized(request: Request) {
  const sharedSecret = getN8nWebhookConfig().sharedSecret;

  if (!sharedSecret) {
    return false;
  }

  return request.headers.get("x-internal-secret") === sharedSecret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dashboard = await getDashboardData();

  return NextResponse.json(
    buildWeeklyDigestPayload({
      totalReports: dashboard.totalReports,
      resolvedReports: dashboard.resolvedReports,
      participantCount: dashboard.participantCount,
      topWaterBodies: dashboard.topWaterBodies,
    }),
  );
}
