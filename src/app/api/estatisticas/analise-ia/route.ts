import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  checkUserQuota,
  callAIUniversal,
  getEffectiveAIConfig,
  recordAIUsage,
} from "@/lib/ai/client";

const SYSTEM_PROMPT = `Você é um consultor pedagógico e especialista sênior em psicologia cognitiva e neurociência da aprendizagem aplicada (estilo Dunlosky, Roediger, Sweller e Cepeda).
Seu papel é analisar as métricas de estudo reais fornecidas pelo aplicativo FocoHub e gerar um Parecer Pedagógico de Alto Nível para o estudante.

DIRETRIZES DE RESPONSABILIDADE ÉTICA E PEDAGÓGICA (MÁXIMA PRIORIDADE):
1. ATITUDE ACOLHEDORA E RESPEITOSA:
   - NUNCA use tom depreciativo, alarmista, punitivo ou arrogante.
   - Jamais diga "você falhou", "desempenho fraco" ou faça julgamentos de valor sobre a rotina da pessoa.
   - Lembre-se: o estudante tem vida pessoal, trabalho, cansaço e imprevistos. O estudo deve ser incentivado com clareza e empatia.

2. ANÁLISE OBSERVACIONAL BASEADA EM DADOS:
   - Descreva com precisão o que os números mostram (tempo total, dias estudados, distribuição de disciplinas, horários de pico).
   - Se houver disciplinas que receberam muito mais foco que outras, aponte isso de forma construtiva, verificando se o ciclo de estudos foi equilibrado.

3. PILARES CIENTÍFICOS PARA SUGESTÕES (CITAR DISCRETAMENTE AS EVIDÊNCIAS):
   - Prática Espaçada (Spaced Practice - Dunlosky et al., 2013; Cepeda et al., 2006): valorize a constância diária em vez de maratonas esporádicas.
   - Prática Intercalada (Interleaving - Rohrer & Taylor, 2007): incentive a alternância do ciclo para não cansar a mente com uma única matéria por dias seguidos.
   - Recuperação Ativa (Retrieval Practice - Roediger & Karpicke, 2006): incentive a prática de flashcards e resolução de questões como consolidação da memória.
   - Carga Cognitiva e Pausas (Sweller, 1988): observe se as sessões têm duração sustentável (idealmente blocos de 30 a 50 min com intervalos) para evitar exaustão.

4. ESTRUTURA DO PARECER (Use formatação Markdown limpa e agradável):
   ### 1. Raio-X do Período
   (Síntese descritiva dos indicadores: tempo acumulado, consistência de dias e avanço em voltas do ciclo)

   ### 2. Padrões Observados & Equilíbrio
   (Análise dos horários de maior produtividade, rotação de matérias e duração média das sessões)

   ### 3. Saúde das Revisões & Retenção
   (Diagnóstico do uso de flashcards/questões e consolidação da memória)

   ### 4. Recomendações Construtivas (Baseadas em Evidências)
   (2 a 3 sugestões práticas, cautelosas e realistas para os próximos ciclos, apresentadas como hipóteses e testes que o estudante pode experimentar)

   ### 💡 Mensagem de Apoio & Cautela
   (Encerramento motivador reforçando que cada rotina é única e que o ajuste fino depende do bem-estar pessoal)`;

