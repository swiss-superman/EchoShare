import { createPartFromBase64, createUserContent, GoogleGenAI } from "@google/genai";
import { getGeminiApiKey } from "@/lib/env";
import { dbOrThrow } from "@/lib/prisma";

type GeminiAnalysisPayload = {
  summary?: string;
  classification?: string;
  severityEstimate?: string;
  wasteTypes?: string[];
  possibleDuplicateIds?: string[];
  duplicateReasoning?: string;
  actionRecommendation?: string;
  evidenceSignals?: string[];
  moderationNotes?: string[];
};

let cachedClient: GoogleGenAI | null = null;

function getGeminiClient() {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey });
  }

  return cachedClient;
}

function parseJsonResponse(text: string) {
  const normalized = text.trim().replace(/^```json\s*/i, "").replace(/```$/, "");
  return JSON.parse(normalized) as GeminiAnalysisPayload;
}

function normalizeCategory(value: string | undefined) {
  const allowed = new Set([
    "PLASTIC",
    "SOLID_WASTE",
    "SEWAGE",
    "CHEMICAL",
    "OIL_OR_FUEL",
    "CONSTRUCTION_DEBRIS",
    "FOAM",
    "DEAD_FISH",
    "INVASIVE_WEEDS",
    "MULTIPLE",
    "OTHER",
  ]);

  return value && allowed.has(value) ? value : null;
}

function normalizeSeverity(value: string | undefined) {
  const allowed = new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
  return value && allowed.has(value) ? value : null;
}

export async function enrichReportById(reportId: string) {
  const db = dbOrThrow();
  const report = await db.report.findUnique({
    where: { id: reportId },
    include: {
      location: true,
      images: true,
      aiAnalyses: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!report) {
    throw new Error("Report not found.");
  }

  const nearbyCandidates = await db.report.findMany({
    where: {
      id: { not: report.id },
      observedAt: {
        gte: new Date(report.observedAt.getTime() - 1000 * 60 * 60 * 24 * 30),
      },
      location: {
        is: {
          latitude: {
            gte: report.location.latitude - 0.015,
            lte: report.location.latitude + 0.015,
          },
          longitude: {
            gte: report.location.longitude - 0.015,
            lte: report.location.longitude + 0.015,
          },
        },
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      waterBodyName: true,
      observedAt: true,
    },
    take: 5,
  });

  const prompt = [
    "You are assisting a civic water-body pollution response platform.",
    "Analyze the following citizen report and return strict JSON.",
    "Do not invent facts beyond the evidence. Separate AI inference from user truth.",
    "Use this JSON shape only:",
    JSON.stringify(
      {
        summary: "string",
        classification: "PLASTIC|SOLID_WASTE|SEWAGE|CHEMICAL|OIL_OR_FUEL|CONSTRUCTION_DEBRIS|FOAM|DEAD_FISH|INVASIVE_WEEDS|MULTIPLE|OTHER",
        severityEstimate: "LOW|MEDIUM|HIGH|CRITICAL",
        wasteTypes: ["string"],
        possibleDuplicateIds: ["reportId"],
        duplicateReasoning: "string",
        actionRecommendation: "string",
        evidenceSignals: ["string"],
        moderationNotes: ["string"],
      },
      null,
      2,
    ),
    "Citizen report:",
    JSON.stringify(
      {
        id: report.id,
        title: report.title,
        description: report.description,
        waterBodyName: report.waterBodyName,
        category: report.category,
        userSeverity: report.userSeverity,
        observedAt: report.observedAt.toISOString(),
        location: {
          latitude: report.location.latitude,
          longitude: report.location.longitude,
          locality: report.location.locality,
          state: report.location.state,
        },
      },
      null,
      2,
    ),
    "Nearby reports for duplicate assistance:",
    JSON.stringify(
      nearbyCandidates.map((candidate) => ({
        id: candidate.id,
        title: candidate.title,
        description: candidate.description,
        waterBodyName: candidate.waterBodyName,
        observedAt: candidate.observedAt.toISOString(),
      })),
      null,
      2,
    ),
  ].join("\n\n");

  const parts: Array<ReturnType<typeof createPartFromBase64> | { text: string }> = [
    { text: prompt },
  ];

  for (const image of report.images.slice(0, 3)) {
    if (!image.publicUrl.startsWith("/uploads/")) {
      continue;
    }

    const absolutePath = `${process.cwd()}\\public${image.publicUrl.replace(/\//g, "\\")}`;
    const fs = await import("node:fs/promises");
    const buffer = await fs.readFile(absolutePath);
    parts.push(createPartFromBase64(buffer.toString("base64"), image.mimeType));
  }

  const response = await getGeminiClient().models.generateContent({
    model: "gemini-2.5-flash",
    contents: createUserContent(parts),
    config: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  });

  const payload = parseJsonResponse(response.text ?? "{}");

  const analysis = await db.reportAIAnalysis.create({
    data: {
      reportId: report.id,
      status: "COMPLETED",
      modelName: "gemini-2.5-flash",
      summary: payload.summary ?? null,
      classification: normalizeCategory(payload.classification) as never,
      severityEstimate: normalizeSeverity(payload.severityEstimate) as never,
      wasteTypes: payload.wasteTypes ?? [],
      possibleDuplicateIds: payload.possibleDuplicateIds ?? [],
      duplicateReasoning: payload.duplicateReasoning ?? null,
      actionRecommendation: payload.actionRecommendation ?? null,
      explanation: {
        evidenceSignals: payload.evidenceSignals ?? [],
      },
      moderationSuggestion: {
        notes: payload.moderationNotes ?? [],
      },
      rawResponse: payload,
    },
  });

  await db.report.update({
    where: { id: report.id },
    data: {
      aiRequestedAt: report.aiRequestedAt ?? new Date(),
      aiCompletedAt: new Date(),
    },
  });

  return analysis;
}
