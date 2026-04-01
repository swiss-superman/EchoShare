import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseStorageConfig } from "@/lib/env";

let cachedSupabaseAdmin:
  | ReturnType<typeof createClient>
  | null
  | undefined;

export function getSupabaseAdminClient() {
  if (cachedSupabaseAdmin) {
    return cachedSupabaseAdmin;
  }

  const { url, serviceRoleKey } = getSupabaseStorageConfig();

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase admin credentials are not configured.");
  }

  cachedSupabaseAdmin = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedSupabaseAdmin;
}
