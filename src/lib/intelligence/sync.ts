import type { Prisma } from "@prisma/client";
import { dbOrThrow } from "@/lib/prisma";
import {
  buildSignalSummary,
  inferPublishedAt,
  inferPublisher,
  normalizeSourceUrl,
  searchFirecrawl,
  trimToLength,
} from "@/lib/intelligence/firecrawl";
import {
  getIntelligenceSourceConfigs,
  type IntelligenceSourceConfig,
} from "@/lib/intelligence/source-config";

const LOCATION_HINTS = [
  "india",
  "indian",
  "bengaluru",
  "bangalore",
  "mumbai",
  "delhi",
  "chennai",
  "kolkata",
  "hyderabad",
  "pune",
  "ahmedabad",
  "surat",
  "lucknow",
  "prayagraj",
  "varanasi",
  "patna",
  "kanpur",
  "ganga",
  "yamuna",
  "ulsoor",
  "bellandur",
  "hebbal",
];

const INDIA_CONTEXT_TERMS = [
  "india",
  "indian",
  "karnataka",
  "tamil nadu",
  "maharashtra",
  "delhi",
  "uttar pradesh",
  "bengaluru",
  "mumbai",
  "chennai",
  "kolkata",
  "hyderabad",
  "ganga",
  "yamuna",
  "kashmir",
  "kerala",
  "assam",
  "bihar",
];

const WATER_BODY_HINTS = [
  "lake",
  "river",
  "canal",
  "wetland",
  "beach",
  "pond",
  "reservoir",
  "estuary",
  "ganga",
  "yamuna",
];

const PRIORITY_RULES: Array<{ score: number; keywords: string[] }> = [
  {
    score: 28,
    keywords: [
      "dead fish",
      "fish kill",
      "toxic",
      "industrial discharge",
      "contamination",
      "foam",
      "untreated sewage",
    ],
  },
  {
    score: 20,
    keywords: [
      "sewage",
      "pollution",
      "dumping",
      "plastic waste",
      "garbage",
      "trash",
      "solid waste",
    ],
  },
  {
    score: 12,
    keywords: [
      "cleanup",
      "restoration",
      "rejuvenation",
      "volunteer",
      "wetland",
      "lake",
      "river",
      "water body",
    ],
  },
];

const GENERIC_EXCLUSION_TERMS = [
  "definition",
  "facts",
  "overview",
  "what is ",
  "explained",
  "explainer",
  "clean water act",
  "encyclopedia",
  "contact us",
];

export type IntelligenceSyncResult = {
  sourceCount: number;
  signalCount: number;
  creditsUsed: number;
  failures: Array<{ slug: string; error: string }>;
};

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function inferKeywordTags(value: string, baseTags: string[]) {
  const normalized = value.toLowerCase();
  const tags = new Set(baseTags);

  for (const location of LOCATION_HINTS) {
    if (normalized.includes(location)) {
      tags.add(location);
    }
  }

  for (const body of WATER_BODY_HINTS) {
    if (normalized.includes(body)) {
      tags.add(body);
    }
  }

  for (const rule of PRIORITY_RULES) {
    for (const keyword of rule.keywords) {
      if (normalized.includes(keyword)) {
        tags.add(keyword);
      }
    }
  }

  return Array.from(tags);
}

