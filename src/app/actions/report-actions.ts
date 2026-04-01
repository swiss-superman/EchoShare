"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import {
  enqueueReportEnrichment,
  enrichReportById,
} from "@/lib/ai/gemini";
import {
  emitHighSeverityReportWebhook,
  emitReportCreatedWebhook,
} from "@/lib/automation/n8n";
import { isGeminiConfigured } from "@/lib/env";
import { dbOrThrow } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { saveReportImages } from "@/lib/upload";
import { slugify } from "@/lib/utils";
import { reportSchema } from "@/lib/validators";

function revalidateCorePaths() {
  revalidatePath("/");
  revalidatePath("/reports");
  revalidatePath("/map");
  revalidatePath("/dashboard");
  revalidatePath("/community");
}

async function runQueuedReportTasks(input: {
  reportId: string;
  reportUrl: string;
  title: string;
  waterBodyName: string;
  severity: string;
  category: string;
  analysisId: string | null;
}) {
  if (input.severity === "HIGH" || input.severity === "CRITICAL") {
    await emitHighSeverityReportWebhook({
      reportId: input.reportId,
      title: input.title,
      waterBodyName: input.waterBodyName,
      severity: input.severity,
      category: input.category,
      reportUrl: input.reportUrl,
    });
  }

  if (!input.analysisId) {
    return;
  }

  const handedToAutomation = await emitReportCreatedWebhook({
    reportId: input.reportId,
    analysisId: input.analysisId,
    title: input.title,
    waterBodyName: input.waterBodyName,
    severity: input.severity,
    category: input.category,
    reportUrl: input.reportUrl,
    aiRequested: true,
  });

  if (handedToAutomation) {
    return;
  }

  try {
    await enrichReportById(input.reportId, input.analysisId);
  } catch (error) {
    console.error("Report enrichment failed", error);
  }
}

export async function createReportAction(formData: FormData) {
  const user = await requireUser();
  const db = dbOrThrow();

  const parsed = reportSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid report payload.");
  }

  const uploads = await saveReportImages(
    formData.getAll("images").filter((value): value is File => value instanceof File),
  );

  const location = await db.location.create({
    data: {
      label: parsed.data.address || parsed.data.waterBodyName,
      address: parsed.data.address || null,
      locality: parsed.data.locality || null,
      district: parsed.data.district || null,
      state: parsed.data.state || null,
      country: parsed.data.country || "India",
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
    },
  });

  const waterBodySlug = slugify(parsed.data.waterBodyName);

  const waterBody = await db.waterBody.upsert({
    where: { slug: waterBodySlug },
    update: {
      state: parsed.data.state || undefined,
      city: parsed.data.locality || undefined,
      country: parsed.data.country || "India",
    },
    create: {
      name: parsed.data.waterBodyName,
      slug: waterBodySlug,
      type: "OTHER",
      city: parsed.data.locality || null,
      state: parsed.data.state || null,
      country: parsed.data.country || "India",
      locationId: location.id,
    },
  });

  const report = await db.report.create({
    data: {
      userId: user.id,
      waterBodyId: waterBody.id,
      locationId: location.id,
      title: parsed.data.title,
      description: parsed.data.description,
      waterBodyName: parsed.data.waterBodyName,
      category: parsed.data.category as never,
      userSeverity: parsed.data.userSeverity as never,
      observedAt: new Date(parsed.data.observedAt),
      aiRequestedAt: isGeminiConfigured() ? new Date() : null,
      images: {
        create: uploads,
      },
      statusHistory: {
        create: {
          toStatus: "NEW",
          note: "Citizen report submitted from the web reporting flow.",
          changedById: user.id,
        },
      },
    },
  });

  const analysisId = isGeminiConfigured() ? await enqueueReportEnrichment(report.id) : null;
  const reportUrl = `/reports/${report.id}`;

  after(async () => {
    await runQueuedReportTasks({
      reportId: report.id,
      reportUrl,
      title: report.title,
      waterBodyName: report.waterBodyName,
      severity: report.userSeverity,
      category: report.category,
      analysisId,
    });
  });

  revalidateCorePaths();
  redirect(reportUrl);
}

export async function runReportAiEnrichmentAction(reportId: string) {
  await requireUser();
  const analysisId = await enqueueReportEnrichment(reportId);

  after(async () => {
    try {
      await enrichReportById(reportId, analysisId);
    } catch (error) {
      console.error("Manual report enrichment failed", error);
    }
  });

  revalidateCorePaths();
  revalidatePath(`/reports/${reportId}`);
}
