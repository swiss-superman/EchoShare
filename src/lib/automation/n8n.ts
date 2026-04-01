import { getAppBaseUrl, getN8nWebhookConfig } from "@/lib/env";

type ReportCreatedPayload = {
  reportId: string;
  analysisId: string;
  title: string;
  waterBodyName: string;
  severity: string;
  category: string;
  reportUrl: string;
  aiRequested: boolean;
};

type HighSeverityPayload = {
  reportId: string;
  title: string;
  waterBodyName: string;
  severity: string;
  category: string;
  reportUrl: string;
};

async function postWebhook(url: string, payload: unknown) {
  const sharedSecret = getN8nWebhookConfig().sharedSecret;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(sharedSecret ? { "x-echoshare-secret": sharedSecret } : {}),
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    const suffix = details ? `: ${details.slice(0, 240)}` : "";
    throw new Error(`n8n webhook failed with ${response.status}${suffix}`);
  }
}

export async function emitReportCreatedWebhook(payload: ReportCreatedPayload) {
  const { reportCreated } = getN8nWebhookConfig();

  if (!reportCreated) {
    return false;
  }

  try {
    await postWebhook(reportCreated, {
      appBaseUrl: getAppBaseUrl(),
      ...payload,
    });
    return true;
  } catch (error) {
    console.error("Failed to notify n8n report-created webhook", error);
    return false;
  }
}

export async function emitHighSeverityReportWebhook(payload: HighSeverityPayload) {
  const { highSeverity } = getN8nWebhookConfig();

  if (!highSeverity) {
    return;
  }

  try {
    await postWebhook(highSeverity, payload);
  } catch (error) {
    console.error("Failed to notify n8n high-severity webhook", error);
  }
}

export function buildWeeklyDigestPayload(input: {
  totalReports: number;
  resolvedReports: number;
  participantCount: number;
  topWaterBodies: Array<{ waterBodyName: string; count: number }>;
}) {
  return {
    generatedAt: new Date().toISOString(),
    appBaseUrl: getAppBaseUrl(),
    ...input,
  };
}
