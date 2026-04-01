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

export function getAppBaseUrl() {
  return process.env.NEXTAUTH_URL ?? "http://localhost:8080";
}

export function getN8nWebhookConfig() {
  return {
    highSeverity: process.env.N8N_HIGH_SEVERITY_WEBHOOK_URL ?? null,
    weeklyDigest: process.env.N8N_WEEKLY_DIGEST_WEBHOOK_URL ?? null,
    sharedSecret: process.env.N8N_SHARED_SECRET ?? null,
  };
}
