import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  const userId = authData.user.id;

  // Verifica se é Master
  const { data: isMaster } = await supabase.rpc("current_user_is_access_admin");

  // Busca configurações de IA
  let dbConfig: Record<string, unknown> | null = null;

  // Se for admin, pode ler diretamente via RLS; se for membro, tenta via admin client ou RPC
  if (isMaster) {
    const { data } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "ai_config")
      .maybeSingle();
    dbConfig = (data?.value as Record<string, unknown>) || null;
  } else {
    const admin = createAdminClient();
    if (admin) {
      const { data } = await admin
        .from("system_settings")
        .select("value")
        .eq("key", "ai_config")
        .maybeSingle();
      dbConfig = (data?.value as Record<string, unknown>) || null;
    } else {
      const { data } = await supabase.rpc("get_ai_config_for_user");
      dbConfig = (data as Record<string, unknown>) || null;
    }
  }

const DEFAULT_MODEL = "google/gemini-2.5-flash";

const DEPRECATED_MODEL_MAP: Record<string, string> = {
  "google/gemini-2.0-flash-001": "google/gemini-2.5-flash",
  "anthropic/claude-3.5-haiku": "google/gemini-2.5-flash",
  "anthropic/claude-3.5-haiku-20241022": "google/gemini-2.5-flash",
};

  const envKey = process.env.OPENROUTER_API_KEY?.trim() || "";
  const apiKey = (typeof dbConfig?.api_key === "string" ? dbConfig.api_key : "") || envKey;
  const isConfigured = Boolean(apiKey);

  const envModel = process.env.OPENROUTER_MODEL?.trim() || "";
  const rawModel = (typeof dbConfig?.model === "string" ? dbConfig.model : "") || envModel || DEFAULT_MODEL;
  const model = DEPRECATED_MODEL_MAP[rawModel] || rawModel;

  const limitEnabled = typeof dbConfig?.limit_enabled === "boolean" ? dbConfig.limit_enabled : true;
  const dailyLimit = typeof dbConfig?.daily_limit === "number" ? dbConfig.daily_limit : 15;

  // Contagem de gerações nas últimas 24h
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: generationsToday } = await supabase
    .from("ai_generation_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", oneDayAgo);

  const count = generationsToday ?? 0;
  const remaining = isMaster || !limitEnabled ? null : Math.max(0, dailyLimit - count);

  return NextResponse.json({
    configured: isConfigured,
    isMaster: Boolean(isMaster),
    limitEnabled: Boolean(limitEnabled),
    dailyLimit,
    generationsToday: count,
    remaining,
    model: isMaster ? model : undefined,
  });
}

