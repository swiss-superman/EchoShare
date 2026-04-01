import { createPartFromBase64, createUserContent, GoogleGenAI } from "@google/genai";
import { getGeminiApiKey, getGeminiModelConfig } from "@/lib/env";
import { dbOrThrow } from "@/lib/prisma";

const REPORT_EMBEDDING_DIMENSIONS = 768;
const DUPLICATE_SEARCH_WINDOW_DAYS = 30;
const DUPLICATE_COORDINATE_DELTA = 0.02;
const MAX_DUPLICATE_CANDIDATES = 5;
const DUPLICATE_SIMILARITY_THRESHOLD = 0.74;
const MAX_ANALYSIS_IMAGES = 2;

const REPORT_ANALYSIS_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "classification",
    "severityEstimate",
    "wasteTypes",
    "possibleDuplicateIds",
    "duplicateReasoning",
    "actionRecommendation",
    "evidenceSignals",
    "moderationNotes",
  ],
  properties: {
    summary: { type: "string" },
    classification: {
      type: "string",
      enum: [
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
      ],
    },
    severityEstimate: {
      type: "string",
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
    },
    wasteTypes: {
      type: "array",
      items: { type: "string" },
    },
    possibleDuplicateIds: {
      type: "array",
      items: { type: "string" },
    },
    duplicateReasoning: { type: "string" },
    actionRecommendation: { type: "string" },
    evidenceSignals: {
      type: "array",
      items: { type: "string" },
    },
    moderationNotes: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const;

type GeminiAnalysisPayload = {
  summary: string;
  classification: string;
  severityEstimate: string;
  wasteTypes: string[];
  possibleDuplicateIds: string[];
  duplicateReasoning: string;
  actionRecommendation: string;
  evidenceSignals: string[];
  moderationNotes: string[];
};

type VectorDuplicateCandidate = {
  reportId: string;
  similarity: number;
};

type DuplicatePromptCandidate = {
  id: string;
  title: string;
  description: string;
  waterBodyName: string;
  observedAt: string;
  vectorSimilarity: number | null;
};

type ReportImageForAnalysis = {
  id: string;
  publicUrl: string;
  mimeType: string;
  isPrimary: boolean;
  sizeBytes: number;
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

function toVectorLiteral(values: number[]) {
  return `[${values.map((value) => Number(value.toFixed(8))).join(",")}]`;
}

async function getImageBase64(publicUrl: string) {
  if (publicUrl.startsWith("/uploads/")) {
    const absolutePath = `${process.cwd()}\\public${publicUrl.replace(/\//g, "\\")}`;
    const fs = await import("node:fs/promises");
    const buffer = await fs.readFile(absolutePath);
    return buffer.toString("base64");
  }

  const response = await fetch(publicUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch image for AI analysis: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer).toString("base64");
}

function selectImagesForAnalysis(images: ReportImageForAnalysis[]) {
  return [...images]
    .sort((left, right) => {
      if (left.isPrimary !== right.isPrimary) {
        return left.isPrimary ? -1 : 1;
      }

      return left.sizeBytes - right.sizeBytes;
    })
    .slice(0, MAX_ANALYSIS_IMAGES);
}

function buildEmbeddingInput(report: {
  title: string;
  description: string;
  waterBodyName: string;
  category: string;
  userSeverity: string;
  location: {
    locality: string | null;
    state: string | null;
    country: string | null;
  };
}) {
  return [
    `Title: ${report.title}`,
    `Description: ${report.description}`,
    `Water body: ${report.waterBodyName}`,
    `Category: ${report.category}`,
    `User severity: ${report.userSeverity}`,
    `Locality: ${report.location.locality ?? "Unknown"}`,
    `State: ${report.location.state ?? "Unknown"}`,
    `Country: ${report.location.country ?? "Unknown"}`,
  ].join("\n");
}

async function generateReportEmbedding(input: string) {
  const { embeddingModel } = getGeminiModelConfig();
  const response = await getGeminiClient().models.embedContent({
    model: embeddingModel,
    contents: [input],
    config: {
      outputDimensionality: REPORT_EMBEDDING_DIMENSIONS,
    },
  });

  const embedding = response.embeddings?.[0]?.values;

  if (!embedding?.length) {
    throw new Error("Gemini did not return an embedding vector.");
  }

  return embedding;
}

async function upsertReportEmbedding(reportId: string, embedding: number[]) {
  const db = dbOrThrow();
  const { embeddingModel } = getGeminiModelConfig();

  await db.$executeRawUnsafe(
    `
      INSERT INTO report_embeddings ("reportId", "modelName", embedding, "createdAt", "updatedAt")
      VALUES ($1, $2, CAST($3 AS extensions.vector), NOW(), NOW())
      ON CONFLICT ("reportId")
      DO UPDATE SET
        "modelName" = EXCLUDED."modelName",
        embedding = EXCLUDED.embedding,
        "updatedAt" = NOW()
    `,
    reportId,
    embeddingModel,
    toVectorLiteral(embedding),
  );
}

async function findVectorDuplicateCandidates(input: {
  reportId: string;
  embedding: number[];
  latitude: number;
  longitude: number;
  observedAt: Date;
  limit?: number;
}) {
  const db = dbOrThrow();
  const since = new Date(
    input.observedAt.getTime() - DUPLICATE_SEARCH_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );

  const rows = await db.$queryRawUnsafe<Array<VectorDuplicateCandidate>>(
    `
      SELECT
        re."reportId" AS "reportId",
        1 - (re.embedding OPERATOR(extensions.<=>) CAST($1 AS extensions.vector)) AS similarity
      FROM report_embeddings re
      INNER JOIN "Report" r ON r.id = re."reportId"
      INNER JOIN "Location" l ON l.id = r."locationId"
      WHERE re."reportId" <> $2
        AND r."observedAt" >= $3
        AND l.latitude BETWEEN $4 AND $5
        AND l.longitude BETWEEN $6 AND $7
      ORDER BY re.embedding OPERATOR(extensions.<=>) CAST($1 AS extensions.vector)
      LIMIT $8
    `,
    toVectorLiteral(input.embedding),
    input.reportId,
    since,
    input.latitude - DUPLICATE_COORDINATE_DELTA,
    input.latitude + DUPLICATE_COORDINATE_DELTA,
    input.longitude - DUPLICATE_COORDINATE_DELTA,
    input.longitude + DUPLICATE_COORDINATE_DELTA,
    input.limit ?? MAX_DUPLICATE_CANDIDATES,
  );

  return rows.filter((row) => row.similarity >= DUPLICATE_SIMILARITY_THRESHOLD);
}

async function createPendingAnalysis(reportId: string) {
  const db = dbOrThrow();
  const { reportAnalysisModel } = getGeminiModelConfig();

  const analysis = await db.reportAIAnalysis.create({
    data: {
      reportId,
      status: "PENDING",
      modelName: reportAnalysisModel,
    },
  });

  await db.report.update({
    where: { id: reportId },
    data: {
      aiRequestedAt: new Date(),
      aiCompletedAt: null,
    },
  });

  return analysis.id;
}

export async function enqueueReportEnrichment(reportId: string) {
  const db = dbOrThrow();
  const existingPending = await db.reportAIAnalysis.findFirst({
    where: {
      reportId,
      status: "PENDING",
    },
    orderBy: { createdAt: "desc" },
  });

  if (existingPending) {
    return existingPending.id;
  }

  return createPendingAnalysis(reportId);
}

export async function enrichReportById(reportId: string, analysisId?: string) {
  const db = dbOrThrow();
  const { reportAnalysisModel } = getGeminiModelConfig();
  const report = await db.report.findUnique({
    where: { id: reportId },
    include: {
      location: true,
      images: true,
      aiAnalyses: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!report) {
    throw new Error("Report not found.");
  }

  const targetAnalysisId =
    analysisId ??
    report.aiAnalyses.find((item) => item.status === "PENDING")?.id ??
    (await createPendingAnalysis(report.id));

  try {
    const embedding = await generateReportEmbedding(buildEmbeddingInput(report));
    await upsertReportEmbedding(report.id, embedding);

    const nearbyCandidates = await db.report.findMany({
      where: {
        id: { not: report.id },
        observedAt: {
          gte: new Date(
            report.observedAt.getTime() - DUPLICATE_SEARCH_WINDOW_DAYS * 24 * 60 * 60 * 1000,
          ),
        },
        location: {
          is: {
            latitude: {
              gte: report.location.latitude - DUPLICATE_COORDINATE_DELTA,
              lte: report.location.latitude + DUPLICATE_COORDINATE_DELTA,
            },
            longitude: {
              gte: report.location.longitude - DUPLICATE_COORDINATE_DELTA,
              lte: report.location.longitude + DUPLICATE_COORDINATE_DELTA,
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
      take: MAX_DUPLICATE_CANDIDATES,
    });

    const vectorCandidates = await findVectorDuplicateCandidates({
      reportId: report.id,
      embedding,
      latitude: report.location.latitude,
      longitude: report.location.longitude,
      observedAt: report.observedAt,
    }).catch((error) => {
      console.error("Vector duplicate search failed", error);
      return [];
    });

    const duplicateCandidates = new Map<string, DuplicatePromptCandidate>();

    for (const candidate of nearbyCandidates) {
      duplicateCandidates.set(candidate.id, {
        id: candidate.id,
        title: candidate.title,
        description: candidate.description,
        waterBodyName: candidate.waterBodyName,
        observedAt: candidate.observedAt.toISOString(),
        vectorSimilarity: null,
      });
    }

    for (const candidate of vectorCandidates) {
      const existing = duplicateCandidates.get(candidate.reportId);

      if (existing) {
        existing.vectorSimilarity = candidate.similarity;
        continue;
      }

      const reportCandidate = await db.report.findUnique({
        where: { id: candidate.reportId },
        select: {
          id: true,
          title: true,
          description: true,
          waterBodyName: true,
          observedAt: true,
        },
      });

      if (!reportCandidate) {
        continue;
      }

      duplicateCandidates.set(candidate.reportId, {
        id: reportCandidate.id,
        title: reportCandidate.title,
        description: reportCandidate.description,
        waterBodyName: reportCandidate.waterBodyName,
        observedAt: reportCandidate.observedAt.toISOString(),
        vectorSimilarity: candidate.similarity,
      });
    }

    const orderedCandidates = [...duplicateCandidates.values()]
      .sort((left, right) => (right.vectorSimilarity ?? 0) - (left.vectorSimilarity ?? 0))
      .slice(0, MAX_DUPLICATE_CANDIDATES);

    const prompt = [
      "You are assisting a civic water-body pollution response platform.",
      "Analyze the following citizen report and return only JSON that matches the requested schema.",
      "Never overwrite user evidence. Treat duplicate similarity hints as advisory, not proof.",
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
      "Potential duplicate candidates:",
      JSON.stringify(orderedCandidates, null, 2),
      `Only up to ${MAX_ANALYSIS_IMAGES} representative image(s) are attached for multimodal analysis to control latency and cost.`,
      "Use evidenceSignals for the concrete reasons behind the classification and severity.",
      "Use moderationNotes for anything that needs human review, ambiguity, low confidence, or image-quality caveats.",
    ].join("\n\n");

    const parts: Array<ReturnType<typeof createPartFromBase64> | { text: string }> = [
      { text: prompt },
    ];

    for (const image of selectImagesForAnalysis(report.images)) {
      try {
        const base64 = await getImageBase64(image.publicUrl);
        parts.push(createPartFromBase64(base64, image.mimeType));
      } catch (error) {
        console.error(`Skipping image ${image.id} during Gemini enrichment`, error);
      }
    }

    const response = await getGeminiClient().models.generateContent({
      model: reportAnalysisModel,
      contents: createUserContent(parts),
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: REPORT_ANALYSIS_RESPONSE_SCHEMA,
        temperature: 0.2,
      },
    });

    const payload = parseJsonResponse(response.text ?? "{}");
    const possibleDuplicateIds = (payload.possibleDuplicateIds ?? []).filter((candidateId) =>
      orderedCandidates.some((candidate) => candidate.id === candidateId),
    );

    const analysis = await db.reportAIAnalysis.update({
      where: { id: targetAnalysisId },
      data: {
        status: "COMPLETED",
        modelName: reportAnalysisModel,
        summary: payload.summary ?? null,
        classification: normalizeCategory(payload.classification) as never,
        severityEstimate: normalizeSeverity(payload.severityEstimate) as never,
        wasteTypes: payload.wasteTypes ?? [],
        possibleDuplicateIds,
        duplicateReasoning: payload.duplicateReasoning ?? null,
        actionRecommendation: payload.actionRecommendation ?? null,
        explanation: {
          evidenceSignals: payload.evidenceSignals ?? [],
          duplicateCandidates: orderedCandidates,
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

    await db.notification.create({
      data: {
        userId: report.userId,
        type: "REPORT_AI_READY",
        title: "AI analysis ready",
        body: `AI-assisted enrichment is ready for "${report.title}".`,
        linkUrl: `/reports/${report.id}`,
      },
    });

    return analysis;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown enrichment error";

    await db.reportAIAnalysis.update({
      where: { id: targetAnalysisId },
      data: {
        status: "FAILED",
        rawResponse: {
          error: message,
        },
        moderationSuggestion: {
          notes: ["AI enrichment failed and should be retried or manually reviewed."],
        },
      },
    });

    await db.notification.create({
      data: {
        userId: report.userId,
        type: "SYSTEM",
        title: "AI analysis needs retry",
        body: `EchoShare could not finish AI enrichment for "${report.title}" yet.`,
        linkUrl: `/reports/${report.id}`,
      },
    });

    throw error;
  }
}
