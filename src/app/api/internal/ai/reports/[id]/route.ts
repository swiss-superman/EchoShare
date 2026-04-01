import { NextResponse } from "next/server";
import { enrichReportById } from "@/lib/ai/gemini";
import { getN8nWebhookConfig } from "@/lib/env";

function isAuthorized(request: Request) {
  const sharedSecret = getN8nWebhookConfig().sharedSecret;

  if (!sharedSecret) {
    return false;
  }

  return request.headers.get("x-internal-secret") === sharedSecret;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { analysisId?: string };

  try {
    const analysis = await enrichReportById(id, body.analysisId);
    return NextResponse.json({ ok: true, analysisId: analysis.id });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown enrichment error",
      },
      { status: 500 },
    );
  }
}
