import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv, getSupabaseServiceRoleKey } from "@/lib/env";

export function createAdminClient() {
  const env = getSupabaseEnv();
  const serviceRole = getSupabaseServiceRoleKey();
  if (!env || !serviceRole) return null;

  return createSupabaseClient(env.url, serviceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
