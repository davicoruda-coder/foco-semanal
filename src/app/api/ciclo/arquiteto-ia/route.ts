import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeAndAuditArchitectPayload } from "@/lib/cycle-architect-calc";
import type { CycleArchitectRequestPayload } from "@/lib/cycle-architect-types";

const DEFAULT_MODEL = "google/gemini-2.5-flash";
const DEFAULT_LIMIT = 15;

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

const SYSTEM_PROMPT = `Você é o Arquiteto de Ciclo de Estudos do FocoHub, um especialista sênior em psicologia cognitiva, neurociência da aprendizagem e engenharia de rotina de estudos (baseado em evidências de Dunlosky, Sweller, Roediger, Cepeda e Csíkszentmihályi).

Seu papel é calcular e calibrar a arquitetura ideal do Ciclo de Estudos contínuo de um estudante, ponderando pesos (1 a 4) e tempos de bloco por matéria, retornando estritamente um JSON estruturado.

PRINCÍPIOS METODOLÓGICOS ESSENCIAIS:
1. CICLO CONTÍNUO VS. GRADE HORÁRIA:
   - O FocoHub rejeita grades horárias engessadas. O ciclo é uma fila contínua ponderada que nunca acumula culpa em caso de imprevistos.

2. CALIBRAÇÃO DE TEMPO POR NATUREZA:
   - Matérias conceituais/teóricas densas: blocos de 20 a 30 min (para respeitar a capacidade estrita da memória de trabalho e evitar a ilusão de competência).
   - Matérias práticas/construção (código, resolução intensiva de questões, simulados, projetos): blocos de 45 a 60 min (para viabilizar o aquecimento de contexto e o estado de fluxo / Flow State).
   - Matérias mistas: blocos de 30 a 45 min.

3. PONDERAÇÃO PROPORCIONAL & ANTI-ADJACÊNCIA (RESTRIÇÃO PIGEONHOLE):
   - Combine a dificuldade relatada (1 a 5) com a relevância no edital/meta (1 a 5).
   - Regra Matemática Rígida: Nenhuma matéria pode ter peso que exceda a metade do total de slots (w_max <= ceil(W / 2)). Em ciclos com 3+ matérias, o peso máximo recomendado é 3 (ou 4 se houver pelo menos 4 outras matérias para intercalar).

4. ENTROPIA DIÁRIA SUSTENTÁVEL:
   - Evite dispersão mental excessiva: oriente a rotina para focar em no máximo 3 a 4 matérias distintas em um mesmo dia longo, repetindo passadas das matérias mais pesadas.

5. GATILHOS PARA MODO INTENSIVO:
   - Sugira gatilhos saudáveis para uso do Modo Intensivo (destravar gargalo conceitual ou maratona prática de simulados) sem canibalizar a fila geral do ciclo.

FORMATO OBRIGATÓRIO DE SAÍDA:
Retorne EXCLUSIVAMENTE um objeto JSON válido, sem cercas de markdown (sem \`\`\`json), com a seguinte estrutura:
{
  "strategy_summary": {
    "strategy_name": "Nome conciso da estratégia",
    "total_cycle_minutes": 380,
    "estimated_weekly_rounds": 2.1,
    "daily_entropy_target": 3,
    "average_block_minutes": 35
  },
  "subjects": [
    {
      "id": "id_se_fornecido",
      "name": "Nome da Matéria",
      "weight": 2,
      "study_minutes": 30,
      "nature": "conceptual | practical | mixed",
      "allowed_days": null,
      "pedagogical_reason": "Justificativa científica de 1 a 2 linhas"
    }
  ],
  "cycle_health": {
    "is_mathematically_healthy": true,
    "max_share_percent": 33.3,
    "adjacency_risk": false,
    "warning_message": null
  },
  "intensive_triggers": [
    {
      "subject_name": "Nome da Matéria",
      "condition": "Gatilho pedagógico para sprint intensivo",
      "recommended_sprint_minutes": 40
    }
  ],
  "pedagogical_guidance": {
    "headline": "Frase de impacto sobre o ciclo calculado",
    "strengths": "Principais forças desta configuração",
    "key_advice": "Orientação prática para o dia a dia",
    "caution_warning": null
  }
}`;

