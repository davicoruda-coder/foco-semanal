import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { QuizQuestion, QuizQuestionType } from "@/lib/revisao/quiz-types";

const DEFAULT_MODEL = "google/gemini-2.5-flash";
const DEFAULT_LIMIT = 15;
const MAX_TEXT_LENGTH = 20000;
const MAX_QUESTIONS = 10;

const DEPRECATED_MODEL_MAP: Record<string, string> = {
  "google/gemini-2.0-flash-001": "google/gemini-2.5-flash",
  "anthropic/claude-3.5-haiku": "google/gemini-2.5-flash",
  "anthropic/claude-3.5-haiku-20241022": "google/gemini-2.5-flash",
};

function resolveAIModel(rawModel?: string | null): string {
  const trimmed = rawModel?.trim();
  if (!trimmed) return DEFAULT_MODEL;
  return DEPRECATED_MODEL_MAP[trimmed] || trimmed;
}

const SYSTEM_PROMPT = `Você é um elaborador sênior especialista em questões de avaliação ativa, concursos e exames de alto rendimento.
Seu objetivo é criar um Quiz didático e focado para fixação ativa, baseado ESTRITAMENTE no conteúdo fornecido pelo estudante.

DIRETRIZES FUNDAMENTAIS:
1. RIGOR E ANTI-ALUCINAÇÃO:
   - Todas as questões, gabaritos e alternativas DEVEM ser fundamentadas no texto/imagens fornecidos.
   - NUNCA invente dados, fatos ou leis que contrariem ou extrapolam o material enviado.
2. FORMATOS PERMITIDOS:
   - "multipla_escolha": Exatamente 4 opções (A, B, C, D). Apenas UMA opção deve ser inequivocamente correta. As outras 3 opções (distratores) devem conter erros conceituais claros e plausíveis.
   - "certo_errado": Duas opções: ["Certo", "Errado"]. O enunciado deve ser uma afirmação categórica, objetiva e sem dubiedades de interpretação.
3. EXPLICAÇÃO DIDÁTICA (Obrigatória):
   - Forneça uma explicação detalhada, clara e concisa demonstrando por que o gabarito está correto e onde está o erro dos distratores.
4. FORMATO OBRIGATÓRIO DE RESPOSTA:
   - Responda ESTRITAMENTE com JSON válido no formato:
   {
     "questions": [
       {
         "statement": "Enunciado claro e contextualizado da questão",
         "type": "multipla_escolha",
         "options": ["A) Opção 1", "B) Opção 2", "C) Opção 3", "D) Opção 4"],
         "answerIndex": 0,
         "explanation": "Comentário pedagógico do gabarito"
       }
     ]
   }
   - Sem markdown ao redor do JSON se possível, sem explicações extras fora do JSON.`;

