/** Trim + validate public Supabase env (avoids trailing newlines from Vercel paste). */
export function getSupabaseEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  if (!url || !key) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  } catch {
    return null;
  }
  return { url, key };
}

export function isSupabaseConfigured() {
  return getSupabaseEnv() !== null;
}

/** Somente no servidor. Nunca use NEXT_PUBLIC_ nesta chave. */
export function getSupabaseServiceRoleKey(): string | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  return key || null;
}
