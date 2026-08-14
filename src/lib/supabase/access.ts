import type { SupabaseClient } from "@supabase/supabase-js";

function isMissingAccessMigration(error: { code?: string; message?: string } | null) {
  const text = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase();
  return (
    text.includes("pgrst202") ||
    text.includes("could not find the function") ||
    text.includes("is_email_allowed")
  );
}

export async function checkEmailAccess(
  supabase: SupabaseClient,
  email: string,
): Promise<{ allowed: boolean; configured: boolean }> {
  const { data, error } = await supabase.rpc("is_email_allowed", {
    p_email: email.trim().toLowerCase(),
  });
  if (error) {
    if (isMissingAccessMigration(error)) {
      return { allowed: false, configured: false };
    }
    throw error;
  }
  return { allowed: data === true, configured: true };
}

export async function checkCurrentUserAccess(
  supabase: SupabaseClient,
): Promise<{ allowed: boolean; configured: boolean }> {
  const { data, error } = await supabase.rpc("current_user_has_access");
  if (error) {
    const text = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
    if (
      text.includes("pgrst202") ||
      text.includes("could not find the function") ||
      text.includes("current_user_has_access")
    ) {
      // Compatibilidade entre o deploy do código e a execução da migração SQL.
      return { allowed: true, configured: false };
    }
    throw error;
  }
  return { allowed: data === true, configured: true };
}
