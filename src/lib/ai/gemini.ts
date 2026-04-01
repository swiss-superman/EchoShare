import { createPartFromBase64, createUserContent, GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { getGeminiApiKey, getGeminiModelConfig } from "@/lib/env";
import { dbOrThrow } from "@/lib/prisma";

const REPORT_EMBEDDING_DIMENSIONS = 768;
const DUPLICATE_SEARCH_WINDOW_DAYS = 30;
const DUPLICATE_COORDINATE_DELTA = 0.02;
const MAX_DUPLICATE_CANDIDATES = 5;
const DUPLICATE_SIMILARITY_THRESHOLD = 0.74;
const MAX_ANALYSIS_IMAGES = 2;
const SUPPORTED_VISION_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);

const pollutionCategories = [
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
] as const;

const severityLevels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

const imageSceneLabels = [
  "VALID_POLLUTION_EVIDENCE",
  "CLEANUP_ACTIVITY_EVIDENCE",
  "GENERAL_WATER_BODY_NO_VISIBLE_POLLUTION",
  "UNRELATED_PERSON",
  "WEAPON_OR_VIOLENCE",
  "SCREENSHOT_OR_MEME",
  "INDOOR_OR_UNRELATED_OBJECT",
  "LOW_QUALITY_OR_OBSCURED",
  "UNSUPPORTED_FORMAT",
  "FETCH_FAILED",
  "OTHER",
] as const;

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
      enum: [...pollutionCategories],
    },
    severityEstimate: {
      type: "string",
      enum: [...severityLevels],
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

const IMAGE_TRIAGE_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["isRelevant", "sceneLabel", "reason", "confidence"],
  properties: {
    isRelevant: { type: "boolean" },
    sceneLabel: { type: "string" },
    reason: { type: "string" },
    confidence: { type: "number" },
  },
} as const;

const reportAnalysisPayloadSchema = z.object({
  summary: z.string().min(1),
  classification: z.enum(pollutionCategories),
  severityEstimate: z.enum(severityLevels),
  wasteTypes: z.array(z.string()),
  possibleDuplicateIds: z.array(z.string()),
  duplicateReasoning: z.string(),
  actionRecommendation: z.string(),
  evidenceSignals: z.array(z.string()),
  moderationNotes: z.array(z.string()),
});

