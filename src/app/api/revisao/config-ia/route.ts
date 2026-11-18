import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveAIConfig } from "@/lib/ai/client";

export async function GET() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  const userId = authData.user.id;

  // Verifica se é Master
  const { data: isMaster } = await supabase.rpc("current_user_is_access_admin");

  const effective = await getEffectiveAIConfig(supabase, Boolean(isMaster));

  // Contagem de gerações nas últimas 24h
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: generationsToday } = await supabase
    .from("ai_generation_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", oneDayAgo);

  const count = generationsToday ?? 0;
  const remaining =
    isMaster || !effective.limitEnabled
      ? null
      : Math.max(0, effective.dailyLimit - count);

  return NextResponse.json({
    configured: effective.isConfigured,
    provider: effective.provider,
    isMaster: Boolean(isMaster),
    limitEnabled: effective.limitEnabled,
    dailyLimit: effective.dailyLimit,
    generationsToday: count,
    remaining,
    model: isMaster ? effective.model : undefined,
  });
}