export async function POST(request: Request) {
  // 1. Verificação de Sessão do Usuário
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Sessão inválida ou não autenticada." }, { status: 401 });
  }
  const userId = authData.user.id;

  // 2. Extração do Payload da Requisição
  const body = (await request.json().catch(() => null)) as CycleArchitectRequestPayload | null;
  if (!body || !Array.isArray(body.subjects) || body.subjects.length === 0) {
    return NextResponse.json(
      { error: "Dados incompletos. Forneça ao menos uma matéria para cálculo do ciclo." },
      { status: 400 },
    );
  }

  // 3. Verificação de Permissão Master / Ajustes de IA
  const { data: isMaster } = await supabase.rpc("current_user_is_access_admin");

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

  // Se a chave não estiver configurada, fazemos fallback seguro para o cálculo heurístico determinístico
  if (!apiKey) {
    const heuristicResult = sanitizeAndAuditArchitectPayload(null, body);
    return NextResponse.json({
      success: true,
      source: "heuristic",
      architectResult: heuristicResult,
      notice: "Ciclo arquitetado com base no motor heurístico científico (IA externa não configurada).",
    });
  }

  // 4. Rate Limiting de IA
  if (!isMaster && limitEnabled) {
    const hoje = new Date().toISOString().slice(0, 10);
    const { count, error: countErr } = await supabase
      .from("ai_generation_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", `${hoje}T00:00:00.000Z`);

    if (countErr) {
      console.warn("[arquiteto-ia] erro ao checar quota:", countErr.message);
    } else if (typeof count === "number" && count >= dailyLimit) {
      // Fallback gracioso para cálculo determinístico caso a quota diária seja atingida
      const heuristicResult = sanitizeAndAuditArchitectPayload(null, body);
      return NextResponse.json({
        success: true,
        source: "heuristic",
        architectResult: heuristicResult,
        notice: `Limite diário de requisições de IA atingido (${dailyLimit}/${dailyLimit}). Aplicado o motor determinístico de ciclo.`,
      });
    }
  }

  // 5. Construção do Prompt de Contexto
  const promptUserContext = `
DADOS DO ESTUDANTE:
- Fase de estudos: ${body.study_phase}
- Orçamento de tempo diário:
${(body.daily_budgets || [])
  .map(
    (b) =>
      `  * Dia ${b.dayIndex} (0=Seg..6=Dom): ${b.availableMinutes} min (${(
        b.availableMinutes / 60
      ).toFixed(1)}h)`,
  )
  .join("\n")}

CATÁLOGO DE MATÉRIAS A ARQUITETAR:
${body.subjects
  .map(
    (s, idx) =>
      `${idx + 1}. ${s.name} (ID: ${s.id || "novo"})
   - Dificuldade percebida (1 a 5): ${s.difficulty}
   - Relevância no edital/meta (1 a 5): ${s.exam_weight}
   - Natureza: ${s.nature}
   - Restrição de dias: ${s.study_days ? JSON.stringify(s.study_days) : "livre (todos os dias)"}`,
  )
  .join("\n\n")}

${body.user_notes ? `OBSERVAÇÕES ADICIONAIS DO ALUNO:\n"${body.user_notes}"` : ""}

Gere agora a resposta estritamente em JSON conforme o schema do sistema.`;

  // 6. Chamada à API OpenRouter
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://focohub.app",
        "X-Title": "FocoHub - Arquiteto de Ciclo",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: promptUserContext },
        ],
        temperature: 0.25,
        response_format: { type: "json_object" },
        max_tokens: 1800,
      }),
    });

    if (!res.ok) {
      console.warn("[arquiteto-ia] chamada openrouter falhou com status:", res.status);
      const heuristicResult = sanitizeAndAuditArchitectPayload(null, body);
      return NextResponse.json({
        success: true,
        source: "heuristic_fallback",
        architectResult: heuristicResult,
      });
    }

    const json = await res.json();
    const rawContent = json?.choices?.[0]?.message?.content;

    let parsedRaw: unknown = null;
    if (typeof rawContent === "string") {
      try {
        const cleaned = rawContent
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();
        parsedRaw = JSON.parse(cleaned);
      } catch (parseErr) {
        console.warn("[arquiteto-ia] falha ao fazer JSON.parse do LLM:", parseErr);
      }
    }

    // 7. Sanitização, Auditoria e Aplicação da Restrição Pigeonhole
    const finalResult = sanitizeAndAuditArchitectPayload(parsedRaw, body);

    // 8. Registro de Uso no Log de IA
    try {
      const admin = createAdminClient();
      const clientToUse = admin || supabase;
      await clientToUse.from("ai_generation_log").insert({
        user_id: userId,
        cards_generated: 1,
        tokens_used: json?.usage?.total_tokens || 0,
      });
    } catch (logErr) {
      console.warn("[arquiteto-ia] falha ao registrar ai_generation_log:", logErr);
    }

    return NextResponse.json({
      success: true,
      source: "ai",
      architectResult: finalResult,
    });
  } catch (err: any) {
    console.error("[arquiteto-ia] exceção durante processamento:", err);
    const heuristicResult = sanitizeAndAuditArchitectPayload(null, body);
    return NextResponse.json({
      success: true,
      source: "heuristic_fallback",
      architectResult: heuristicResult,
    });
  }
}