const imageTriageLoosePayloadSchema = z.object({
  isRelevant: z.boolean(),
  sceneLabel: z.string().min(1),
  reason: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

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

type TriagedReportImage = ReportImageForAnalysis & {
  isRelevant: boolean;
  sceneLabel: (typeof imageSceneLabels)[number];
  reason: string;
  confidence: number;
};

type ReportEvidenceContext = {
  id: string;
  title: string;
  description: string;
  waterBodyName: string;
  category: string;
  userSeverity: string;
};

type TriagedUploadFile = {
  name: string;
  mimeType: string;
  sizeBytes: number;
  isRelevant: boolean;
  sceneLabel: (typeof imageSceneLabels)[number];
  reason: string;
  confidence: number;
};

const HARD_REJECT_IMAGE_SCENES = new Set<
  (typeof imageSceneLabels)[number]
>([
  "UNRELATED_PERSON",
  "WEAPON_OR_VIOLENCE",
  "SCREENSHOT_OR_MEME",
  "INDOOR_OR_UNRELATED_OBJECT",
  "GENERAL_WATER_BODY_NO_VISIBLE_POLLUTION",
]);

function getEvidenceValidationUnavailableMessage(error?: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (
    message.includes("429") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("quota")
  ) {
    return "Image validation could not finish right now, so EchoShare did not save this report or photo. Try again in a moment or submit without images.";
  }

  return "Image validation is temporarily unavailable, so EchoShare did not save this report or photo. Please try again later or submit without images.";
}

function isGeminiCapacityError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /429|RESOURCE_EXHAUSTED|quota|rate limit|UNAVAILABLE|503/i.test(message);
}

function normalizeImageSceneLabel(
  rawSceneLabel: string,
  isRelevant: boolean,
  reason: string,
): (typeof imageSceneLabels)[number] {
  const normalized = rawSceneLabel.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");

  if (imageSceneLabels.includes(normalized as (typeof imageSceneLabels)[number])) {
    return normalized as (typeof imageSceneLabels)[number];
  }

  const hints = `${rawSceneLabel} ${reason}`.toLowerCase();

  if (/(weapon|violence|gun|rifle|blood|knife)/.test(hints)) {
    return "WEAPON_OR_VIOLENCE";
  }

  if (/(cleanup|clean-up|volunteer|removing trash|garbage collection)/.test(hints)) {
    return "CLEANUP_ACTIVITY_EVIDENCE";
  }

  if (/(screenshot|meme|text overlay|ui|interface|poster)/.test(hints)) {
    return "SCREENSHOT_OR_MEME";
  }

  if (/(unsupported format|unsupported file)/.test(hints)) {
    return "UNSUPPORTED_FORMAT";
  }

  if (/(fetch failed|could not fetch|download failed|storage fetch)/.test(hints)) {
    return "FETCH_FAILED";
  }

  if (/(blur|blurry|obscured|too dark|low quality|unclear)/.test(hints)) {
    return "LOW_QUALITY_OR_OBSCURED";
  }

  if (/(no visible pollution|clean water|clear water|scenic water)/.test(hints)) {
    return "GENERAL_WATER_BODY_NO_VISIBLE_POLLUTION";
  }

  if (/(selfie|portrait|person|man|woman|face)/.test(hints)) {
    return "UNRELATED_PERSON";
  }

  if (/(indoor|room|kitchen|office|bedroom|street scene|urban setting|object)/.test(hints)) {
    return "INDOOR_OR_UNRELATED_OBJECT";
  }

  return isRelevant ? "VALID_POLLUTION_EVIDENCE" : "OTHER";
}

function parseImageTriagePayload(text: string | undefined, label: string) {
  const payload = parseStructuredJson(
    text,
    imageTriageLoosePayloadSchema,
    label,
  );

  return {
    ...payload,
    sceneLabel: normalizeImageSceneLabel(
      payload.sceneLabel,
      payload.isRelevant,
      payload.reason,
    ),
  };
}

async function generateContentWithFallback(input: {
  primaryModel: string;
  fallbackModel: string;
  contents: ReturnType<typeof createUserContent>;
  config: {
    responseMimeType: "application/json";
    responseJsonSchema: object;
    temperature: number;
  };
  label: string;
}) {
  try {
    const response = await getGeminiClient().models.generateContent({
      model: input.primaryModel,
      contents: input.contents,
      config: input.config,
    });

    return {
      response,
      modelUsed: input.primaryModel,
    };
  } catch (error) {
    if (
      input.fallbackModel === input.primaryModel ||
      !isGeminiCapacityError(error)
    ) {
      throw error;
    }

    console.warn(
      `${input.label} fell back from ${input.primaryModel} to ${input.fallbackModel}.`,
      error,
    );

    const response = await getGeminiClient().models.generateContent({
      model: input.fallbackModel,
      contents: input.contents,
      config: input.config,
    });

    return {
      response,
      modelUsed: input.fallbackModel,
    };
  }
}

function isTechnicallyUnreviewedImage(input: {
  sceneLabel?: string;
  reason?: string;
  confidence?: number;
}) {
  return (
    input.sceneLabel === "FETCH_FAILED" ||
    ((input.sceneLabel ?? "OTHER") === "OTHER" && (input.confidence ?? 0) === 0) ||
    isGeminiCapacityError(input.reason ?? "")
  );
}

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

function parseStructuredJson<T extends z.ZodTypeAny>(
  text: string | undefined,
  schema: T,
  label: string,
) {
  const normalized = (text ?? "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/, "");

  let parsed: unknown;

  try {
    parsed = JSON.parse(normalized || "{}");
  } catch (error) {
    throw new Error(
      `${label} returned malformed JSON: ${
        error instanceof Error ? error.message : "Unknown parse error"
      }`,
    );
  }

  const result = schema.safeParse(parsed);

  if (!result.success) {
    throw new Error(
      `${label} returned invalid JSON schema: ${result.error.issues
        .map((issue) => issue.message)
        .join("; ")}`,
    );
  }

  return result.data;
}

function normalizeCategory(value: string | undefined) {
  const allowed = new Set(pollutionCategories);
  return value && allowed.has(value as (typeof pollutionCategories)[number]) ? value : null;
}

function normalizeSeverity(value: string | undefined) {
  const allowed = new Set(severityLevels);
  return value && allowed.has(value as (typeof severityLevels)[number]) ? value : null;
}

function toVectorLiteral(values: number[]) {
  return `[${values.map((value) => Number(value.toFixed(8))).join(",")}]`;
}

function isVisionMimeTypeSupported(mimeType: string) {
  return SUPPORTED_VISION_MIME_TYPES.has(mimeType.toLowerCase());
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

function buildImageTriagePrompt(report: ReportEvidenceContext) {
  return [
    "You are validating whether an uploaded image is relevant evidence for a civic water-pollution report.",
    "Return JSON only.",
    `sceneLabel must be exactly one of: ${imageSceneLabels.join(", ")}.`,
    "Relevant images show water pollution evidence, litter near a water body, contaminated water, shoreline waste, sewage discharge, chemical or oil pollution, foam, invasive weeds, dead fish, or cleanup activity clearly tied to a polluted water body.",
    "Irrelevant images include selfies, portraits, weapons, unrelated people, memes, screenshots, random indoor scenes, or objects unrelated to a water body pollution incident.",
    "Mark isRelevant=false when the image does not provide trustworthy evidence for this report.",
    "Citizen report context:",
    JSON.stringify(
      {
        id: report.id,
        title: report.title,
        description: report.description,
        waterBodyName: report.waterBodyName,
        category: report.category,
        userSeverity: report.userSeverity,
      },
      null,
      2,
    ),
  ].join("\n\n");
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

async function triageReportImage(
  report: ReportEvidenceContext,
  image: ReportImageForAnalysis,
) {
  if (!isVisionMimeTypeSupported(image.mimeType)) {
    return {
      ...image,
      isRelevant: false,
      sceneLabel: "UNSUPPORTED_FORMAT" as const,
      reason: `The image format ${image.mimeType} is not used for Gemini vision analysis in EchoShare.`,
      confidence: 1,
    } satisfies TriagedReportImage;
  }

  let base64: string;

  try {
    base64 = await getImageBase64(image.publicUrl);
  } catch (error) {
    return {
      ...image,
      isRelevant: false,
      sceneLabel: "FETCH_FAILED" as const,
      reason:
        error instanceof Error
          ? error.message
          : "EchoShare could not fetch this image for AI triage.",
      confidence: 1,
    } satisfies TriagedReportImage;
  }

  const { imageTriageModel } = getGeminiModelConfig();
  const prompt = buildImageTriagePrompt(report);
  const { response } = await generateContentWithFallback({
    primaryModel: imageTriageModel,
    fallbackModel: "gemini-2.5-flash-lite",
    contents: createUserContent([
      { text: prompt },
      createPartFromBase64(base64, image.mimeType),
    ]),
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: IMAGE_TRIAGE_RESPONSE_SCHEMA,
      temperature: 0.1,
    },
    label: "Gemini image triage",
  });

  const payload = parseImageTriagePayload(
    response.text,
    "Gemini image triage",
  );

  return {
    ...image,
    ...payload,
  } satisfies TriagedReportImage;
}

async function triageCandidateImages(
  report: ReportEvidenceContext,
  images: ReportImageForAnalysis[],
) {
  const candidates = selectImagesForAnalysis(images);
  const triagedImages: TriagedReportImage[] = [];

  for (const image of candidates) {
    try {
      triagedImages.push(await triageReportImage(report, image));
    } catch (error) {
      triagedImages.push({
        ...image,
        isRelevant: false,
        sceneLabel: "OTHER",
        reason:
          error instanceof Error
            ? error.message
            : "EchoShare could not classify whether this image was relevant.",
        confidence: 0,
      });
    }
  }

  return triagedImages;
}

async function triageUploadedFile(report: ReportEvidenceContext, file: File) {
  if (!isVisionMimeTypeSupported(file.type)) {
    return {
      name: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      isRelevant: false,
      sceneLabel: "UNSUPPORTED_FORMAT" as const,
      reason: `The uploaded image format ${file.type} is not supported for EchoShare evidence validation.`,
      confidence: 1,
    } satisfies TriagedUploadFile;
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const { imageTriageModel } = getGeminiModelConfig();
  const { response } = await generateContentWithFallback({
    primaryModel: imageTriageModel,
    fallbackModel: "gemini-2.5-flash-lite",
    contents: createUserContent([
      { text: buildImageTriagePrompt(report) },
      createPartFromBase64(base64, file.type),
    ]),
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: IMAGE_TRIAGE_RESPONSE_SCHEMA,
      temperature: 0.1,
    },
    label: "Gemini upload image triage",
  });

  const payload = parseImageTriagePayload(
    response.text,
    "Gemini upload image triage",
  );

  return {
    name: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    ...payload,
  } satisfies TriagedUploadFile;
}

export async function validateReportEvidenceUpload(input: {
  title: string;
  description: string;
  waterBodyName: string;
  category: string;
  userSeverity: string;
  files: File[];
}) {
  const files = input.files.filter((file) => file.size > 0).slice(0, MAX_ANALYSIS_IMAGES);

  if (files.length === 0) {
    return {
      status: "skipped" as const,
      triagedFiles: [] as TriagedUploadFile[],
      message: null,
    };
  }

  if (!getGeminiApiKey()) {
    return {
      status: "rejected" as const,
      triagedFiles: [] as TriagedUploadFile[],
      message: getEvidenceValidationUnavailableMessage(),
    };
  }

  try {
    const triagedFiles: TriagedUploadFile[] = [];

    for (const file of files) {
      triagedFiles.push(
        await triageUploadedFile(
          {
            id: "preflight-upload",
            title: input.title,
            description: input.description,
            waterBodyName: input.waterBodyName,
            category: input.category,
            userSeverity: input.userSeverity,
          },
          file,
        ),
      );
    }

    const allRejected = triagedFiles.every((file) => !file.isRelevant);
    const hardRejected = allRejected
      && triagedFiles.every(
        (file) => file.confidence >= 0.8 && HARD_REJECT_IMAGE_SCENES.has(file.sceneLabel),
      );

    if (hardRejected) {
      return {
        status: "rejected" as const,
        triagedFiles,
        message:
          "Uploaded photos do not appear to show real water-body pollution evidence. Remove selfies, people-only photos, weapons, memes, or unrelated scenes and upload actual waste or water-body evidence.",
      };
    }

    return {
      status: "accepted" as const,
      triagedFiles,
      message: null,
    };
  } catch (error) {
    console.error("Preflight upload evidence validation failed", error);
    return {
      status: "rejected" as const,
      triagedFiles: [] as TriagedUploadFile[],
      message: getEvidenceValidationUnavailableMessage(error),
    };
  }
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
  const { reportAnalysisModel, imageTriageModel } = getGeminiModelConfig();
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

    const triagedImages = await triageCandidateImages(
      {
        id: report.id,
        title: report.title,
        description: report.description,
        waterBodyName: report.waterBodyName,
        category: report.category,
        userSeverity: report.userSeverity,
      },
      report.images,
    );
    const relevantImages = triagedImages.filter((image) => image.isRelevant);
    const technicallyUnreviewedImages = triagedImages.filter((image) =>
      isTechnicallyUnreviewedImage(image),
    );

    if (relevantImages.length === 0 && technicallyUnreviewedImages.length > 0) {
      throw new Error(
        "EchoShare could not finish AI evidence review for the uploaded images. Retry enrichment when Gemini capacity is available.",
      );
    }

    const prompt = [
      "You are assisting a civic water-body pollution response platform.",
      "Analyze the following citizen report and return only JSON that matches the requested schema.",
      "Never overwrite user evidence. Treat duplicate similarity hints as advisory, not proof.",
      "Only use image evidence that EchoShare marked as relevant. Excluded images are not valid evidence.",
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
      "Image triage summary:",
      JSON.stringify(
        triagedImages.map((image) => ({
          imageId: image.id,
          isRelevant: image.isRelevant,
          sceneLabel: image.sceneLabel,
          reason: image.reason,
          confidence: image.confidence,
        })),
        null,
        2,
      ),
      relevantImages.length > 0
        ? `Use the ${relevantImages.length} attached relevant image(s) together with the text report.`
        : "No uploaded image passed relevance triage. Perform text-only analysis.",
      "Use evidenceSignals for the concrete reasons behind the classification and severity.",
      "Use moderationNotes for anything that needs human review, ambiguity, low confidence, mismatch between text and image, or excluded-image caveats.",
    ].join("\n\n");

    const parts: Array<ReturnType<typeof createPartFromBase64> | { text: string }> = [
      { text: prompt },
    ];

    for (const image of relevantImages) {
      try {
        const base64 = await getImageBase64(image.publicUrl);
        parts.push(createPartFromBase64(base64, image.mimeType));
      } catch (error) {
        console.error(`Skipping image ${image.id} during Gemini enrichment`, error);
      }
    }

    const { response, modelUsed } = await generateContentWithFallback({
      primaryModel: reportAnalysisModel,
      fallbackModel: "gemini-2.5-flash-lite",
      contents: createUserContent(parts),
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: REPORT_ANALYSIS_RESPONSE_SCHEMA,
        temperature: 0.2,
      },
      label: "Gemini report analysis",
    });

    const payload = parseStructuredJson(
      response.text,
      reportAnalysisPayloadSchema,
      "Gemini report analysis",
    );
    const possibleDuplicateIds = payload.possibleDuplicateIds.filter((candidateId) =>
      orderedCandidates.some((candidate) => candidate.id === candidateId),
    );

    const analysis = await db.reportAIAnalysis.update({
      where: { id: targetAnalysisId },
      data: {
        status: "COMPLETED",
        modelName: modelUsed,
        summary: payload.summary,
        classification: normalizeCategory(payload.classification) as never,
        severityEstimate: normalizeSeverity(payload.severityEstimate) as never,
        wasteTypes: payload.wasteTypes,
        possibleDuplicateIds,
        duplicateReasoning: payload.duplicateReasoning,
        actionRecommendation: payload.actionRecommendation,
        explanation: {
          evidenceSignals: payload.evidenceSignals,
          duplicateCandidates: orderedCandidates,
          aiInput: {
            modality: relevantImages.length > 0 ? "TEXT_AND_IMAGE" : "TEXT_ONLY",
            candidateImageCount: triagedImages.length,
            usedImageCount: relevantImages.length,
            usedImageIds: relevantImages.map((image) => image.id),
            excludedImages: triagedImages
              .filter((image) => !image.isRelevant)
              .map((image) => ({
                imageId: image.id,
                sceneLabel: image.sceneLabel,
                reason: image.reason,
                confidence: image.confidence,
                mimeType: image.mimeType,
              })),
            triageModel: imageTriageModel,
            analysisModel: modelUsed,
          },
        },
        moderationSuggestion: {
          notes: payload.moderationNotes,
        },
        rawResponse: {
          analysis: payload,
          imageTriage: triagedImages.map((image) => ({
            imageId: image.id,
            isRelevant: image.isRelevant,
            sceneLabel: image.sceneLabel,
            reason: image.reason,
            confidence: image.confidence,
          })),
        },
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
