import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* ------------------------------------------------------------------ */
/*  Tipos e Defaults                                                   */
/* ------------------------------------------------------------------ */

export interface AISettingsPayload {
  apiKey: string;
  model: string;
  limitEnabled: boolean;
  dailyLimit: number;
}

const DEFAULT_MODEL = "google/gemini-2.5-flash";
const DEFAULT_LIMIT = 15;

const DEPRECATED_MODEL_MAP: Record<string, string> = {
  "google/gemini-2.0-flash-001": "google/gemini-2.5-flash",
  "anthropic/claude-3.5-haiku": "google/gemini-2.5-flash",
  "anthropic/claude-3.5-haiku-20241022": "google/gemini-2.5-flash",
};

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
    return NextResponse.json({ error: "Acesso negado. Recurso exclusivo para Master." }, { status: 403 });
  }

  // Busca do banco
  const { data: row, error: dbError } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "ai_config")
    .maybeSingle();

  if (dbError && dbError.code !== "PGRST116") {
    console.error("[admin/ai-settings] erro ao ler configurações:", dbError.message);
  }

  const dbConfig = (row?.value as Record<string, unknown>) || null;
  const envKey = process.env.OPENROUTER_API_KEY?.trim() || "";
  const envModel = process.env.OPENROUTER_MODEL?.trim() || "";

  const apiKey = (typeof dbConfig?.api_key === "string" ? dbConfig.api_key : "") || envKey;
  const rawModel = (typeof dbConfig?.model === "string" ? dbConfig.model : "") || envModel || DEFAULT_MODEL;
  const model = DEPRECATED_MODEL_MAP[rawModel] || rawModel;
  const limitEnabled = typeof dbConfig?.limit_enabled === "boolean" ? dbConfig.limit_enabled : true;
  const dailyLimit = typeof dbConfig?.daily_limit === "number" ? dbConfig.daily_limit : DEFAULT_LIMIT;

  return NextResponse.json({
    apiKey,
    model,
    limitEnabled,
    dailyLimit,
    source: row?.value ? "database" : envKey ? "env" : "none",
    isEnvConfigured: Boolean(envKey),
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
    return NextResponse.json({ error: "Acesso negado. Recurso exclusivo para Master." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    apiKey?: unknown;
    model?: unknown;
    limitEnabled?: unknown;
    dailyLimit?: unknown;
    testOnly?: unknown;
  } | null;

  const rawKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
  const rawModel = typeof body?.model === "string" ? body.model.trim() : DEFAULT_MODEL;
  const limitEnabled = typeof body?.limitEnabled === "boolean" ? body.limitEnabled : true;
  const dailyLimit = typeof body?.dailyLimit === "number" ? Math.max(1, Math.min(100, body.dailyLimit)) : DEFAULT_LIMIT;
  const isTest = Boolean(body?.testOnly);

  if (!rawKey) {
    return NextResponse.json({ error: "A API Key do OpenRouter é obrigatória." }, { status: 400 });
  }

  // --- Modo de Teste de Conexão ---
  if (isTest) {
    try {
      const testRes = await fetch("https://openrouter.ai/api/v1/auth/key", {
        headers: {
          Authorization: `Bearer ${rawKey}`,
        },
      });

      if (!testRes.ok) {
        const errJson = await testRes.json().catch(() => null);
        const errMsg =
          (errJson as { error?: { message?: string } })?.error?.message ||
          `OpenRouter respondeu com status ${testRes.status}. Verifique se a chave é válida.`;
        return NextResponse.json({ ok: false, error: errMsg }, { status: 400 });
      }

      const keyInfo = await testRes.json().catch(() => ({}));
      const label = (keyInfo as { data?: { label?: string } })?.data?.label || "Chave identificada";

      // Validação de existência do modelo no catálogo do OpenRouter
      const modelToTest = DEPRECATED_MODEL_MAP[rawModel] || rawModel;
      let modelMsg = "";
      if (modelToTest) {
        try {
          const modelsRes = await fetch("https://openrouter.ai/api/v1/models");
          if (modelsRes.ok) {
            const modelsData = (await modelsRes.json()) as { data?: { id?: string }[] };
            const exists = Array.isArray(modelsData?.data) &&
              modelsData.data.some((m) => m.id === modelToTest);
            if (exists) {
              modelMsg = ` • Modelo "${modelToTest}" verificado com sucesso no OpenRouter.`;
            } else {
              return NextResponse.json({
                ok: false,
                error: `A chave é válida (${label}), mas o modelo "${modelToTest}" não existe no OpenRouter (404). Selecione outro modelo.`,
              });
            }
          }
        } catch {
          // ignora se falhar listagem
        }
      }

      return NextResponse.json({
        ok: true,
        message: `Conexão bem-sucedida com OpenRouter! (${label})${modelMsg}`,
      });
    } catch (err) {
      console.error("[admin/ai-settings] teste de conexão falhou:", err);
      return NextResponse.json(
        { ok: false, error: "Não foi possível conectar ao OpenRouter. Verifique sua conexão de rede." },
        { status: 502 },
      );
    }
  }

  const finalModel = DEPRECATED_MODEL_MAP[rawModel] || rawModel || DEFAULT_MODEL;

  // --- Modo de Salvamento no Banco (system_settings) ---
  const settingsValue = {
    api_key: rawKey,
    model: finalModel,
    limit_enabled: limitEnabled,
    daily_limit: dailyLimit,
  };

  const { error: saveError } = await supabase
    .from("system_settings")
    .upsert({
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
      apiKey: rawKey,
      model: rawModel || DEFAULT_MODEL,
      limitEnabled,
      dailyLimit,
    },
  });
}
