import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  checkUserQuota,
  callAIUniversal,
  getEffectiveAIConfig,
  recordAIUsage,
} from "@/lib/ai/client";
import type { QuizQuestion, QuizQuestionType } from "@/lib/revisao/quiz-types";
import type { AIMessage } from "@/lib/ai/types";

const MAX_TEXT_LENGTH = 20000;
const MAX_QUESTIONS = 10;

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

    const validated: QuizQuestion[] = [];
    for (let i = 0; i < parsed.questions.length; i++) {
      const q = parsed.questions[i];
      if (typeof q.statement !== "string" || !q.statement.trim()) continue;

      const type: QuizQuestionType =
        q.type === "certo_errado" ? "certo_errado" : "multipla_escolha";

      let options: string[] = [];
      let answerIndex = typeof q.answerIndex === "number" ? q.answerIndex : 0;

      if (type === "certo_errado") {
        options = ["Certo", "Errado"];
        if (answerIndex !== 0 && answerIndex !== 1) {
          answerIndex = 0;
        }
      } else {
        if (!Array.isArray(q.options) || q.options.length < 2) continue;
        options = q.options.map((opt: unknown) => String(opt).trim()).filter(Boolean);
        if (options.length !== 4) continue;
        if (answerIndex < 0 || answerIndex >= options.length) {
          answerIndex = 0;
        }
      }

      const explanation =
        typeof q.explanation === "string" && q.explanation.trim()
          ? q.explanation.trim()
          : "Gabarito fundamentado no conteúdo estudado.";

      validated.push({
        id: `q_${Date.now()}_${i}`,
        statement: q.statement.trim(),
        type,
        options,
        answerIndex,
        explanation,
      });
    }

    if (validated.length === 0) return null;
    return validated.slice(0, maxCount);
  } catch (err) {
    console.warn("[quiz-ia] falha ao fazer JSON.parse da resposta:", err);
    return null;
  }
}

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
        error: "IA não configurada no sistema. O Administrador precisa configurar a chave em Ajustes > Inteligência Artificial.",
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
  let userMessageContent: AIMessage["content"];

  if (images.length > 0) {
    const parts: AIMessage["content"] = [
      {
        type: "text",
        text: fullTextPrompt,
      },
    ];
    for (const imgUrl of images) {
      parts.push({
        type: "image_url",
        image_url: { url: imgUrl },
      });
    }
    userMessageContent = parts;
  } else {
    userMessageContent = fullTextPrompt;
  }

  // 7. Chamada Universal de IA
  let aiResponseText = "";
  let tokensUsed = 0;

  try {
    const customPrompt = aiConfig.customPrompt;
    const effectiveSystemPrompt = customPrompt
      ? `${SYSTEM_PROMPT}\n\nDIRETRIZES E COMPORTAMENTO ADICIONAIS DO ELABORADOR:\n${customPrompt}\n\nIMPORTANTE: Responda ESTRITAMENTE em formato JSON no schema solicitado.`
      : SYSTEM_PROMPT;

    const aiRes = await callAIUniversal(aiConfig, {
      messages: [
        { role: "system", content: effectiveSystemPrompt },
        { role: "user", content: userMessageContent },
      ],
      temperature: 0.2, // Baixa temperatura para precisão factual
      maxTokens: 3000,
      responseFormat: "json_object",
    });

    aiResponseText = aiRes.content;
    tokensUsed = aiRes.tokensUsed;
  } catch (err: unknown) {
    console.error("[quiz-ia] erro ao chamar IA:", err);
    const msg = err instanceof Error ? err.message : "falha de rede";
    return NextResponse.json(
      { error: `Erro na comunicação com a IA: ${msg}` },
      { status: 502 },
    );
  }

  // 8. Parse e validação das questões
  const questions = parseAIResponse(aiResponseText, countRequested);

  if (!questions || questions.length === 0) {
    console.warn("[quiz-ia] resposta inválida:", aiResponseText.slice(0, 500));
    return NextResponse.json(
      {
        error: "A IA não conseguiu estruturar as questões com base no conteúdo enviado. Tente enviar um texto mais limpo.",
      },
      { status: 422 },
    );
  }

  // 9. Registrar no log de uso
  await recordAIUsage(supabase, userId, questions.length, tokensUsed);

  // 10. Retornar resposta
  const remaining = quota.remaining !== null ? Math.max(0, quota.remaining - 1) : null;

  return NextResponse.json({
    success: true,
    questions,
    totalQuestions: questions.length,
    remaining,
    limitEnabled: aiConfig.limitEnabled && !isMaster,
    dailyLimit: aiConfig.dailyLimit,
    provider: aiConfig.provider,
    model: aiConfig.model,
  });
}