function parseAIResponse(raw: string, maxCount = MAX_QUESTIONS): QuizQuestion[] | null {
  let cleaned = raw.trim();
  const jsonBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    cleaned = jsonBlockMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed || !Array.isArray(parsed.questions)) return null;

    const questions: QuizQuestion[] = [];
    for (let i = 0; i < parsed.questions.length; i++) {
      const q = parsed.questions[i];
      if (
        typeof q.statement === "string" &&
        q.statement.trim().length > 0 &&
        Array.isArray(q.options) &&
        q.options.length >= 2 &&
        typeof q.answerIndex === "number" &&
        q.answerIndex >= 0 &&
        q.answerIndex < q.options.length &&
        typeof q.explanation === "string"
      ) {
        const type: QuizQuestionType =
          q.type === "certo_errado" || q.options.length === 2
            ? "certo_errado"
            : "multipla_escolha";

        questions.push({
          id: `q_${Date.now()}_${i}`,
          statement: q.statement.trim(),
          type,
          options: q.options.map((opt: unknown) => String(opt).trim()),
          answerIndex: Math.floor(q.answerIndex),
          explanation: q.explanation.trim(),
        });
      }
    }

    return questions.length > 0 ? questions.slice(0, maxCount) : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  // 1. Auth
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }
  const userId = authData.user.id;

  // 2. Admin / Master check
  const { data: isMaster } = await supabase.rpc("current_user_is_access_admin");

  // 3. IA Config (system_settings > fallback env)
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
        error: "IA não configurada no sistema. O Administrador precisa configurar a chave do OpenRouter em Ajustes.",
      },
      { status: 503 },
    );
  }

  // 4. Parse request body
  const body = (await request.json().catch(() => null)) as {
    sourceType?: unknown;
    texto?: unknown;
    images?: unknown;
    questionType?: unknown;
    count?: unknown;
    disciplina?: unknown;
  } | null;

  const sourceType = typeof body?.sourceType === "string" ? body.sourceType : "texto";
  const texto = typeof body?.texto === "string" ? body.texto.trim() : "";
  const disciplina = typeof body?.disciplina === "string" ? body.disciplina.trim() : "";
  const questionType =
    body?.questionType === "certo_errado" || body?.questionType === "multipla_escolha"
      ? body.questionType
      : "todos";

  const countRequested = typeof body?.count === "number" ? Math.min(MAX_QUESTIONS, Math.max(3, body.count)) : 5;

  const rawImages = Array.isArray(body?.images) ? body?.images : [];
  const images = rawImages
    .filter((img): img is string => typeof img === "string" && img.startsWith("data:image/"))
    .slice(0, 2);

  if (!texto && images.length === 0) {
    return NextResponse.json(
      { error: "Nenhum conteúdo de texto ou imagem foi fornecido para gerar o quiz." },
      { status: 400 },
    );
  }

  if (texto.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `O conteúdo ultrapassa o limite de segurança de ${MAX_TEXT_LENGTH} caracteres.` },
      { status: 400 },
    );
  }

  // 5. Rate limiting
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: generationsToday, error: countError } = await supabase
    .from("ai_generation_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", oneDayAgo);

  if (countError) {
    console.error("[quiz-ia] count generations error:", countError.message);
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

  // 6. Montar prompt do usuário
  let instruction = `Gere ${countRequested} questões inéditas baseadas no conteúdo a seguir.`;
  if (disciplina) {
    instruction += ` Disciplina/Contexto: ${disciplina}.`;
  }
  if (questionType === "multipla_escolha") {
    instruction += " Todas as questões devem ser no formato Múltipla Escolha (4 opções).";
  } else if (questionType === "certo_errado") {
    instruction += " Todas as questões devem ser no formato Certo ou Errado.";
  } else {
    instruction += " Mescle questões de Múltipla Escolha e Certo/Errado.";
  }

  const fullTextPrompt = `${instruction}\n\nCONTEÚDO:\n${texto}`;
  const userContentParts: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }> = [];
  userContentParts.push({
    type: "text",
    text: fullTextPrompt,
  });

  for (const imgUrl of images) {
    userContentParts.push({
      type: "image_url",
      image_url: { url: imgUrl },
    });
  }

  // 7. Chamada ao OpenRouter
  let aiResponseText = "";
  let tokensUsed = 0;

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://focohub.app",
        "X-Title": "FocoHub Quiz",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: images.length > 0 ? userContentParts : fullTextPrompt },
        ],
        temperature: 0.2, // Baixa temperatura para precisão factual
        max_tokens: 3000,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error("[quiz-ia] OpenRouter HTTP error:", res.status, errBody);
      return NextResponse.json(
        { error: `Erro na API da IA (${res.status}). Verifique a chave ou tente novamente.` },
        { status: 502 },
      );
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { total_tokens?: number };
    };

    aiResponseText = json.choices?.[0]?.message?.content || "";
    tokensUsed = json.usage?.total_tokens || 0;
  } catch (err) {
    console.error("[quiz-ia] OpenRouter fetch failed:", err);
    return NextResponse.json(
      { error: "Falha de conexão com a IA. Tente novamente em instantes." },
      { status: 502 },
    );
  }

  // 8. Parse e validação das questões
  const questions = parseAIResponse(aiResponseText, countRequested);

  if (!questions || questions.length === 0) {
    console.error("[quiz-ia] Resposta inválida da IA:", aiResponseText.slice(0, 300));
    return NextResponse.json(
      { error: "A IA não conseguiu estruturar as questões no formato esperado. Tente novamente." },
      { status: 422 },
    );
  }

  // Adiciona a disciplina em cada questão se aplicável
  if (disciplina) {
    for (const q of questions) {
      q.subjectName = disciplina;
    }
  }

  // 9. Registrar no log de uso
  try {
    await supabase.from("ai_generation_log").insert({
      user_id: userId,
      model,
      tokens_used: tokensUsed,
      source: `quiz_${sourceType}`,
    });
  } catch (logErr) {
    console.warn("[quiz-ia] Log insert failed:", logErr);
  }

  return NextResponse.json({
    questions,
    model,
    tokensUsed,
  });
}
