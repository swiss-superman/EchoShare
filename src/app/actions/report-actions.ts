"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import {
  enqueueReportEnrichment,
  validateReportEvidenceUpload,
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
import { validateReportLocation } from "@/lib/validation/location";
import { reportSchema } from "@/lib/validators";
import type { ReportCreateActionState } from "@/components/reports/report-create-form-state";

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

  await emitReportCreatedWebhook({
    reportId: input.reportId,
    analysisId: input.analysisId,
    title: input.title,
    waterBodyName: input.waterBodyName,
    severity: input.severity,
    category: input.category,
    reportUrl: input.reportUrl,
    aiRequested: true,
  });
}

export async function createReportAction(
  _previousState: ReportCreateActionState,
  formData: FormData,
): Promise<ReportCreateActionState> {
  const user = await requireUser();
  const db = dbOrThrow();
  const parsed = reportSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    return {
      status: "error",
      message:
        flattened.formErrors[0] ??
        parsed.error.issues[0]?.message ??
        "Check the highlighted fields and try again.",
      fieldErrors: flattened.fieldErrors,
    };
  }

  let reportUrl: string;

  try {
    const locationValidation = await validateReportLocation({
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      waterBodyName: parsed.data.waterBodyName,
      locality: parsed.data.locality,
      state: parsed.data.state,
      country: parsed.data.country,
    });

    if (locationValidation.status === "rejected") {
      return {
        status: "error",
        message:
          locationValidation.message ??
          "The selected pin could not be validated against a nearby water body.",
      };
    }

    const uploadedFiles = formData
      .getAll("images")
      .filter((value): value is File => value instanceof File);

    const preflightEvidenceValidation = await validateReportEvidenceUpload({
      title: parsed.data.title,
      description: parsed.data.description,
      waterBodyName: parsed.data.waterBodyName,
      category: parsed.data.category,
      userSeverity: parsed.data.userSeverity,
      files: uploadedFiles,
    });

    if (preflightEvidenceValidation.status === "rejected") {
      return {
        status: "error",
        message: preflightEvidenceValidation.message,
      };
    }

    const uploads = await saveReportImages(
      uploadedFiles,
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
    reportUrl = `/reports/${report.id}`;

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
  } catch (error) {
    console.error("Failed to create report", error);

    return {
      status: "error",
      message:
        "Could not submit the report right now. Check the required fields or try again in a moment.",
    };
  }

  redirect(reportUrl);
}

export async function runReportAiEnrichmentAction(reportId: string) {
  await requireUser();
  await enqueueReportEnrichment(reportId);

  revalidateCorePaths();
  revalidatePath(`/reports/${reportId}`);
}
