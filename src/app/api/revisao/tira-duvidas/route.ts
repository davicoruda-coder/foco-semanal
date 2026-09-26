import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveAIModel } from "../gerar-flashcards/route";

/* ------------------------------------------------------------------ */
/*  Config & Defaults                                                  */
/* ------------------------------------------------------------------ */

const DEFAULT_MODEL = "google/gemini-2.5-flash";
const DEFAULT_LIMIT = 15;
const MIN_TEXT_LENGTH = 10;
const MAX_TEXT_LENGTH = 12000;
/** Tamanho máximo de imagem base64: ~4MB (encoded). */
const MAX_IMAGE_SIZE = 4 * 1024 * 1024;

const SYSTEM_PROMPT = `Você é um professor-tutor de concursos públicos e estudos. O aluno vai enviar um texto ou print de uma questão/assunto e você deve explicar de forma didática e completa.

REGRAS:
- Explique o conceito de forma clara, usando linguagem acessível
- Se for uma questão de prova, identifique a resposta correta e explique por quê
- Aponte pegadinhas, armadilhas e erros comuns sobre o tema
- Dê um passo a passo da resolução quando aplicável
- Identifique o conceito-chave envolvido
- Sugira um flashcard (pergunta/resposta) para o aluno memorizar o conceito
- Se o aluno enviar uma imagem, leia e interprete o conteúdo visual

Responda APENAS com JSON válido no seguinte formato:
{
  "explicacao": "Explicação didática completa do conceito ou resolução da questão. Use parágrafos quando necessário.",
  "resposta_certa": "A resposta correta, se for uma questão. Se for apenas um assunto/conceito, deixe vazio.",
  "pegadinha": "Onde está a pegadinha ou armadilha mais comum sobre este tema. Se não houver, explique o erro mais frequente dos alunos.",
  "passo_a_passo": ["Passo 1: ...", "Passo 2: ...", "Passo 3: ..."],
  "conceito_chave": "O conceito central envolvido em uma frase curta.",
  "disciplina_sugerida": "Nome da matéria ou disciplina principal identificada na questão (ex.: Direito Constitucional, Português, Raciocínio Lógico, Informática, etc.)",
  "flashcard_sugerido": {
    "frente": "Pergunta objetiva para memorização",
    "verso": "Resposta concisa e correta"
  }
}

- Sem markdown, sem explicações fora do JSON, sem texto adicional
- Os passos devem ser claros e numerados
- A explicação deve ter pelo menos 3-4 frases`;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TiraDuvidasResponse {
  explicacao: string;
  resposta_certa: string;
  pegadinha: string;
  passo_a_passo: string[];
  conceito_chave: string;
  disciplina_sugerida?: string;
  flashcard_sugerido?: { frente: string; verso: string };
}

