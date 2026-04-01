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

export function getGeminiModelConfig() {
  return {
    reportAnalysisModel: readStringEnv(process.env.GEMINI_REPORT_MODEL, "gemini-2.5-flash"),
    reviewModel: readStringEnv(process.env.GEMINI_REVIEW_MODEL, "gemini-2.5-pro"),
    embeddingModel: readStringEnv(
      process.env.GEMINI_EMBEDDING_MODEL,
      "gemini-embedding-001",
    ),
  };
}

export function getAppBaseUrl() {
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:8080";
}

export function getSupabaseStorageConfig() {
  return {
    url: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? null,
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