function inferLocationHint(value: string, focusLabel: string) {
  const normalized = value.toLowerCase();
  const match = LOCATION_HINTS.find((item) => normalized.includes(item));

  if (!match) {
    return focusLabel;
  }

  return match
    .split(" ")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function inferWaterBodyHint(value: string) {
  const normalized = value.toLowerCase();
  const match = WATER_BODY_HINTS.find((item) => normalized.includes(item));

  if (!match) {
    return null;
  }

  return match
    .split(" ")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function computePriorityScore(value: string, publishedAt: Date | null) {
  let score = 10;

  if (publishedAt) {
    const ageMs = Date.now() - publishedAt.getTime();
    const dayMs = 1000 * 60 * 60 * 24;

    if (ageMs <= dayMs * 2) {
      score += 32;
    } else if (ageMs <= dayMs * 7) {
      score += 22;
    } else if (ageMs <= dayMs * 30) {
      score += 12;
    }
  } else {
    score += 8;
  }

  const normalized = value.toLowerCase();

  for (const rule of PRIORITY_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      score += rule.score;
    }
  }

  return Math.min(100, score);
}

function isRelevantSignal(source: IntelligenceSourceConfig, value: string, sourceUrl: string) {
  const normalized = value.toLowerCase();
  const hasWaterBodyTerm = WATER_BODY_HINTS.some((term) => normalized.includes(term));
  const hasIssueTerm = PRIORITY_RULES.some((rule) =>
    rule.keywords.some((keyword) => normalized.includes(keyword)),
  );
  const hasIndiaContext = INDIA_CONTEXT_TERMS.some((term) => normalized.includes(term));
  const hasExcludedTerm = GENERIC_EXCLUSION_TERMS.some((term) =>
    normalized.includes(term),
  );
  const hasRequiredTerm = source.requiredTerms?.some((term) =>
    normalized.includes(term.toLowerCase()),
  );
  const hasSourceExcludedTerm = source.excludedTerms?.some((term) =>
    normalized.includes(term.toLowerCase()),
  );
  const isLikelyReferencePage =
    sourceUrl.includes("/topic/") || sourceUrl.includes("wikipedia.org");

  if (hasExcludedTerm || hasSourceExcludedTerm || isLikelyReferencePage) {
    return false;
  }

  if (!hasWaterBodyTerm && !hasIssueTerm) {
    return false;
  }

  if (source.requiredTerms && source.requiredTerms.length > 0 && !hasRequiredTerm) {
    return false;
  }

  if (source.type === "NEWS_QUERY" && !hasIndiaContext) {
    return false;
  }

  return true;
}

function buildSignalPayload(
  source: IntelligenceSourceConfig,
  item: Awaited<ReturnType<typeof searchFirecrawl>>["items"][number],
  creditsUsed: number | null,
) {
  const title = collapseWhitespace(item.title ?? "Untitled signal");
  const combinedText = collapseWhitespace(
    [title, item.description ?? "", item.snippet ?? "", item.markdown ?? ""].join(" "),
  );
  const publishedAt = inferPublishedAt(item);
  const sourceUrl = normalizeSourceUrl(item.url);
  const publisher = inferPublisher(item);
  const tags = inferKeywordTags(combinedText, source.tags);
  const locationHint = inferLocationHint(combinedText, source.focusLabel);
  const waterBodyHint = inferWaterBodyHint(combinedText);
  const summary = buildSignalSummary(item);
  const firecrawlPayload = JSON.parse(JSON.stringify(item)) as Prisma.JsonObject;
  const rawPayload = {
    creditsUsed,
    firecrawl: firecrawlPayload,
    syncedFrom: source.slug,
  } satisfies Prisma.JsonObject;

  return {
    title: trimToLength(title, 200),
    summary,
    sourceUrl,
    publisher,
    sourceDomain: new URL(sourceUrl).hostname.replace(/^www\./, ""),
    publishedAt,
    locationHint,
    waterBodyHint,
    imageUrl: item.imageUrl ?? null,
    priorityScore: computePriorityScore(combinedText, publishedAt),
    tags,
    rawPayload,
    contentMarkdown: item.markdown ? trimToLength(item.markdown, 5000) : null,
  };
}

async function syncOneSource(source: IntelligenceSourceConfig) {
  const db = dbOrThrow();
  const sourceRecord = await db.intelligenceSource.upsert({
    where: { slug: source.slug },
    update: {
      name: source.name,
      type: source.type,
      description: source.description,
      sourceUrl: source.sourceUrl,
      query: source.queries.join(" || "),
      focusLabel: source.focusLabel,
      isEnabled: true,
    },
    create: {
      slug: source.slug,
      name: source.name,
      type: source.type,
      description: source.description,
      sourceUrl: source.sourceUrl,
      query: source.queries.join(" || "),
      focusLabel: source.focusLabel,
      isEnabled: true,
    },
  });

  try {
    const acceptedUrls = new Set<string>();
    const collectedItems = new Map<
      string,
      {
        item: Awaited<ReturnType<typeof searchFirecrawl>>["items"][number];
      }
    >();
    let insertedCount = 0;
    let creditsUsed = 0;

    for (const query of source.queries) {
      const result = await searchFirecrawl(source, query);
      creditsUsed += result.creditsUsed ?? 0;

      for (const item of result.items) {
        const normalizedUrl = normalizeSourceUrl(item.url);

        if (!collectedItems.has(normalizedUrl)) {
          collectedItems.set(normalizedUrl, {
            item,
          });
        }
      }

      if (collectedItems.size >= source.maxItemsPerRun) {
        break;
      }
    }

    for (const { item } of Array.from(collectedItems.values()).slice(
      0,
      source.maxItemsPerRun,
    )) {
      const payload = buildSignalPayload(source, item, creditsUsed);

      if (
        !isRelevantSignal(
          source,
          [payload.title, payload.summary].join(" "),
          payload.sourceUrl,
        )
      ) {
        continue;
      }

      acceptedUrls.add(payload.sourceUrl);

      await db.intelligenceSignal.upsert({
        where: {
          sourceUrl: payload.sourceUrl,
        },
        update: {
          signalType: source.signalType,
          status: "ACTIVE",
          title: payload.title,
          summary: payload.summary,
          publisher: payload.publisher,
          sourceDomain: payload.sourceDomain,
          publishedAt: payload.publishedAt,
          locationHint: payload.locationHint,
          waterBodyHint: payload.waterBodyHint,
          imageUrl: payload.imageUrl,
          priorityScore: payload.priorityScore,
          tags: payload.tags,
          rawPayload: payload.rawPayload,
          contentMarkdown: payload.contentMarkdown,
        },
        create: {
          sourceId: sourceRecord.id,
          signalType: source.signalType,
          status: "ACTIVE",
          title: payload.title,
          summary: payload.summary,
          sourceUrl: payload.sourceUrl,
          publisher: payload.publisher,
          sourceDomain: payload.sourceDomain,
          publishedAt: payload.publishedAt,
          locationHint: payload.locationHint,
          waterBodyHint: payload.waterBodyHint,
          imageUrl: payload.imageUrl,
          priorityScore: payload.priorityScore,
          tags: payload.tags,
          rawPayload: payload.rawPayload,
          contentMarkdown: payload.contentMarkdown,
        },
      });

      insertedCount += 1;
    }

    await db.intelligenceSignal.updateMany({
      where: {
        sourceId: sourceRecord.id,
        sourceUrl: {
          notIn: Array.from(acceptedUrls),
        },
      },
      data: {
        status: "ARCHIVED",
      },
    });

    await db.intelligenceSource.update({
      where: { id: sourceRecord.id },
      data: {
        lastSyncedAt: new Date(),
        lastError: null,
      },
    });

    return {
      creditsUsed,
      insertedCount,
      error: null,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown sync error";

    await db.intelligenceSource.update({
      where: { id: sourceRecord.id },
      data: {
        lastError: detail,
      },
    });

    return {
      creditsUsed: 0,
      insertedCount: 0,
      error: detail,
    };
  }
}

export async function syncIntelligenceSources() {
  const configs = getIntelligenceSourceConfigs();
  const result: IntelligenceSyncResult = {
    sourceCount: configs.length,
    signalCount: 0,
    creditsUsed: 0,
    failures: [],
  };

  for (const source of configs) {
    const syncResult = await syncOneSource(source);
    result.signalCount += syncResult.insertedCount;
    result.creditsUsed += syncResult.creditsUsed;

    if (syncResult.error) {
      result.failures.push({
        slug: source.slug,
        error: syncResult.error,
      });
    }
  }

  return result;
}
