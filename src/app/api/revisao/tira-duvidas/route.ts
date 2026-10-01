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
  "explicacao": "Sua resposta didática e completa sanando a dúvida do aluno com acolhimento e clareza. Use quebras de linha e parágrafos bem espaçados.",
  "ponto_chave": "Frase curta de fixação do esclarecimento (opcional, máximo 1 linha)",
  "exemplo_adicional": "Exemplo prático do cotidiano ou contextualizado para ilustrar (opcional, ou deixe vazio)"
}

- Sem markdown fora do JSON, sem textos adicionais fora do JSON.`;

function parseFollowUpResponse(raw: string): FollowUpResponse {
  let cleaned = raw.trim();
  const jsonBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    cleaned = jsonBlockMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed.explicacao === "string" && parsed.explicacao.trim()) {
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
  const customPrompt =
    typeof dbConfig?.custom_prompt === "string"
      ? dbConfig.custom_prompt.trim()
      : "";

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

  // 6. Montar messages para OpenRouter
  let messagesPayload: Array<{
    role: "system" | "user" | "assistant";
    content:
      | string
      | Array<
          | { type: "text"; text: string }
          | { type: "image_url"; image_url: { url: string } }
        >;
  }> = [];

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

    messagesPayload = [
      { role: "system", content: effectiveSystemPrompt },
      { role: "user", content: userContent },
    ];
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
          messages: messagesPayload,
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
    resposta: parsedResposta,
    followUp: parsedFollowUp,
    remaining,
    limitEnabled: !isExempt,
    dailyLimit,
    tokens_used: tokensUsed,
  });
}
