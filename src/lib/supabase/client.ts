import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/env";

let browserClient: ReturnType<typeof createClientInternal> | null = null;

function createClientInternal() {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error("Supabase não configurado");
  }
  return createBrowserClient(env.url, env.key);
}

export function createClient() {
  if (typeof window !== "undefined" && browserClient) {
    return browserClient;
  }
  const client = createClientInternal();
  if (typeof window !== "undefined") {
    browserClient = client;
  }
  return client;
}