function parseAIResponse(raw: string): TiraDuvidasResponse | null {
  let cleaned = raw.trim();
  const jsonBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    cleaned = jsonBlockMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (
      parsed &&
      typeof parsed.explicacao === "string" &&
      parsed.explicacao.trim().length > 0
    ) {
      return {
        explicacao: parsed.explicacao.trim(),
        resposta_certa:
          typeof parsed.resposta_certa === "string"
            ? parsed.resposta_certa.trim()
            : "",
        pegadinha:
          typeof parsed.pegadinha === "string" ? parsed.pegadinha.trim() : "",
        passo_a_passo: Array.isArray(parsed.passo_a_passo)
          ? parsed.passo_a_passo
              .filter((s: unknown) => typeof s === "string" && s.trim())
              .map((s: string) => s.trim())
          : [],
        conceito_chave:
          typeof parsed.conceito_chave === "string"
            ? parsed.conceito_chave.trim()
            : "",
        disciplina_sugerida:
          typeof parsed.disciplina_sugerida === "string" && parsed.disciplina_sugerida.trim()
            ? parsed.disciplina_sugerida.trim()
            : undefined,
        flashcard_sugerido:
          parsed.flashcard_sugerido &&
          typeof parsed.flashcard_sugerido.frente === "string" &&
          typeof parsed.flashcard_sugerido.verso === "string"
            ? {
                frente: parsed.flashcard_sugerido.frente.trim(),
                verso: parsed.flashcard_sugerido.verso.trim(),
              }
            : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  POST /api/revisao/tira-duvidas                                     */
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

  const apiKey =
    (typeof dbConfig?.api_key === "string" ? dbConfig.api_key : "") || envKey;
  const rawModel =
    (typeof dbConfig?.model === "string" ? dbConfig.model : "") ||
    envModel ||
    DEFAULT_MODEL;
  const model = resolveAIModel(rawModel);
  const limitEnabled =
    typeof dbConfig?.limit_enabled === "boolean"
      ? dbConfig.limit_enabled
      : true;
  const dailyLimit =
    typeof dbConfig?.daily_limit === "number"
      ? dbConfig.daily_limit
      : DEFAULT_LIMIT;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "IA não configurada no sistema. O Administrador Master precisa configurar a chave do OpenRouter em Ajustes.",
      },
      { status: 503 },
    );
  }

  // 4. Parse body
  const body = (await request.json().catch(() => null)) as {
    pergunta?: unknown;
    imagem?: unknown;
    disciplina?: unknown;
  } | null;

  const pergunta =
    typeof body?.pergunta === "string" ? body.pergunta.trim() : "";
  const imagem = typeof body?.imagem === "string" ? body.imagem.trim() : "";
  const disciplina =
    typeof body?.disciplina === "string" ? body.disciplina.trim() : "";

  if (!pergunta && !imagem) {
    return NextResponse.json(
      { error: "Envie uma pergunta ou cole uma imagem." },
      { status: 400 },
    );
  }
  if (pergunta && pergunta.length < MIN_TEXT_LENGTH) {
    return NextResponse.json(
      {
        error: `O texto precisa ter pelo menos ${MIN_TEXT_LENGTH} caracteres.`,
      },
      { status: 400 },
    );
  }
  if (pergunta && pergunta.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      {
        error: `O texto não pode ter mais de ${MAX_TEXT_LENGTH} caracteres.`,
      },
      { status: 400 },
    );
  }
  if (imagem && imagem.length > MAX_IMAGE_SIZE) {
    return NextResponse.json(
      { error: "A imagem é muito grande. Tente com uma imagem menor (até 4MB)." },
      { status: 400 },
    );
  }

  // 5. Rate limiting (Master tem uso ilimitado; se limitEnabled for falso, todos têm)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: generationsToday, error: countError } = await supabase
    .from("ai_generation_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", oneDayAgo);

  if (countError) {
    console.error("[tira-duvidas] count generations:", countError.message);
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

  // 6. Montar messages para OpenRouter (com suporte multimodal)
  const userContent: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  > = [];

  const contextPrefix = disciplina
    ? `[Matéria/Assunto: ${disciplina}]\n\n`
    : "";

  if (pergunta) {
    userContent.push({
      type: "text",
      text: `${contextPrefix}${pergunta.slice(0, MAX_TEXT_LENGTH)}`,
    });
  } else if (disciplina) {
    userContent.push({
      type: "text",
      text: `${contextPrefix}Analise e explique a questão/conteúdo da imagem abaixo.`,
    });
  }

  if (imagem) {
    // Garantir prefixo data URI
    const imageUrl = imagem.startsWith("data:")
      ? imagem
      : `data:image/png;base64,${imagem}`;
    userContent.push({
      type: "image_url",
      image_url: { url: imageUrl },
    });
  }

  // 7. Call OpenRouter
  let aiResponseText: string;
  let tokensUsed = 0;

  try {
    const orResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://focohub.app",
          "X-Title": "FocoHub - Tira-Dúvidas",
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: 4096,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userContent },
          ],
        }),
      },
    );

    if (!orResponse.ok) {
      const errBody = await orResponse.text().catch(() => "");
      console.error(
        "[tira-duvidas] OpenRouter error:",
        orResponse.status,
        errBody,
      );
      let errorMsg = `Erro ao comunicar com a IA (${orResponse.status}). Verifique a chave e modelo em Ajustes.`;
      if (orResponse.status === 404) {
        errorMsg = `O modelo de IA "${model}" não foi encontrado no OpenRouter (404). Selecione outro modelo em Ajustes.`;
      } else if (orResponse.status === 401) {
        errorMsg = `Chave de API do OpenRouter inválida ou expirada (401). Verifique a chave em Ajustes.`;
      } else if (orResponse.status === 402) {
        errorMsg = `Créditos insuficientes no OpenRouter (402). Recarregue seus créditos.`;
      }
      return NextResponse.json({ error: errorMsg }, { status: 502 });
    }

    const orData = await orResponse.json();
    aiResponseText = orData?.choices?.[0]?.message?.content ?? "";
    tokensUsed = orData?.usage?.total_tokens ?? 0;
  } catch (err) {
    console.error("[tira-duvidas] fetch error:", err);
    return NextResponse.json(
      {
        error:
          "Falha de conexão com a IA. Verifique sua internet e tente novamente.",
      },
      { status: 502 },
    );
  }

  // 8. Parse AI response
  const resposta = parseAIResponse(aiResponseText);
  if (!resposta) {
    console.warn(
      "[tira-duvidas] invalid AI response:",
      aiResponseText.slice(0, 500),
    );
    return NextResponse.json(
      {
        error:
          "A IA não retornou uma resposta válida. Tente reformular a pergunta.",
      },
      { status: 422 },
    );
  }

  // 9. Log generation (mesma tabela do flashcard — cota unificada)
  await supabase.from("ai_generation_log").insert({
    user_id: userId,
    tokens_used: tokensUsed,
    cards_generated: 0, // Não gera cards automaticamente; é tira-dúvidas
  });

  // 10. Return
  const remaining = isExempt
    ? null
    : Math.max(0, dailyLimit - (userGenerations + 1));

  return NextResponse.json({
    ok: true,
    resposta,
    remaining,
    limitEnabled: !isExempt,
    dailyLimit,
    tokens_used: tokensUsed,
  });
}
