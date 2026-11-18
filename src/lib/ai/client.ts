import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AIChatOptions,
  AIChatResponse,
  AIProviderId,
} from "./types";
import {
  AI_PROVIDERS,
  detectProvider,
  getDefaultModelForProvider,
  resolveAIModel,
} from "./providers";

const DEFAULT_LIMIT = 15;

/**
 * Lê a configuração efetiva da IA a partir do banco (system_settings)
 * ou variáveis de ambiente de fallback.
 */
export async function getEffectiveAIConfig(
  supabase: SupabaseClient,
  isMaster = false,
): Promise<{
  provider: AIProviderId;
  apiKey: string;
  model: string;
  limitEnabled: boolean;
  dailyLimit: number;
  customPrompt: string;
  isConfigured: boolean;
  source: "database" | "env" | "none";
}> {
  let dbConfig: Record<string, unknown> | null = null;

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

  // Chaves de ambiente (caso configuradas)
  const envGoogle = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || "";
  const envOpenAI = process.env.OPENAI_API_KEY?.trim() || "";
  const envAnthropic = process.env.ANTHROPIC_API_KEY?.trim() || "";
  const envGroq = process.env.GROQ_API_KEY?.trim() || "";
  const envDeepseek = process.env.DEEPSEEK_API_KEY?.trim() || "";
  const envOpenRouter = process.env.OPENROUTER_API_KEY?.trim() || "";

  const dbKey = typeof dbConfig?.api_key === "string" ? dbConfig.api_key.trim() : "";
  const dbModel = typeof dbConfig?.model === "string" ? dbConfig.model.trim() : "";
  const dbProvider = typeof dbConfig?.provider === "string" ? dbConfig.provider.trim() : "";

  let apiKey = dbKey;
  let source: "database" | "env" | "none" = dbKey ? "database" : "none";

  if (!apiKey) {
    if (envGoogle) {
      apiKey = envGoogle;
      source = "env";
    } else if (envOpenRouter) {
      apiKey = envOpenRouter;
      source = "env";
    } else if (envGroq) {
      apiKey = envGroq;
      source = "env";
    } else if (envOpenAI) {
      apiKey = envOpenAI;
      source = "env";
    } else if (envDeepseek) {
      apiKey = envDeepseek;
      source = "env";
    } else if (envAnthropic) {
      apiKey = envAnthropic;
      source = "env";
    }
  }

  const provider = detectProvider(apiKey, dbModel, dbProvider);
  const rawModel = dbModel || getDefaultModelForProvider(provider);
  const model = resolveAIModel(rawModel, provider);

  const limitEnabled =
    typeof dbConfig?.limit_enabled === "boolean" ? dbConfig.limit_enabled : true;
  const dailyLimit =
    typeof dbConfig?.daily_limit === "number" ? dbConfig.daily_limit : DEFAULT_LIMIT;
  const customPrompt =
    typeof dbConfig?.custom_prompt === "string" ? dbConfig.custom_prompt : "";

  return {
    provider,
    apiKey,
    model,
    limitEnabled,
    dailyLimit,
    customPrompt,
    isConfigured: Boolean(apiKey),
    source,
  };
}

/**
 * Valida a cota diária do usuário
 */
