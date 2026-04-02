import {
  buildSignalSummary,
  inferPublishedAt,
  inferPublisher,
  normalizeSourceUrl,
} from "@/lib/intelligence/firecrawl";
import {
  getFirecrawlConfig,
  getSerpApiConfig,
  isFirecrawlConfigured,
} from "@/lib/env";
import type { AssistantSource } from "@/lib/assistant/types";

type SearchResult = {
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedAt: string | null;
};

type SearchResponse = {
  provider: "serpapi" | "firecrawl" | "none";
  results: SearchResult[];
  sources: AssistantSource[];
  warning: string | null;
};

function buildSerpApiUrl(query: string) {
  const config = getSerpApiConfig();
  const params = new URLSearchParams({
    api_key: config.apiKey ?? "",
    engine: "google",
    q: query,
    google_domain: "google.co.in",
    gl: "in",
    hl: "en",
    safe: "active",
    location: config.location,
    num: String(config.resultsLimit),
    no_cache: "false",
  });

  return `${config.baseUrl}?${params.toString()}`;
}

function toString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSerpApiResults(payload: Record<string, unknown>) {
  const combined: SearchResult[] = [];
  const newsResults = Array.isArray(payload.news_results)
    ? payload.news_results
    : [];
  const organicResults = Array.isArray(payload.organic_results)
    ? payload.organic_results
    : [];

  for (const entry of [...newsResults, ...organicResults]) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const record = entry as Record<string, unknown>;
    const title = toString(record.title);
    const url = toString(record.link);
    const snippet =
      toString(record.snippet) ||
      toString(record.source) ||
      toString(record.date);

    if (!title || !url) {
      continue;
    }

    combined.push({
      title,
      url,
      snippet,
      source: toString(record.source) || new URL(url).hostname,
      publishedAt: toString(record.date) || null,
    });
  }

  const seen = new Set<string>();

  return combined.filter((entry) => {
    if (seen.has(entry.url)) {
      return false;
    }

    seen.add(entry.url);
    return true;
  });
}

async function searchSerpApi(query: string) {
  const config = getSerpApiConfig();

  if (!config.apiKey) {
    return {
      results: [] as SearchResult[],
      sources: [] as AssistantSource[],
    };
  }

  const response = await fetch(buildSerpApiUrl(query), {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`SerpAPI request failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const results = normalizeSerpApiResults(payload).slice(0, config.resultsLimit);

  return {
    results,
    sources: results.map((result) => ({
      title: result.title,
      url: result.url,
      kind: "web-search" as const,
      note: `${result.source}${result.publishedAt ? ` · ${result.publishedAt}` : ""}`,
    })),
  };
}

async function searchFirecrawlFallback(query: string) {
  const config = getFirecrawlConfig();
  const response = await fetch(`${config.baseUrl}/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      query,
      limit: config.newsLimit + 1,
      sources: ["news", "web"],
      scrapeOptions: {
        formats: ["markdown"],
        onlyMainContent: true,
        maxAge: config.maxAgeMs,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Firecrawl search failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  const payload = (await response.json()) as {
    data?: Array<{
      title?: string | null;
      url?: string | null;
      description?: string | null;
      snippet?: string | null;
      markdown?: string | null;
      date?: string | null;
      metadata?: Record<string, unknown> | null;
    }>;
  };
  const items = Array.isArray(payload.data) ? payload.data : [];
  const normalized = Array.from(
    new Map(
      items
        .filter((item) => item.url && item.title)
        .map((item) => [
          normalizeSourceUrl(item.url as string),
          item,
        ]),
    ).values(),
  )
    .map((item) => {
      const url = normalizeSourceUrl(item.url as string);
      return {
        title: (item.title as string).trim(),
        url,
        snippet: buildSignalSummary({
          title: item.title ?? null,
          url,
          description: item.description ?? null,
          snippet: item.snippet ?? null,
          markdown: item.markdown ?? null,
          date: item.date ?? null,
          metadata: item.metadata ?? null,
          imageUrl: null,
        }),
        source: inferPublisher({
          title: item.title ?? null,
          url,
          description: item.description ?? null,
          snippet: item.snippet ?? null,
          markdown: item.markdown ?? null,
          date: item.date ?? null,
          metadata: item.metadata ?? null,
          imageUrl: null,
        }),
        publishedAt: inferPublishedAt({
          title: item.title ?? null,
          url,
          description: item.description ?? null,
          snippet: item.snippet ?? null,
          markdown: item.markdown ?? null,
          date: item.date ?? null,
          metadata: item.metadata ?? null,
          imageUrl: null,
        })?.toISOString() ?? null,
      };
    })
    .slice(0, config.newsLimit + 1);

  return {
    results: normalized,
    sources: normalized.map((result) => ({
      title: result.title,
      url: result.url,
      kind: "web-search" as const,
      note: `${result.source}${result.publishedAt ? ` · ${result.publishedAt}` : ""}`,
    })),
  };
}

export async function searchWeb(query: string): Promise<SearchResponse> {
  try {
    const serpApi = await searchSerpApi(query);

    if (serpApi.results.length > 0) {
      return {
        provider: "serpapi",
        results: serpApi.results,
        sources: serpApi.sources,
        warning: null,
      };
    }
  } catch (error) {
    if (isFirecrawlConfigured()) {
      const firecrawl = await searchFirecrawlFallback(query);

      return {
        provider: "firecrawl",
        results: firecrawl.results,
        sources: firecrawl.sources,
        warning: error instanceof Error ? error.message : "SerpAPI search failed.",
      };
    }

    throw error;
  }

  if (isFirecrawlConfigured()) {
    const firecrawl = await searchFirecrawlFallback(query);

    return {
      provider: "firecrawl",
      results: firecrawl.results,
      sources: firecrawl.sources,
      warning: null,
    };
  }

  return {
    provider: "none",
    results: [],
    sources: [],
    warning: null,
  };
}
