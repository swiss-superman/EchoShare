export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function isGoogleAuthConfigured() {
  return Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
}

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
}

export function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? null;
}

function readStringEnv(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function readPositiveIntEnv(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return fallback;
}

const DEFAULT_GEMINI_REPORT_MODEL = "gemini-2.5-flash-lite";
const DEFAULT_GEMINI_IMAGE_TRIAGE_MODEL = "gemini-2.5-flash-lite";
const DEFAULT_GEMINI_REVIEW_MODEL = "gemini-2.5-pro";
const DEFAULT_GEMINI_EMBEDDING_MODEL = "gemini-embedding-001";
const DEFAULT_FIRECRAWL_BASE_URL = "https://api.firecrawl.dev/v2";
const DEFAULT_OLLAMA_LOCAL_BASE_URL = "http://localhost:11434";
const DEFAULT_OLLAMA_CLOUD_BASE_URL = "https://ollama.com";
const DEFAULT_SERPAPI_BASE_URL = "https://serpapi.com/search.json";
const DEFAULT_OLLAMA_MODEL = "gpt-oss:120b-cloud";

function isHostedRuntime() {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV || process.env.VERCEL_URL);
}

export function getGeminiModelConfig() {
  return {
    reportAnalysisModel: readStringEnv(
      process.env.GEMINI_REPORT_MODEL,
      DEFAULT_GEMINI_REPORT_MODEL,
    ),
    imageTriageModel: readStringEnv(
      process.env.GEMINI_IMAGE_TRIAGE_MODEL,
      DEFAULT_GEMINI_IMAGE_TRIAGE_MODEL,
    ),
    reviewModel: readStringEnv(process.env.GEMINI_REVIEW_MODEL, DEFAULT_GEMINI_REVIEW_MODEL),
    embeddingModel: readStringEnv(
      process.env.GEMINI_EMBEDDING_MODEL,
      DEFAULT_GEMINI_EMBEDDING_MODEL,
    ),
  };
}

export function getAppBaseUrl() {
  const nextAuthUrl = process.env.NEXTAUTH_URL?.trim();
  if (nextAuthUrl) {
    return nextAuthUrl;
  }

  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionUrl) {
    return `https://${productionUrl}`;
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  return "http://localhost:8080";
}

export function getSupabaseStorageConfig() {
  return {
    url: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    serviceRoleKey:
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.SUPABASE_PUBLISHABLE_KEY ??
      null,
    bucket: process.env.SUPABASE_STORAGE_BUCKET ?? "report-images",
  };
}

export function isSupabaseStorageConfigured() {
  const { url, serviceRoleKey } = getSupabaseStorageConfig();
  return Boolean(url && serviceRoleKey);
}

export function getN8nWebhookConfig() {
  return {
    reportCreated: process.env.N8N_REPORT_CREATED_WEBHOOK_URL ?? null,
    highSeverity: process.env.N8N_HIGH_SEVERITY_WEBHOOK_URL ?? null,
    weeklyDigest: process.env.N8N_WEEKLY_DIGEST_WEBHOOK_URL ?? null,
    sharedSecret: process.env.N8N_SHARED_SECRET ?? null,
  };
}

export function getOpenMapValidationConfig() {
  return {
    nominatimUrl: readStringEnv(
      process.env.NOMINATIM_BASE_URL,
      "https://nominatim.openstreetmap.org",
    ),
    overpassUrl: readStringEnv(
      process.env.OVERPASS_API_URL,
      "https://overpass-api.de/api/interpreter",
    ),
    contactEmail: process.env.NOMINATIM_EMAIL?.trim() || null,
  };
}

export function isFirecrawlConfigured() {
  return Boolean(process.env.FIRECRAWL_API_KEY?.trim());
}

export function getFirecrawlConfig() {
  return {
    apiKey: process.env.FIRECRAWL_API_KEY?.trim() || null,
    baseUrl: readStringEnv(process.env.FIRECRAWL_API_BASE_URL, DEFAULT_FIRECRAWL_BASE_URL),
    officialLimit: readPositiveIntEnv(process.env.FIRECRAWL_OFFICIAL_LIMIT, 1),
    newsLimit: readPositiveIntEnv(process.env.FIRECRAWL_NEWS_LIMIT, 3),
    maxAgeMs: readPositiveIntEnv(process.env.FIRECRAWL_MAX_AGE_MS, 1000 * 60 * 60 * 6),
    searchLocation: readStringEnv(process.env.FIRECRAWL_SEARCH_LOCATION, "India"),
  };
}

export function getOllamaConfig() {
  const apiKey = process.env.OLLAMA_API_KEY?.trim() || null;
  const explicitBaseUrl = process.env.OLLAMA_BASE_URL?.trim() || null;
  const baseUrl = explicitBaseUrl
    ? explicitBaseUrl
    : apiKey
      ? DEFAULT_OLLAMA_CLOUD_BASE_URL
      : isHostedRuntime()
        ? null
        : DEFAULT_OLLAMA_LOCAL_BASE_URL;

  return {
    apiKey,
    baseUrl,
    model: readStringEnv(process.env.OLLAMA_MODEL, DEFAULT_OLLAMA_MODEL),
  };
}

export function isOllamaConfigured() {
  const { baseUrl, model } = getOllamaConfig();
  return Boolean(baseUrl && model);
}

export function getSerpApiConfig() {
  return {
    apiKey: process.env.SERPAPI_API_KEY?.trim() || null,
    baseUrl: readStringEnv(process.env.SERPAPI_BASE_URL, DEFAULT_SERPAPI_BASE_URL),
    location: readStringEnv(process.env.SERPAPI_LOCATION, "India"),
    resultsLimit: readPositiveIntEnv(process.env.SERPAPI_RESULTS_LIMIT, 5),
  };
}

export function isSerpApiConfigured() {
  return Boolean(process.env.SERPAPI_API_KEY?.trim());
}

export function isLiveSearchConfigured() {
  return isSerpApiConfigured() || isFirecrawlConfigured();
}