export async function checkUserQuota(
  supabase: SupabaseClient,
  userId: string,
  dailyLimit: number,
  limitEnabled: boolean,
  isMaster: boolean,
): Promise<{ allowed: boolean; count: number; remaining: number | null }> {
  if (isMaster || !limitEnabled) {
    return { allowed: true, count: 0, remaining: null };
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("ai_generation_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", oneDayAgo);

  if (error) {
    console.warn("[ai-client] falha ao checar quota:", error.message);
    return { allowed: true, count: 0, remaining: dailyLimit };
  }

  const used = count ?? 0;
  const remaining = Math.max(0, dailyLimit - used);
  const allowed = used < dailyLimit;

  return { allowed, count: used, remaining };
}

/**
 * Registra o consumo de IA no log
 */
export async function recordAIUsage(
  supabase: SupabaseClient,
  userId: string,
  cardsGenerated = 1,
  tokensUsed = 0,
): Promise<void> {
  try {
    const admin = createAdminClient();
    const client = admin || supabase;
    await client.from("ai_generation_log").insert({
      user_id: userId,
      cards_generated: cardsGenerated,
      tokens_used: tokensUsed,
    });
  } catch (err) {
    console.warn("[ai-client] falha ao registrar ai_generation_log:", err);
  }
}

/**
 * Executa uma chamada universal de IA para qualquer provedor suportado
 */
export async function callAIUniversal(
  config: { provider: AIProviderId; apiKey: string; model: string },
  options: AIChatOptions,
): Promise<AIChatResponse> {
  const { provider, apiKey } = config;

  if (!apiKey) {
    throw new Error("Chave de API não informada para o provedor selecionado.");
  }

  // --- Caso Especial: Anthropic (Messages API nativa) ---
  if (provider === "anthropic") {
    return callAnthropicMessages(config, options);
  }

  // --- Demais Provedores: Padrão OpenAI-Compatible (Google, OpenAI, Groq, DeepSeek, OpenRouter) ---
  return callOpenAICompatible(config, options);
}

/**
 * Chamador para provedores compatíveis com a especificação OpenAI Chat Completions:
 * - Google Gemini (endpoint OpenAI oficial do Google AI Studio)
 * - OpenAI
 * - Groq
 * - DeepSeek
 * - OpenRouter
 */
async function callOpenAICompatible(
  config: { provider: AIProviderId; apiKey: string; model: string },
  options: AIChatOptions,
): Promise<AIChatResponse> {
  const { provider, apiKey, model } = config;

  let endpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  switch (provider) {
    case "google":
      endpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
      break;
    case "openai":
      endpoint = "https://api.openai.com/v1/chat/completions";
      break;
    case "groq":
      endpoint = "https://api.groq.com/openai/v1/chat/completions";
      break;
    case "deepseek":
      endpoint = "https://api.deepseek.com/chat/completions";
      break;
    case "openrouter":
      endpoint = "https://openrouter.ai/api/v1/chat/completions";
      headers["HTTP-Referer"] = "https://focohub.app";
      headers["X-Title"] = "FocoHub";
      break;
  }

  // Ajuste inteligente para Groq com imagem
  let finalModel = model;
  const hasImages = options.messages.some((m) =>
    Array.isArray(m.content) && m.content.some((part) => part.type === "image_url"),
  );

  if (provider === "groq" && hasImages && !finalModel.includes("vision")) {
    finalModel = "llama-3.2-11b-vision-preview";
  }

  const payload: Record<string, unknown> = {
    model: finalModel,
    messages: options.messages,
    temperature: typeof options.temperature === "number" ? options.temperature : 0.25,
    max_tokens: typeof options.maxTokens === "number" ? options.maxTokens : 2000,
  };

  if (options.responseFormat === "json_object") {
    payload.response_format = { type: "json_object" };
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(
      `Falha na requisição ao ${AI_PROVIDERS[provider]?.name || provider} (HTTP ${res.status}): ${errorBody.slice(0, 300)}`,
    );
  }

  const json = await res.json();
  const rawText = json?.choices?.[0]?.message?.content || "";
  const totalTokens = json?.usage?.total_tokens || 0;

  return {
    content: rawText,
    tokensUsed: totalTokens,
    modelUsed: finalModel,
    providerUsed: provider,
  };
}

/**
 * Chamador nativo para a API da Anthropic (Messages API)
 */
async function callAnthropicMessages(
  config: { provider: AIProviderId; apiKey: string; model: string },
  options: AIChatOptions,
): Promise<AIChatResponse> {
  const { apiKey, model } = config;

  let systemPrompt = "";
  const anthropicMessages: Array<{
    role: "user" | "assistant";
    content:
      | string
      | Array<
          | { type: "text"; text: string }
          | {
              type: "image";
              source: { type: "base64"; media_type: string; data: string };
            }
        >;
  }> = [];

  for (const m of options.messages) {
    if (m.role === "system") {
      const text = typeof m.content === "string" ? m.content : "";
      systemPrompt = systemPrompt ? `${systemPrompt}\n\n${text}` : text;
      continue;
    }

    if (typeof m.content === "string") {
      anthropicMessages.push({
        role: m.role,
        content: m.content,
      });
      continue;
    }

    // Processamento de blocos de texto e imagem
    const blocks: Array<
      | { type: "text"; text: string }
      | {
          type: "image";
          source: { type: "base64"; media_type: string; data: string };
        }
    > = [];

    for (const part of m.content) {
      if (part.type === "text" && part.text) {
        blocks.push({ type: "text", text: part.text });
      } else if (part.type === "image_url" && part.image_url?.url) {
        const url = part.image_url.url;
        if (url.startsWith("data:")) {
          const match = url.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            blocks.push({
              type: "image",
              source: {
                type: "base64",
                media_type: match[1] || "image/jpeg",
                data: match[2],
              },
            });
          }
        }
      }
    }

    anthropicMessages.push({
      role: m.role,
      content: blocks.length > 0 ? blocks : "...",
    });
  }

  const payload: Record<string, unknown> = {
    model: resolveAIModel(model, "anthropic"),
    max_tokens: typeof options.maxTokens === "number" ? options.maxTokens : 2000,
    temperature: typeof options.temperature === "number" ? options.temperature : 0.25,
    messages: anthropicMessages,
  };

  if (systemPrompt) {
    payload.system = systemPrompt;
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(
      `Falha na requisição à Anthropic (HTTP ${res.status}): ${errorBody.slice(0, 300)}`,
    );
  }

  const json = await res.json();
  const textContent =
    Array.isArray(json?.content) && json.content[0]?.type === "text"
      ? json.content[0].text
      : "";

  const totalTokens =
    (json?.usage?.input_tokens || 0) + (json?.usage?.output_tokens || 0);

  return {
    content: textContent,
    tokensUsed: totalTokens,
    modelUsed: model,
    providerUsed: "anthropic",
  };
}