export async function POST(request: Request) {
  // 1. Auth check
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Sessão inválida ou não autenticada." }, { status: 401 });
  }
  const userId = authData.user.id;

  // 2. Admin / Master check
  const { data: isMaster } = await supabase.rpc("current_user_is_access_admin");

  // 3. IA Config universal
  const aiConfig = await getEffectiveAIConfig(supabase, Boolean(isMaster));

  if (!aiConfig.isConfigured) {
    return NextResponse.json(
      {
        error: "IA não configurada no sistema. O Administrador precisa configurar a chave em Ajustes > Inteligência Artificial.",
      },
      { status: 503 },
    );
  }

  // 4. Rate limiting
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
        error: `Limite diário de requisições de IA atingido (${aiConfig.dailyLimit}/${aiConfig.dailyLimit}). Tente novamente amanhã.`,
      },
      { status: 429 },
    );
  }

  // 5. Extração e validação do corpo
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Dados de métricas não fornecidos." }, { status: 400 });
  }

  const periodLabel = typeof body.periodLabel === "string" ? body.periodLabel : "Período analisado";
  const periodType = typeof body.period === "string" ? body.period : "semana";
  const totalSeconds = typeof body.totalSeconds === "number" ? body.totalSeconds : 0;
  const activeDaysCount = typeof body.activeDaysCount === "number" ? body.activeDaysCount : 0;
  const totalDaysInPeriod = typeof body.totalDaysInPeriod === "number" ? body.totalDaysInPeriod : 7;
  const completedCycleRounds = typeof body.completedCycleRounds === "number" ? body.completedCycleRounds : 0;

  const subjects = Array.isArray(body.subjectsBreakdown) ? body.subjectsBreakdown : [];
  const timeSlots = Array.isArray(body.timeSlotsSummary) ? body.timeSlotsSummary : [];
  const sessions = (body.sessionsSummary as Record<string, unknown>) || {};
  const flashcards = (body.flashcardsStats as Record<string, unknown>) || null;

  // Montagem do payload descritivo para a IA
  const promptContext = `
DADOS DO ESTUDANTE PARA ANÁLISE:
- Período: ${periodLabel} (Tipo: ${periodType})
- Tempo total dedicado: ${Math.round(totalSeconds / 60)} minutos (${(totalSeconds / 3600).toFixed(1)} horas)
- Consistência de dias: ${activeDaysCount} dia(s) com registro ativo de um total de ${totalDaysInPeriod} dias no período
- Voltas completas no Ciclo de Estudos: ${completedCycleRounds} volta(s) finalizada(s)
- Total de sessões registradas: ${sessions.totalSessions ?? 0}
- Duração média das sessões: ${sessions.averageDurationMinutes ?? 0} minutos
- Tipos de sessões: ${JSON.stringify(sessions.byType || {})}

DISTRIBUIÇÃO DE MATÉRIAS NO PERÍODO:
${
  subjects.length > 0
    ? subjects
        .map((s) => {
          const item = s as { name?: string; seconds?: number; percentage?: number };
          return `- ${item.name || "Matéria"}: ${Math.round((item.seconds || 0) / 60)} min (${item.percentage || 0}% do foco)`;
        })
        .join("\n")
    : "- Nenhuma matéria discriminada"
}

HORÁRIOS DE ATIVIDADE COM REGISTRO:
${
  timeSlots.length > 0
    ? timeSlots
        .map((t) => t as { label?: string; seconds?: number })
        .filter((t) => (t.seconds || 0) > 0)
        .map((t) => `- ${t.label || "Turno"}: ${Math.round((t.seconds || 0) / 60)} min`)
        .join("\n")
    : "- Sem registros por turno específico"
}

ESTATÍSTICAS DE FLASHCARDS & REVISÕES:
${
  flashcards
    ? `- Total de cards cadastrados: ${flashcards.totalCards ?? 0}
- Cards pendentes para hoje: ${flashcards.pendentesHoje ?? 0}
- Domínio: ${JSON.stringify(flashcards.dominioCount || {})}`
    : "- Dados de flashcards não disponíveis para este período."
}

Gere agora o Parecer Pedagógico de acordo com as instruções do sistema, com profundidade, embasamento e tom humano e cauteloso.`;

  // 6. Chamada Universal de IA
  try {
    const aiResponse = await callAIUniversal(aiConfig, {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: promptContext },
      ],
      temperature: 0.35,
      maxTokens: 1500,
    });

    const content = aiResponse.content;

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Resposta inesperada ou vazia da IA." },
        { status: 502 },
      );
    }

    // 7. Registro no log de geração
    await recordAIUsage(supabase, userId, 1, aiResponse.tokensUsed);

    return NextResponse.json({
      success: true,
      analysis: content.trim(),
      generatedAt: new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date()),
      model: aiResponse.modelUsed,
      provider: aiResponse.providerUsed,
    });
  } catch (fetchErr: unknown) {
    console.error("[analise-ia] falha de rede/execução:", fetchErr);
    const msg = fetchErr instanceof Error ? fetchErr.message : "erro de rede";
    return NextResponse.json(
      { error: `Falha na comunicação com o serviço de IA: ${msg}` },
      { status: 500 },
    );
  }
}
