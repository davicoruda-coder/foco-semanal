import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  checkUserQuota,
  callAIUniversal,
  getEffectiveAIConfig,
  recordAIUsage,
} from "@/lib/ai/client";
import { resolveAIModel } from "@/lib/ai/providers";

export { resolveAIModel };

/* ------------------------------------------------------------------ */
/*  Config & Defaults                                                  */
/* ------------------------------------------------------------------ */

const MIN_TEXT_LENGTH = 50;
const MAX_TEXT_LENGTH = 8000;
const MAX_CARDS_PER_GENERATION = 30;

const SYSTEM_PROMPT = `Você é um gerador de flashcards didático para aprendizado ativo e estudos em geral (como faculdade, certificações, provas e concursos). Dado o texto abaixo, extraia os conceitos-chave e crie flashcards no formato pergunta/resposta.

REGRAS:
- Crie entre 5 e 30 flashcards dependendo da extensão do texto
- A "frente" deve ser uma pergunta clara e objetiva
- O "verso" deve ser a resposta concisa e correta
- Não invente informações que não estejam no texto
- Foque em definições, distinções, exceções e regras importantes
- Responda APENAS com JSON válido no formato: {"cards": [{"frente": "...", "verso": "..."}]}
- Sem markdown, sem explicações, sem texto fora do JSON`;

const CADERNO_SYSTEM_PROMPT = `Você é um professor mentor especialista em aprendizado ativo, concursos e repetição espaçada.
O estudante errou uma questão ou registrou um aprendizado no Caderno de Erros.
Seu objetivo é transformar esse aprendizado em flashcards ideais de active recall (pergunta e resposta).

DIRETRIZES FUNDAMENTAIS:
1. DOSAGEM INTELIGENTE DE QUANTIDADE (1 a 4 cards):
- Avalie a densidade e a quantidade de conceitos/regras independentes no texto:
  - Se contiver apenas 1 regra direta ou conceito central: crie APENAS 1 flashcard cirúrgico e objetivo.
  - Se contiver múltiplos conceitos, exceções, distinções ou requisitos independentes (texto longo): divida em 2 ou no máximo 4 flashcards atômicos (um para cada conceito-chave).
  - NUNCA invente perguntas genéricas ou de enchimento. Cada flashcard deve ser valioso para uma revisão rápida.
2. FRENTE (PERGUNTA INSTIGANTE):
  - Deve ser uma pergunta clara, contextualizada e instigante que provoque o raciocínio ativo (Active Recall).
  - NUNCA use apenas o nome do assunto ou uma afirmação solta como frente.
3. VERSO (RESPOSTA EXPLICATIVA):
  - Resposta precisa, direta e concisa, explicando o porquê de forma memorável.
4. FORMATO OBRIGATÓRIO:
  - Responda ESTRITAMENTE com JSON válido no formato: {"cards": [{"frente": "...", "verso": "..."}]}
  - Sem texto antes ou depois do JSON, sem markdown extra.`;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

interface GeneratedCard {
  frente: string;
  verso: string;
}

