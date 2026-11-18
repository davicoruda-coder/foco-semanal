import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  checkUserQuota,
  callAIUniversal,
  getEffectiveAIConfig,
  recordAIUsage,
} from "@/lib/ai/client";
import type { AIMessage } from "@/lib/ai/types";

/* ------------------------------------------------------------------ */
/*  Config & Defaults                                                  */
/* ------------------------------------------------------------------ */

const MIN_TEXT_LENGTH = 10;
const MAX_TEXT_LENGTH = 12000;
/** Tamanho máximo de imagem base64: ~4MB (encoded). */
const MAX_IMAGE_SIZE = 4 * 1024 * 1024;

const SYSTEM_PROMPT = `Você é um professor-tutor especialista em estudos, exames e aprendizado ativo (como faculdade, certificações, provas e concursos). O aluno vai enviar um texto ou print de uma questão/assunto e você deve explicar de forma didática e completa.

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
  "topico_assunto": "Título curto e conciso do assunto/tema em 2 a 5 palavras (ex.: Tipagem Dinâmica e Forte, Crase Obrigatória, Atos Administrativos). NUNCA escreva frases longas ou explicações aqui.",
  "conceito_chave": "O conceito ou definição central em uma frase curta e completa.",
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
  topico_assunto?: string;
  conceito_chave: string;
  disciplina_sugerida?: string;
  flashcard_sugerido?: { frente: string; verso: string };
}

export interface FollowUpResponse {
  explicacao: string;
  ponto_chave?: string;
  exemplo_adicional?: string;
}

const FOLLOW_UP_SYSTEM_PROMPT = `Você é um professor-tutor especialista em estudos, concursos e aprendizado ativo em uma sessão tira-dúvidas interativa.
O aluno já recebeu uma explicação detalhada sobre uma questão ou conceito e agora está tirando uma dúvida específica sobre a sua explicação ou sobre a resolução.

DIRETRIZES:
- Responda diretamente e com máxima clareza à dúvida do aluno.
- Seja didático, paciente, empático e acolhedor.
- Use linguagem acessível, analogias do cotidiano ou novos exemplos práticos sempre que isso facilitar o entendimento.
- Se o aluno perguntar "por que a alternativa X não é a certa", aponte com precisão o erro daquela alternativa comparando com a correta.
- Se o aluno disser "não entendi quando você disse X", explique novamente aquele raciocínio sob um outro ângulo mais intuitivo.
- Mantenha parágrafos confortáveis para leitura.

Responda APENAS com JSON válido no seguinte formato:
{
  "explicacao": "Sua explicação didática e esclarecedora focada diretamente na dúvida levantada pelo aluno.",
  "ponto_chave": "Uma frase de reforço destacando o conceito essencial que o aluno precisa memorizar.",
  "exemplo_adicional": "Um contraexemplo ou analogia simples do dia a dia para ilustrar (opcional, deixe vazio se não for necessário)"
}

