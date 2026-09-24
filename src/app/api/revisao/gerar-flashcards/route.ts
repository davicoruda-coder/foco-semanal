import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/* ------------------------------------------------------------------ */
/*  Config & Defaults                                                  */
/* ------------------------------------------------------------------ */

const DEFAULT_MODEL = "google/gemini-2.5-flash";
const DEFAULT_LIMIT = 15;
const MIN_TEXT_LENGTH = 50;
const MAX_TEXT_LENGTH = 8000;
const MAX_CARDS_PER_GENERATION = 30;

const DEPRECATED_MODEL_MAP: Record<string, string> = {
  "google/gemini-2.0-flash-001": "google/gemini-2.5-flash",
  "anthropic/claude-3.5-haiku": "google/gemini-2.5-flash",
  "anthropic/claude-3.5-haiku-20241022": "google/gemini-2.5-flash",
};

export function resolveAIModel(rawModel?: string | null): string {
  const trimmed = rawModel?.trim();
  if (!trimmed) return DEFAULT_MODEL;
  return DEPRECATED_MODEL_MAP[trimmed] || trimmed;
}

const SYSTEM_PROMPT = `Você é um gerador de flashcards para estudo de concursos públicos. Dado o texto abaixo, extraia os conceitos-chave e crie flashcards no formato pergunta/resposta.

REGRAS:
- Crie entre 5 e 30 flashcards dependendo da extensão do texto
- A "frente" deve ser uma pergunta clara e objetiva
- O "verso" deve ser a resposta concisa e correta
- Não invente informações que não estejam no texto
- Foque em definições, distinções, exceções e regras importantes
- Responda APENAS com JSON válido no formato: {"cards": [{"frente": "...", "verso": "..."}]}
- Sem markdown, sem explicações, sem texto fora do JSON`;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

interface AICard {
  frente: string;
  verso: string;
}

function parseAIResponse(raw: string): AICard[] | null {
  let cleaned = raw.trim();
  const jsonBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    cleaned = jsonBlockMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && Array.isArray(parsed.cards)) {
      const cards: AICard[] = [];
      for (const c of parsed.cards) {
        if (
          typeof c.frente === "string" &&
          typeof c.verso === "string" &&
          c.frente.trim().length > 0 &&
          c.verso.trim().length > 0
        ) {
          cards.push({
            frente: c.frente.trim().slice(0, 1000),
            verso: c.verso.trim().slice(0, 2000),
          });
        }
      }
      return cards.length > 0 ? cards.slice(0, MAX_CARDS_PER_GENERATION) : null;
    }
    return null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  POST /api/revisao/gerar-flashcards                                 */
/* ------------------------------------------------------------------ */

