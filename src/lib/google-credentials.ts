import "server-only";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

type GoogleCredentialJson = {
  web?: {
    client_id?: string;
    client_secret?: string;
  };
};

let cachedCredentials:
  | {
      clientId: string;
      clientSecret: string;
    }
  | null
  | undefined;

export function getGoogleClientCredentials() {
  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
    return {
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    };
  }

  if (cachedCredentials !== undefined) {
    return cachedCredentials;
  }

  const candidate = readdirSync(/* turbopackIgnore: true */ process.cwd()).find(
    (file) => file.startsWith("client_secret_") && file.endsWith(".json"),
  );

  if (!candidate) {
    cachedCredentials = null;
    return null;
  }

  try {
    const parsed = JSON.parse(
      readFileSync(
        path.join(/* turbopackIgnore: true */ process.cwd(), candidate),
        "utf8",
      ),
    ) as GoogleCredentialJson;

    if (parsed.web?.client_id && parsed.web?.client_secret) {
      cachedCredentials = {
        clientId: parsed.web.client_id,
        clientSecret: parsed.web.client_secret,
      };
      return cachedCredentials;
    }
  } catch (error) {
    console.error("Failed to read local Google credential JSON", error);
  }

  cachedCredentials = null;
  return null;
}

export function hasGoogleAuthConfig() {
  return Boolean(getGoogleClientCredentials());
}