- Sem markdown fora do JSON, sem texto antes ou depois do JSON.`;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function parseFollowUpResponse(raw: string): FollowUpResponse {
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
        ponto_chave:
          typeof parsed.ponto_chave === "string" && parsed.ponto_chave.trim()
            ? parsed.ponto_chave.trim()
            : undefined,
        exemplo_adicional:
          typeof parsed.exemplo_adicional === "string" && parsed.exemplo_adicional.trim()
            ? parsed.exemplo_adicional.trim()
            : undefined,
      };
    }
  } catch {
    // fallback se a IA respondeu em texto livre
  }

  return {
    explicacao: cleaned.replace(/^```json/i, "").replace(/```$/i, "").trim() || raw.trim(),
  };
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
        topico_assunto:
          typeof parsed.topico_assunto === "string" && parsed.topico_assunto.trim()
            ? parsed.topico_assunto.trim().replace(/^[,;:.›\-\s]+/, "").slice(0, 60)
            : undefined,
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
          typeof parsed.flashcard_sugerido.verso === "string" &&
          parsed.flashcard_sugerido.frente.trim() &&
          parsed.flashcard_sugerido.verso.trim()
            ? {
                frente: parsed.flashcard_sugerido.frente.trim(),
                verso: parsed.flashcard_sugerido.verso.trim(),
              }
            : undefined,
      };
    }
  } catch {
    // JSON parse failed
  }

  return null;
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
        error:
          "IA não configurada no sistema. O Administrador Master precisa configurar a chave em Ajustes > Inteligência Artificial.",
      },
      { status: 503 },
    );
  }

  // 4. Parse body
  const body = (await request.json().catch(() => null)) as {
    pergunta?: unknown;
    imagem?: unknown;
    disciplina?: unknown;
    isFollowUp?: unknown;
    perguntaOriginal?: unknown;
    contextoAnterior?: {
      conceito_chave?: string;
      resposta_certa?: string;
      explicacao?: string;
      passo_a_passo?: string[];
      pegadinha?: string;
    };
    historicoAnterior?: Array<{
      pergunta: string;
      resposta: string;
    }>;
  } | null;

  const isFollowUp = Boolean(body?.isFollowUp);
  const pergunta =
    typeof body?.pergunta === "string" ? body.pergunta.trim() : "";
  const imagem = typeof body?.imagem === "string" ? body.imagem.trim() : "";
  const disciplina =
    typeof body?.disciplina === "string" ? body.disciplina.trim() : "";

  if (isFollowUp) {
    if (!pergunta || pergunta.length < 3) {
      return NextResponse.json(
        { error: "Digite sua dúvida sobre a explicação (mínimo 3 caracteres)." },
        { status: 400 },
      );
    }
    if (pergunta.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `O texto não pode ter mais de ${MAX_TEXT_LENGTH} caracteres.` },
        { status: 400 },
      );
    }
  } else {
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
    if (pergunta.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `O texto não pode ter mais de ${MAX_TEXT_LENGTH} caracteres.` },
        { status: 400 },
      );
    }
  }

  if (imagem && imagem.length > MAX_IMAGE_SIZE) {
    return NextResponse.json(
      {
        error:
          "A imagem é muito grande (máximo ~4MB). Tente tirar um print menor ou comprimir a imagem.",
      },
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
        error: `Limite diário de uso atingido (${aiConfig.dailyLimit}/${aiConfig.dailyLimit} gerações por dia). Tente novamente amanhã.`,
      },
      { status: 429 },
    );
  }

  // 6. Build messages payload
  let messagesPayload: AIMessage[] = [];
  const customPrompt = aiConfig.customPrompt;

  let effectiveSystemPrompt: string;

  if (isFollowUp) {
    effectiveSystemPrompt = customPrompt
      ? `${FOLLOW_UP_SYSTEM_PROMPT}\n\nDIRETRIZES ADICIONAIS DO PROFESSOR:\n${customPrompt}\n\nIMPORTANTE: Responda ESTRITAMENTE em formato JSON válido.`
      : FOLLOW_UP_SYSTEM_PROMPT;

    messagesPayload.push({
      role: "system",
      content: effectiveSystemPrompt,
    });

    const perguntaOrig =
      typeof body?.perguntaOriginal === "string"
        ? body.perguntaOriginal.trim()
        : "";
    const ctx = body?.contextoAnterior;

    let originalContextText = "";
    if (disciplina) originalContextText += `[Disciplina/Matéria: ${disciplina}]\n`;
    if (perguntaOrig) {
      originalContextText += `[Enunciado original ou dúvida inicial do aluno]:\n${perguntaOrig}\n\n`;
    }

    let assistantOriginalText = "";
    if (ctx) {
      if (ctx.resposta_certa) {
        assistantOriginalText += `Gabarito/Resposta Certa: ${ctx.resposta_certa}\n\n`;
      }
      if (ctx.conceito_chave) {
        assistantOriginalText += `Conceito-Chave: ${ctx.conceito_chave}\n\n`;
      }
      if (ctx.explicacao) {
        assistantOriginalText += `Explicação didática que dei ao aluno:\n${ctx.explicacao}\n\n`;
      }
      if (ctx.pegadinha) {
        assistantOriginalText += `Pegadinha/Armadilha apontada:\n${ctx.pegadinha}\n\n`;
      }
      if (Array.isArray(ctx.passo_a_passo) && ctx.passo_a_passo.length > 0) {
        assistantOriginalText += `Passo a passo fornecido:\n${ctx.passo_a_passo.join("\n")}\n\n`;
      }
    }

    if (originalContextText || assistantOriginalText) {
      messagesPayload.push({
        role: "user",
        content:
          originalContextText ||
          "Analise a questão e a explicação fornecidas.",
      });
      messagesPayload.push({
        role: "assistant",
        content:
          assistantOriginalText ||
          "Aqui está a explicação que forneci anteriormente.",
      });
    }

    // Histórico de réplicas anteriores se houver
    if (Array.isArray(body?.historicoAnterior)) {
      for (const h of body.historicoAnterior) {
        if (typeof h?.pergunta === "string" && h.pergunta.trim()) {
          messagesPayload.push({ role: "user", content: h.pergunta.trim() });
        }
        if (typeof h?.resposta === "string" && h.resposta.trim()) {
          messagesPayload.push({
            role: "assistant",
            content: h.resposta.trim(),
          });
        }
      }
    }

    // Nova réplica / dúvida
    messagesPayload.push({
      role: "user",
      content: `Dúvida do aluno sobre a explicação anterior:\n"${pergunta}"`,
    });
  } else {
    effectiveSystemPrompt = customPrompt
      ? `${SYSTEM_PROMPT}\n\nDIRETRIZES E COMPORTAMENTO ADICIONAIS DO PROFESSOR (DEFINIDAS PELO ADMINISTRADOR):\n${customPrompt}\n\nIMPORTANTE: Lembre-se que, independentemente das diretrizes acima, você DEVE SEMPRE responder ESTRITAMENTE em formato JSON válido com todos os campos solicitados.`
      : SYSTEM_PROMPT;

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
        text: `${contextPrefix}Explique este assunto ou resolva a questão abaixo com riqueza didática e aponte eventuais pegadinhas:\n\n${pergunta}`,
      });
    } else {
      userContent.push({
        type: "text",
        text: `${contextPrefix}Analise com atenção a imagem/print anexa enviada pelo aluno. Explique o conceito, resolva a questão (se for o caso), aponte pegadinhas e forneça um passo a passo detalhado.`,
      });
    }

    if (imagem) {
      let imageUrl = imagem;
      if (!imageUrl.startsWith("data:")) {
        imageUrl = `data:image/jpeg;base64,${imageUrl}`;
      }
      userContent.push({
        type: "image_url",
        image_url: { url: imageUrl },
      });
    }

    messagesPayload = [
      { role: "system", content: effectiveSystemPrompt },
      { role: "user", content: userContent },
    ];
  }

  // 7. Chamada Universal de IA
  let aiResponseText = "";
  let tokensUsed = 0;

  try {
    const aiRes = await callAIUniversal(aiConfig, {
      messages: messagesPayload,
      temperature: 0.2,
      maxTokens: 4096,
      responseFormat: "json_object",
    });

    aiResponseText = aiRes.content;
    tokensUsed = aiRes.tokensUsed;
  } catch (err: unknown) {
    console.error("[tira-duvidas] erro ao chamar IA:", err);
    const msg = err instanceof Error ? err.message : "erro de rede";
    return NextResponse.json(
      {
        error: `Falha na comunicação com o serviço de IA: ${msg}. Verifique o provedor e modelo em Ajustes.`,
      },
      { status: 502 },
    );
  }

  // 8. Parse AI response
  let parsedResposta: TiraDuvidasResponse | null = null;
  let parsedFollowUp: FollowUpResponse | null = null;

  if (isFollowUp) {
    parsedFollowUp = parseFollowUpResponse(aiResponseText);
  } else {
    parsedResposta = parseAIResponse(aiResponseText);
    if (!parsedResposta) {
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
  }

  // 9. Log generation
  await recordAIUsage(supabase, userId, 0, tokensUsed);

  // 10. Return
  const remaining = quota.remaining !== null ? Math.max(0, quota.remaining - 1) : null;

  return NextResponse.json({
    ok: true,
    resposta: parsedResposta,
    followUp: parsedFollowUp,
    remaining,
    limitEnabled: aiConfig.limitEnabled && !isMaster,
    dailyLimit: aiConfig.dailyLimit,
    tokens_used: tokensUsed,
    provider: aiConfig.provider,
    model: aiConfig.model,
  });
}