export async function POST(request: Request) {
  // 1. Auth
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }
  const userId = authData.user.id;

  // 2. Verifica se o usuário é Master
  const { data: isMaster } = await supabase.rpc("current_user_is_access_admin");

  // 3. Obtém configurações de IA (banco system_settings > fallback env)
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

  const envKey = process.env.OPENROUTER_API_KEY?.trim() || "";
  const envModel = process.env.OPENROUTER_MODEL?.trim() || "";

  const apiKey = (typeof dbConfig?.api_key === "string" ? dbConfig.api_key : "") || envKey;
  const rawModel = (typeof dbConfig?.model === "string" ? dbConfig.model : "") || envModel || DEFAULT_MODEL;
  const model = resolveAIModel(rawModel);
  const limitEnabled = typeof dbConfig?.limit_enabled === "boolean" ? dbConfig.limit_enabled : true;
  const dailyLimit = typeof dbConfig?.daily_limit === "number" ? dbConfig.daily_limit : DEFAULT_LIMIT;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "IA não configurada no sistema. O Administrador Master precisa configurar a chave do OpenRouter em Ajustes.",
      },
      { status: 503 },
    );
  }

  // 4. Parse body
  const body = (await request.json().catch(() => null)) as {
    texto?: unknown;
    disciplina?: unknown;
  } | null;

  const texto = typeof body?.texto === "string" ? body.texto.trim() : "";
  const disciplina = typeof body?.disciplina === "string" ? body.disciplina.trim() : "";

  if (!texto || texto.length < MIN_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `O texto precisa ter pelo menos ${MIN_TEXT_LENGTH} caracteres.` },
      { status: 400 },
    );
  }
  if (texto.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `O texto não pode ter mais de ${MAX_TEXT_LENGTH} caracteres.` },
      { status: 400 },
    );
  }
  if (!disciplina) {
    return NextResponse.json(
      { error: "Selecione uma matéria para os flashcards." },
      { status: 400 },
    );
  }

  // 5. Rate limiting (Master tem uso ilimitado; se limitEnabled for falso, todos têm uso ilimitado)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: generationsToday, error: countError } = await supabase
    .from("ai_generation_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", oneDayAgo);

  if (countError) {
    console.error("[revisao-ia] count generations:", countError.message);
    return NextResponse.json(
      { error: "Erro ao verificar limite de gerações." },
      { status: 500 },
    );
  }

  const userGenerations = generationsToday ?? 0;
  const isExempt = Boolean(isMaster) || !limitEnabled;

  if (!isExempt && userGenerations >= dailyLimit) {
    return NextResponse.json(
      {
        error: `Limite diário de ${dailyLimit} gerações atingido. O limite será renovado amanhã.`,
        limit_reached: true,
      },
      { status: 429 },
    );
  }

  // 6. Call OpenRouter
  let aiResponseText: string;
  let tokensUsed = 0;

  try {
    const orResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://focohub.app",
        "X-Title": "FocoHub - Flashcards",
      },
      body: JSON.stringify({
        model: model,
        temperature: 0.1,
        max_tokens: 4096,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: texto.slice(0, MAX_TEXT_LENGTH) },
        ],
      }),
    });

    if (!orResponse.ok) {
      const errBody = await orResponse.text().catch(() => "");
      console.error("[revisao-ia] OpenRouter error:", orResponse.status, errBody);
      let errorMsg = `Erro ao comunicar com a IA (${orResponse.status}). Verifique a chave e modelo em Ajustes.`;
      if (orResponse.status === 404) {
        errorMsg = `O modelo de IA "${model}" não foi encontrado no OpenRouter (404). Selecione outro modelo (ex: Gemini 2.5 Flash) em Ajustes.`;
      } else if (orResponse.status === 401) {
        errorMsg = `Chave de API do OpenRouter inválida ou expirada (401). Verifique a chave em Ajustes.`;
      } else if (orResponse.status === 402) {
        errorMsg = `Créditos insuficientes no OpenRouter (402). Recarregue seus créditos ou escolha outro provedor.`;
      }
      return NextResponse.json(
        { error: errorMsg },
        { status: 502 },
      );
    }

    const orData = await orResponse.json();
    aiResponseText = orData?.choices?.[0]?.message?.content ?? "";
    tokensUsed = orData?.usage?.total_tokens ?? 0;
  } catch (err) {
    console.error("[revisao-ia] fetch error:", err);
    return NextResponse.json(
      { error: "Falha de conexão com a IA. Verifique sua internet e tente novamente." },
      { status: 502 },
    );
  }

  // 7. Parse AI response
  const cards = parseAIResponse(aiResponseText);
  if (!cards || cards.length === 0) {
    console.warn("[revisao-ia] invalid AI response:", aiResponseText.slice(0, 500));
    return NextResponse.json(
      { error: "A IA não retornou flashcards válidos. Tente reformular o texto ou escolher outro modelo." },
      { status: 422 },
    );
  }

  // 8. Batch insert flashcards
  const rows = cards.map((c) => ({
    user_id: userId,
    frente: c.frente,
    verso: c.verso,
    origem: "ia" as const,
    disciplina,
  }));

  const { data: inserted, error: insertError } = await supabase
    .from("flashcards")
    .insert(rows)
    .select();

  if (insertError) {
    console.error("[revisao-ia] insert flashcards:", insertError.message);
    return NextResponse.json(
      { error: "Erro ao salvar os flashcards. Tente novamente." },
      { status: 500 },
    );
  }

  // 9. Log generation
  await supabase.from("ai_generation_log").insert({
    user_id: userId,
    tokens_used: tokensUsed,
    cards_generated: inserted?.length ?? cards.length,
  });

  // 10. Return
  const remaining = isExempt ? null : Math.max(0, dailyLimit - (userGenerations + 1));

  return NextResponse.json({
    ok: true,
    cards: inserted ?? [],
    count: inserted?.length ?? cards.length,
    remaining,
    limitEnabled: !isExempt,
    dailyLimit,
  });
}
