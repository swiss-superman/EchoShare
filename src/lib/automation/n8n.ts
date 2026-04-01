import { getAppBaseUrl, getN8nWebhookConfig } from "@/lib/env";

type HighSeverityPayload = {
  reportId: string;
  title: string;
  waterBodyName: string;
  severity: string;
  category: string;
  reportUrl: string;
};

async function postWebhook(url: string, payload: unknown) {
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
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