function parseAIResponse(raw: string, maxCount = MAX_CARDS_PER_GENERATION): GeneratedCard[] | null {
  let cleaned = raw.trim();
  const jsonBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    cleaned = jsonBlockMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (!parsed || !Array.isArray(parsed.cards)) return null;

    const validCards: GeneratedCard[] = [];
    for (const item of parsed.cards) {
      if (
        typeof item.frente === "string" &&
        typeof item.verso === "string" &&
        item.frente.trim().length > 0 &&
        item.verso.trim().length > 0
      ) {
        validCards.push({
          frente: item.frente.trim(),
          verso: item.verso.trim(),
        });
      }
    }

    if (validCards.length === 0) return null;
    return validCards.slice(0, maxCount);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  POST Handler                                                       */
/* ------------------------------------------------------------------ */

export async function POST(request: Request) {
  // 1. Auth check
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  const userId = authData.user.id;

  // 2. Admin / Master check
  const { data: isMaster } = await supabase.rpc(
    "current_user_is_access_admin",
  );

  // 3. IA Config
  const aiConfig = await getEffectiveAIConfig(supabase, Boolean(isMaster));

  if (!aiConfig.isConfigured) {
    return NextResponse.json(
      {
        error: "IA não configurada no sistema. O Administrador Master precisa configurar a chave em Ajustes > Inteligência Artificial.",
      },
      { status: 503 },
    );
  }

  // 4. Parse body
  const body = (await request.json().catch(() => null)) as {
    texto?: unknown;
    disciplina?: unknown;
    assunto?: unknown;
    banca?: unknown;
    enunciado?: unknown;
    questao_id?: unknown;
    modo?: unknown;
  } | null;

  const modo = body?.modo === "caderno" ? "caderno" : "resumo";
  const texto = typeof body?.texto === "string" ? body.texto.trim() : "";
  const disciplina = typeof body?.disciplina === "string" ? body.disciplina.trim() : "";
  const assunto = typeof body?.assunto === "string" ? body.assunto.trim() : "";
  const banca = typeof body?.banca === "string" ? body.banca.trim() : "";
  const enunciado = typeof body?.enunciado === "string" ? body.enunciado.trim() : "";
  const questaoId = typeof body?.questao_id === "string" ? body.questao_id.trim() : null;

  const minLength = modo === "caderno" ? 10 : MIN_TEXT_LENGTH;

  if (!texto || texto.length < minLength) {
    return NextResponse.json(
      { error: `O texto precisa ter pelo menos ${minLength} caracteres.` },
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

  // 5. Rate limiting
  const quota = await checkUserQuota(
    supabase,
    userId,
    aiConfig.dailyLimit,
    aiConfig.limitEnabled,
    Boolean(isMaster),
  );

  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: `Limite diário de ${aiConfig.dailyLimit} gerações atingido. O limite será renovado amanhã.`,
        limit_reached: true,
      },
      { status: 429 },
    );
  }

  // 6. Chamada Universal de IA
  let aiResponseText = "";
  let tokensUsed = 0;

  try {
    const customPrompt = aiConfig.customPrompt;
    const basePrompt = modo === "caderno" ? CADERNO_SYSTEM_PROMPT : SYSTEM_PROMPT;

    const effectiveSystemPrompt = customPrompt
      ? `${basePrompt}\n\nDIRETRIZES E COMPORTAMENTO ADICIONAIS (DEFINIDAS PELO ADMINISTRADOR):\n${customPrompt}\n\nIMPORTANTE: Lembre-se que você DEVE SEMPRE responder APENAS no formato JSON {"cards": [{"frente": "...", "verso": "..."}]}.`
      : basePrompt;

    let userPromptContent = "";
    if (modo === "caderno") {
      const parts: string[] = [];
      parts.push(`DISCIPLINA: ${disciplina}`);
      if (assunto) parts.push(`ASSUNTO: ${assunto}`);
      if (banca) parts.push(`BANCA: ${banca}`);
      if (enunciado) parts.push(`ENUNCIADO DA QUESTÃO:\n${enunciado.slice(0, 3000)}`);
      parts.push(`REGRA APRENDIDA / ANOTAÇÃO DO ESTUDANTE:\n${texto.slice(0, MAX_TEXT_LENGTH)}`);
      userPromptContent = parts.join("\n\n");
    } else {
      userPromptContent = texto.slice(0, MAX_TEXT_LENGTH);
    }

    const aiRes = await callAIUniversal(aiConfig, {
      messages: [
        { role: "system", content: effectiveSystemPrompt },
        { role: "user", content: userPromptContent },
      ],
      temperature: modo === "caderno" ? 0.2 : 0.1,
      maxTokens: 4096,
      responseFormat: "json_object",
    });

    aiResponseText = aiRes.content;
    tokensUsed = aiRes.tokensUsed;
  } catch (err: unknown) {
    console.error("[revisao-ia] erro ao chamar IA:", err);
    const msg = err instanceof Error ? err.message : "erro de rede";
    return NextResponse.json(
      { error: `Falha na comunicação com o serviço de IA: ${msg}` },
      { status: 502 },
    );
  }

  // 7. Parse AI response (para caderno, limita entre 1 e 4 cards)
  const maxAllowedCards = modo === "caderno" ? 4 : MAX_CARDS_PER_GENERATION;
  const cards = parseAIResponse(aiResponseText, maxAllowedCards);
  if (!cards || cards.length === 0) {
    console.warn("[revisao-ia] invalid AI response:", aiResponseText.slice(0, 500));
    return NextResponse.json(
      { error: "A IA não retornou flashcards válidos. Tente reformular o texto ou escolher outro modelo." },
      { status: 422 },
    );
  }

  // 8. Batch insert flashcards (vincula questao_id se fornecido)
  const rows = cards.map((c) => ({
    user_id: userId,
    frente: c.frente,
    verso: c.verso,
    origem: "ia" as const,
    disciplina,
    questao_id: questaoId || null,
  }));

  const { data: inserted, error: insertError } = await supabase
    .from("flashcards")
    .insert(rows)
    .select("id, frente, verso, disciplina, questao_id, created_at");

  if (insertError) {
    console.error("[revisao-ia] insert cards:", insertError.message);
    return NextResponse.json(
      { error: "Erro ao salvar flashcards no banco de dados." },
      { status: 500 },
    );
  }

  // 9. Log generation
  await recordAIUsage(supabase, userId, cards.length, tokensUsed);

  // 10. Return
  const remaining = quota.remaining !== null ? Math.max(0, quota.remaining - 1) : null;

  return NextResponse.json({
    cards: inserted,
    total_criados: inserted.length,
    remaining,
    limitEnabled: aiConfig.limitEnabled && !isMaster,
    dailyLimit: aiConfig.dailyLimit,
    provider: aiConfig.provider,
    model: aiConfig.model,
  });
}