/**
 * Testa a conexão com o provedor escolhido
 */
export async function testAIConnection(
  provider: AIProviderId,
  apiKey: string,
  model?: string,
): Promise<{ ok: boolean; message?: string; error?: string }> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    return { ok: false, error: "A chave de API não foi informada." };
  }

  const targetModel = model?.trim() || getDefaultModelForProvider(provider);

  try {
    switch (provider) {
      case "google": {
        // Testa endpoint OpenAI-compatible do Google AI Studio
        const res = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/openai/models",
          {
            headers: {
              Authorization: `Bearer ${cleanKey}`,
            },
          },
        );
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          return {
            ok: false,
            error: `Google AI Studio respondeu com erro (${res.status}): ${errText.slice(0, 200) || "Chave inválida"}`,
          };
        }
        return {
          ok: true,
          message: `Conexão bem-sucedida com o Google AI Studio! Modelo selecionado: ${targetModel}.`,
        };
      }

      case "openai": {
        const res = await fetch("https://api.openai.com/v1/models", {
          headers: {
            Authorization: `Bearer ${cleanKey}`,
          },
        });
        if (!res.ok) {
          return {
            ok: false,
            error: `OpenAI respondeu com status ${res.status}. Verifique se a chave está correta e tem permissão.`,
          };
        }
        return {
          ok: true,
          message: `Conexão bem-sucedida com a OpenAI! Modelo selecionado: ${targetModel}.`,
        };
      }

      case "anthropic": {
        // Envia um ping ultra leve de 5 tokens para validar a chave
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": cleanKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: resolveAIModel(targetModel, "anthropic"),
            max_tokens: 5,
            messages: [{ role: "user", content: "ping" }],
          }),
        });
        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          const msg =
            (errJson as { error?: { message?: string } })?.error?.message ||
            `Anthropic respondeu com status ${res.status}. Verifique sua chave de API.`;
          return { ok: false, error: msg };
        }
        return {
          ok: true,
          message: `Conexão bem-sucedida com a Anthropic (Claude)! Modelo selecionado: ${targetModel}.`,
        };
      }

      case "groq": {
        const res = await fetch("https://api.groq.com/openai/v1/models", {
          headers: {
            Authorization: `Bearer ${cleanKey}`,
          },
        });
        if (!res.ok) {
          return {
            ok: false,
            error: `Groq respondeu com status ${res.status}. Verifique sua chave de API.`,
          };
        }
        return {
          ok: true,
          message: `Conexão bem-sucedida com a Groq! Modelo selecionado: ${targetModel}.`,
        };
      }

      case "deepseek": {
        const res = await fetch("https://api.deepseek.com/models", {
          headers: {
            Authorization: `Bearer ${cleanKey}`,
          },
        });
        if (!res.ok) {
          return {
            ok: false,
            error: `DeepSeek respondeu com status ${res.status}. Verifique sua chave de API.`,
          };
        }
        return {
          ok: true,
          message: `Conexão bem-sucedida com a DeepSeek! Modelo selecionado: ${targetModel}.`,
        };
      }

      case "openrouter":
      default: {
        const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
          headers: {
            Authorization: `Bearer ${cleanKey}`,
          },
        });
        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          const msg =
            (errJson as { error?: { message?: string } })?.error?.message ||
            `OpenRouter respondeu com status ${res.status}. Verifique sua chave.`;
          return { ok: false, error: msg };
        }
        const keyInfo = await res.json().catch(() => ({}));
        const label =
          (keyInfo as { data?: { label?: string } })?.data?.label || "Chave identificada";
        return {
          ok: true,
          message: `Conexão bem-sucedida com o OpenRouter! (${label}) • Modelo: ${targetModel}.`,
        };
      }
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "falha de rede";
    return {
      ok: false,
      error: `Erro ao testar conexão com o servidor: ${errorMsg}`,
    };
  }
}
