import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getEffectiveAIConfig,
  testAIConnection,
} from "@/lib/ai/client";
import {
  AI_PROVIDERS,
  detectProvider,
  getDefaultModelForProvider,
  resolveAIModel,
} from "@/lib/ai/providers";
import type { AIProviderId } from "@/lib/ai/types";

/* ------------------------------------------------------------------ */
/*  GET: Carrega configurações da IA (apenas Master)                   */
/* ------------------------------------------------------------------ */

export async function GET() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  // Verifica se é Administrador Master
  const { data: isAdmin, error: roleError } = await supabase.rpc(
    "current_user_is_access_admin",
  );

  if (roleError || !isAdmin) {
    return NextResponse.json(
      { error: "Acesso negado. Recurso exclusivo para Master." },
      { status: 403 },
    );
  }

  const effective = await getEffectiveAIConfig(supabase, true);

  return NextResponse.json({
    provider: effective.provider,
    apiKey: effective.apiKey,
    model: effective.model,
    limitEnabled: effective.limitEnabled,
    dailyLimit: effective.dailyLimit,
    customPrompt: effective.customPrompt,
    source: effective.source,
    isEnvConfigured: effective.source === "env",
  });
}

/* ------------------------------------------------------------------ */
/*  POST: Salva configurações ou testa conexão (apenas Master)         */
/* ------------------------------------------------------------------ */

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  // Verifica se é Administrador Master
  const { data: isAdmin, error: roleError } = await supabase.rpc(
    "current_user_is_access_admin",
  );

  if (roleError || !isAdmin) {
    return NextResponse.json(
      { error: "Acesso negado. Recurso exclusivo para Master." },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    provider?: unknown;
    apiKey?: unknown;
    model?: unknown;
    limitEnabled?: unknown;
    dailyLimit?: unknown;
    customPrompt?: unknown;
    testOnly?: unknown;
  } | null;

  const rawKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
  const rawProvider = typeof body?.provider === "string" ? body.provider.trim() : "";
  const rawModel = typeof body?.model === "string" ? body.model.trim() : "";
  const limitEnabled = typeof body?.limitEnabled === "boolean" ? body.limitEnabled : true;
  const dailyLimit =
    typeof body?.dailyLimit === "number"
      ? Math.max(1, Math.min(100, body.dailyLimit))
      : 15;
  const rawCustomPrompt =
    typeof body?.customPrompt === "string"
      ? body.customPrompt.trim().slice(0, 2000)
      : "";
  const isTest = Boolean(body?.testOnly);

  if (!rawKey) {
    return NextResponse.json(
      { error: "A chave de API é obrigatória." },
      { status: 400 },
    );
  }

  // Detecta / valida o provedor
  const provider = detectProvider(rawKey, rawModel, rawProvider) as AIProviderId;
  const finalModel = resolveAIModel(rawModel || getDefaultModelForProvider(provider), provider);

  // --- Modo de Teste de Conexão ---
  if (isTest) {
    const testResult = await testAIConnection(provider, rawKey, finalModel);
    if (!testResult.ok) {
      return NextResponse.json(
        { ok: false, error: testResult.error || "Falha ao validar credenciais com o provedor." },
        { status: 400 },
      );
    }
    return NextResponse.json({
      ok: true,
      message: testResult.message || `Conexão bem-sucedida com ${AI_PROVIDERS[provider]?.name || provider}!`,
      provider,
      model: finalModel,
    });
  }

  // --- Modo de Salvamento no Banco (system_settings) ---
  const settingsValue = {
    provider,
    api_key: rawKey,
    model: finalModel,
    limit_enabled: limitEnabled,
    daily_limit: dailyLimit,
    custom_prompt: rawCustomPrompt,
  };

  const { error: saveError } = await supabase.from("system_settings").upsert({
    key: "ai_config",
    value: settingsValue,
    updated_at: new Date().toISOString(),
  });

  if (saveError) {
    console.error("[admin/ai-settings] erro ao salvar:", saveError.message);
    return NextResponse.json(
      { error: `Erro ao salvar configurações no banco: ${saveError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Configurações de IA salvas com sucesso!",
    settings: {
      provider,
      apiKey: rawKey,
      model: finalModel,
      limitEnabled,
      dailyLimit,
      customPrompt: rawCustomPrompt,
    },
  });
}
