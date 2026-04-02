import { z } from "zod";
import { getFirecrawlConfig, isFirecrawlConfigured } from "@/lib/env";
import type { IntelligenceSourceConfig } from "@/lib/intelligence/source-config";

const FirecrawlResultSchema = z.object({
  title: z.string().nullish(),
  url: z.string().url(),
  description: z.string().nullish(),
  snippet: z.string().nullish(),
  markdown: z.string().nullish(),
  imageUrl: z.string().url().nullish(),
  date: z.string().nullish(),
  metadata: z.record(z.string(), z.unknown()).nullish(),
});

const FirecrawlResponseSchema = z.object({
  success: z.boolean().optional(),
  creditsUsed: z.number().optional(),
  data: z.union([z.array(FirecrawlResultSchema), z.record(z.string(), z.array(FirecrawlResultSchema))]),
});

export type FirecrawlResult = z.infer<typeof FirecrawlResultSchema>;

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stripMarkdown(value: string) {
  return collapseWhitespace(
    value
      .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
      .replace(/\[[^\]]*]\(([^)]*)\)/g, "$1")
      .replace(/[`#>*_~-]/g, " "),
  );
}

export function trimToLength(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function normalizeResultGroups(
  data: z.infer<typeof FirecrawlResponseSchema>["data"],
): FirecrawlResult[] {
  if (Array.isArray(data)) {
    return data;
  }

  return Object.values(data).flat();
}

function getMetadataString(
  metadata: Record<string, unknown> | null | undefined,
  keys: string[],
) {
  if (!metadata) {
    return null;
  }

  for (const key of keys) {
    const value = metadata[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

export function normalizeSourceUrl(value: string) {
  const parsed = new URL(value);
  parsed.hash = "";

  const paramsToDrop = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "gclid",
    "fbclid",
  ];

  for (const param of paramsToDrop) {
    parsed.searchParams.delete(param);
  }

  return parsed.toString();
}

export function inferPublisher(result: FirecrawlResult) {
  const metadata = result.metadata ?? null;
  const siteName = getMetadataString(metadata, [
    "siteName",
    "site_name",
    "og:site_name",
  ]);

  if (siteName) {
    return siteName;
  }

  return new URL(result.url).hostname.replace(/^www\./, "");
}

export function inferPublishedAt(result: FirecrawlResult) {
  const metadata = result.metadata ?? null;
  const candidate = result.date ?? getMetadataString(metadata, [
    "publishedTime",
    "article:published_time",
    "pubdate",
    "date",
  ]);

  if (!candidate) {
    return null;
  }

  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function buildSignalSummary(result: FirecrawlResult) {
  const candidate = result.description ?? result.snippet;

  if (candidate && candidate.trim().length > 0) {
    return trimToLength(collapseWhitespace(candidate), 320);
  }

  if (result.markdown && result.markdown.trim().length > 0) {
    return trimToLength(stripMarkdown(result.markdown), 320);
  }

  return "No excerpt was available from the source page.";
}

export async function searchFirecrawl(
  source: IntelligenceSourceConfig,
  query = source.queries[0],
) {
  if (!isFirecrawlConfigured()) {
    throw new Error("FIRECRAWL_API_KEY is not configured.");
  }

  const config = getFirecrawlConfig();
  const response = await fetch(`${config.baseUrl}/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      limit: source.maxItemsPerRun,
      sources: source.searchSources,
      tbs: source.tbs,
      scrapeOptions: {
        formats: ["markdown"],
        onlyMainContent: true,
        maxAge: config.maxAgeMs,
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Firecrawl search failed (${response.status}): ${detail}`);
  }

  const json = FirecrawlResponseSchema.parse(await response.json());
  const items = normalizeResultGroups(json.data);
  const uniqueItems = Array.from(
    new Map(items.map((item) => [normalizeSourceUrl(item.url), item])).values(),
  );

  return {
    creditsUsed: json.creditsUsed ?? null,
    items: uniqueItems,
  };
}
