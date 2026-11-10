import { analyzeCycleHealth } from "@/lib/cycle-health";
import type {
  ArchitectSubjectRecommendation,
  CycleArchitectRequestPayload,
  CycleArchitectResponsePayload,
  IntensiveTriggerRecommendation,
  SubjectAssessmentInput,
} from "./cycle-architect-types";

/**
 * Motor Heurístico Determinístico do Arquiteto de Ciclo
 *
 * Aplica os princípios de Psicologia Cognitiva e Neurociência da Aprendizagem:
 * 1. Ponderação Proporcional: Combina Dificuldade (1..5) e Relevância no Edital (1..5).
 * 2. Calibração de Bloco por Natureza:
 *    - Conceitual / Teórica: 25 a 30 min (respeita o limite da memória de trabalho de Sweller).
 *    - Prática / Resolução / Código: 45 a 60 min (permite atingir o fluxo de Csíkszentmihályi).
 *    - Mista: 35 a 45 min.
 * 3. Garantia Pigeonhole de Anti-adjacência: Corrige pesos para que w_max <= ceil(W / 2).
 * 4. Teto de Entropia Diária: Limita a diversidade de matérias a 2-4 por dia.
 */
export function calculateHeuristicCycleArchitecture(
  payload: CycleArchitectRequestPayload,
): CycleArchitectResponsePayload {
  const subjectsInput = payload.subjects.filter((s) => s.name.trim().length > 0);

  if (subjectsInput.length === 0) {
    return createEmptyResponse();
  }

  // 1. Horas totais semanais disponíveis
  const totalWeeklyMinutes = payload.daily_budgets.reduce(
    (acc, b) => acc + Math.max(0, b.availableMinutes),
    0,
  );
  const activeDaysCount = payload.daily_budgets.filter((b) => b.availableMinutes > 0).length || 5;
  const avgDailyMinutes = totalWeeklyMinutes > 0 ? totalWeeklyMinutes / activeDaysCount : 120;

  // 2. Determinação de Pesos Brutos
  // Pontuação combinada = Dificuldade * 1.2 + Peso no Edital * 1.5
  // Faixas:
  // <= 6: Peso 1
  // 7 a 9: Peso 2
  // 10 a 11: Peso 3
  // >= 12: Peso 4
  const rawRecommendations: ArchitectSubjectRecommendation[] = subjectsInput.map((s) => {
    const diff = Math.min(5, Math.max(1, s.difficulty || 3));
    const exam = Math.min(5, Math.max(1, s.exam_weight || 3));
    const score = diff * 1.2 + exam * 1.5;

    let weight = 1;
    if (score >= 12) weight = 4;
    else if (score >= 9.5) weight = 3;
    else if (score >= 7) weight = 2;
    else weight = 1;

    // Duração do bloco baseada na natureza e na fase
    let minutes = 30;
    if (s.nature === "conceptual") {
      minutes = payload.study_phase === "reta_final_revisao" ? 25 : 30;
    } else if (s.nature === "practical") {
      minutes = payload.study_phase === "iniciante_teoria" ? 45 : 50;
    } else {
      minutes = 35;
    }

    // Se o usuário tem pouco tempo diário (< 60 min), calibra para blocos menores
    if (avgDailyMinutes < 60) {
      minutes = Math.max(20, Math.min(minutes, 30));
    }

    const reason = buildPedagogicalReason(s, weight, minutes);

    return {
      id: s.id,
      name: s.name.trim(),
      weight,
      study_minutes: minutes,
      nature: s.nature,
      allowed_days: s.study_days ?? null,
      priority_shift: "livre",
      pedagogical_reason: reason,
    };
  });

  // 3. Normalização Matemática Estrita (Pigeonhole Constraint)
  const normalizedSubjects = enforcePigeonholeBalance(rawRecommendations);

  // 4. Verificação de Saúde do Ciclo com utilitário oficial
  const healthCheck = analyzeCycleHealth(
    normalizedSubjects.map((s) => ({
      id: s.id || s.name,
      name: s.name,
      weight: s.weight,
      active: true,
      is_free: false,
    })),
  );

  // 5. Cálculo de métricas da rodada
  const totalCycleMinutes = normalizedSubjects.reduce(
    (acc, s) => acc + s.weight * s.study_minutes,
    0,
  );
  const totalSlots = normalizedSubjects.reduce((acc, s) => acc + s.weight, 0);
  const averageBlockMinutes =
    totalSlots > 0 ? Math.round(totalCycleMinutes / totalSlots) : 30;
  const estimatedWeeklyRounds =
    totalCycleMinutes > 0 && totalWeeklyMinutes > 0
      ? Number((totalWeeklyMinutes / totalCycleMinutes).toFixed(1))
      : 1.5;

  // 6. Gatilhos inteligentes para Modo Intensivo
  const intensiveTriggers = buildIntensiveTriggers(normalizedSubjects, payload.study_phase);

  // 7. Orientações e avisos pedagógicos
  const cautionRisks = checkHiatusRisks(normalizedSubjects);
  const strategyName =
    payload.study_phase === "reta_final_revisao"
      ? "Ciclo Ágil de Reta Final (Alto Espaçamento)"
      : payload.study_phase === "intermediario_exercicios"
      ? "Intercalação Progressiva com Foco Prático"
      : "Construção de Base Teórica com Proteção Cognitiva";

  return {
    strategy_summary: {
      strategy_name: strategyName,
      total_cycle_minutes: totalCycleMinutes,
      estimated_weekly_rounds: Math.max(0.5, estimatedWeeklyRounds),
      daily_entropy_target: Math.min(4, Math.max(2, Math.floor(avgDailyMinutes / 35))),
      average_block_minutes: averageBlockMinutes,
    },
    subjects: normalizedSubjects,
    cycle_health: {
      is_mathematically_healthy: healthCheck.isHealthy,
      max_share_percent: healthCheck.metrics.maxSharePercent,
      adjacency_risk: healthCheck.issueType === "adjacency_risk",
      warning_message: healthCheck.message ?? null,
    },
    intensive_triggers: intensiveTriggers,
    pedagogical_guidance: {
      headline: `Ciclo calibrado para ${normalizedSubjects.length} disciplinas em ${totalSlots} blocos intercalados.`,
      strengths: `Distribuição balanceada com tempo médio de ${averageBlockMinutes} min por bloco, garantindo retenção contínua sem quebrar sua rotina com imprevistos.`,
      key_advice:
        "Avance as matérias conforme o relógio do ciclo indicar. Caso precise parar antes, o progresso continuará intacto exatamente de onde parou no próximo dia.",
      caution_warning: cautionRisks || healthCheck.message || null,
    },
  };
}

/**
 * Garante que nenhuma matéria tenha w_max > ceil(W / 2) em ciclos com 2+ matérias.
 */
function enforcePigeonholeBalance(
  subjects: ArchitectSubjectRecommendation[],
): ArchitectSubjectRecommendation[] {
  if (subjects.length <= 1) return subjects;

  const list = subjects.map((s) => ({ ...s }));

  // Itera até que o critério de anti-adjacência seja satisfeito
  let attempts = 0;
  while (attempts < 10) {
    const totalSlots = list.reduce((acc, s) => acc + s.weight, 0);
    const maxAllowed = Math.ceil(totalSlots / 2);

    let hadViolation = false;
    for (const s of list) {
      if (s.weight > maxAllowed) {
        s.weight = Math.max(1, maxAllowed - 1);
        hadViolation = true;
      }
    }

    if (!hadViolation) break;
    attempts++;
  }

  return list;
}

function buildPedagogicalReason(
  s: SubjectAssessmentInput,
  weight: number,
  minutes: number,
): string {
  const diff = s.difficulty >= 4 ? "alta dificuldade" : s.difficulty <= 2 ? "boa familiaridade" : "dificuldade moderada";
  const relevance = s.exam_weight >= 4 ? "alta relevância no edital" : "relevância complementar";

  let natureDesc = "bloco equilibrado";
  if (s.nature === "conceptual") {
    natureDesc = `bloco curto de ${minutes}m para proteger a memória de trabalho`;
  } else if (s.nature === "practical") {
    natureDesc = `bloco imersivo de ${minutes}m para alcançar estado de fluxo`;
  }

  return `${weight}x no ciclo por aliar ${diff} e ${relevance}; ${natureDesc}.`;
}

function buildIntensiveTriggers(
  subjects: ArchitectSubjectRecommendation[],
  phase: string,
): IntensiveTriggerRecommendation[] {
  const triggers: IntensiveTriggerRecommendation[] = [];

  for (const s of subjects) {
    if (s.weight >= 3 || s.nature === "practical") {
      triggers.push({
        subject_name: s.name,
        condition:
          s.nature === "practical"
            ? "Acionar para sessões de simulado extenso ou projeto sem fragmentar o ciclo regular."
            : "Acionar caso erre mais de 35% dos flashcards ou trave em tópico com alta densidade teórica.",
        recommended_sprint_minutes: s.nature === "practical" ? 60 : 40,
      });
    }
  }

  if (triggers.length === 0 && subjects[0]) {
    triggers.push({
      subject_name: subjects[0].name,
      condition: "Acionar para destravamento pontual de conteúdo antes de simulados ou provas.",
      recommended_sprint_minutes: 40,
    });
  }

  return triggers.slice(0, 3);
}

function checkHiatusRisks(subjects: ArchitectSubjectRecommendation[]): string | null {
  const risky = subjects.filter((s) => s.allowed_days && s.allowed_days.length === 1);
  if (risky.length > 0) {
    const names = risky.map((r) => r.name).join(", ");
    return `Atenção: A(s) disciplina(s) ${names} está(ão) restrita(s) a apenas 1 dia por semana. Em caso de imprevisto, o hiato sem contato pode chegar a 14 dias, acelerando o esquecimento.`;
  }
  return null;
}

function createEmptyResponse(): CycleArchitectResponsePayload {
  return {
    strategy_summary: {
      strategy_name: "Ciclo Padrão Equilibrado",
      total_cycle_minutes: 0,
      estimated_weekly_rounds: 0,
      daily_entropy_target: 3,
      average_block_minutes: 30,
    },
    subjects: [],
    cycle_health: {
      is_mathematically_healthy: true,
      max_share_percent: 0,
      adjacency_risk: false,
      warning_message: null,
    },
    intensive_triggers: [],
    pedagogical_guidance: {
      headline: "Cadastre suas disciplinas para que o Arquiteto elabore o ciclo ideal.",
      strengths: "O FocoHub ajusta pesos e durações automaticamente.",
      key_advice: "Adicione as disciplinas e indique seu nível de dificuldade.",
      caution_warning: null,
    },
  };
}

/**
 * Validador e Sanitizador Estrito da Resposta de IA
 *
 * Corrige discrepâncias de JSON e alucinações de valores, garantindo
 * conformidade com a arquitetura do FocoHub antes de enviar ao cliente.
 */
export function sanitizeAndAuditArchitectPayload(
  raw: unknown,
  fallbackInput: CycleArchitectRequestPayload,
): CycleArchitectResponsePayload {
  if (!raw || typeof raw !== "object") {
    return calculateHeuristicCycleArchitecture(fallbackInput);
  }

  const r = raw as Record<string, unknown>;
  const fallback = calculateHeuristicCycleArchitecture(fallbackInput);

  const rawSubjects = Array.isArray(r.subjects) ? r.subjects : [];
  if (rawSubjects.length === 0) {
    return fallback;
  }

  const sanitizedSubjects: ArchitectSubjectRecommendation[] = rawSubjects.map(
    (item, idx) => {
      const matchFallback = fallbackInput.subjects[idx];
      const name =
        typeof item.name === "string" && item.name.trim().length > 0
          ? item.name.trim()
          : matchFallback?.name || `Matéria ${idx + 1}`;

      const rawWeight = Number(item.weight);
      const weight =
        Number.isFinite(rawWeight) && rawWeight >= 1 && rawWeight <= 4
          ? Math.round(rawWeight)
          : matchFallback?.exam_weight && matchFallback.exam_weight >= 4
          ? 3
          : 2;

      const rawMin = Number(item.study_minutes);
      const study_minutes =
        Number.isFinite(rawMin) && rawMin >= 15 && rawMin <= 120
          ? Math.round(rawMin)
          : 30;

      const nature =
        item.nature === "conceptual" || item.nature === "practical" || item.nature === "mixed"
          ? item.nature
          : matchFallback?.nature || "conceptual";

      const allowed_days = Array.isArray(item.allowed_days)
        ? item.allowed_days.filter((d: unknown): d is number => typeof d === "number" && d >= 0 && d <= 6)
        : matchFallback?.study_days ?? null;

      const reason =
        typeof item.pedagogical_reason === "string" && item.pedagogical_reason.trim().length > 0
          ? item.pedagogical_reason.trim()
          : `Ponderação calibrada para ${weight}x com blocos de ${study_minutes} min.`;

      return {
        id: typeof item.id === "string" ? item.id : matchFallback?.id,
        name,
        weight,
        study_minutes,
        nature,
        allowed_days: allowed_days && allowed_days.length > 0 && allowed_days.length < 7 ? allowed_days : null,
        pedagogical_reason: reason,
      };
    },
  );

  // Aplica balanceamento Pigeonhole determinístico
  const balanced = enforcePigeonholeBalance(sanitizedSubjects);

  const health = analyzeCycleHealth(
    balanced.map((s) => ({
      id: s.id || s.name,
      name: s.name,
      weight: s.weight,
      active: true,
      is_free: false,
    })),
  );

  const totalCycleMinutes = balanced.reduce(
    (acc, s) => acc + s.weight * s.study_minutes,
    0,
  );
  const totalSlots = balanced.reduce((acc, s) => acc + s.weight, 0);

  const totalWeeklyMinutes = fallbackInput.daily_budgets.reduce(
    (acc, b) => acc + Math.max(0, b.availableMinutes),
    0,
  );
  const estimatedWeeklyRounds =
    totalCycleMinutes > 0 && totalWeeklyMinutes > 0
      ? Number((totalWeeklyMinutes / totalCycleMinutes).toFixed(1))
      : fallback.strategy_summary.estimated_weekly_rounds;

  const rawGuidance = r.pedagogical_guidance as Record<string, unknown> | undefined;

  return {
    strategy_summary: {
      strategy_name:
        typeof (r.strategy_summary as any)?.strategy_name === "string"
          ? (r.strategy_summary as any).strategy_name
          : fallback.strategy_summary.strategy_name,
      total_cycle_minutes: totalCycleMinutes,
      estimated_weekly_rounds: Math.max(0.5, estimatedWeeklyRounds),
      daily_entropy_target: fallback.strategy_summary.daily_entropy_target,
      average_block_minutes:
        totalSlots > 0 ? Math.round(totalCycleMinutes / totalSlots) : 30,
    },
    subjects: balanced,
    cycle_health: {
      is_mathematically_healthy: health.isHealthy,
      max_share_percent: health.metrics.maxSharePercent,
      adjacency_risk: health.issueType === "adjacency_risk",
      warning_message: health.message ?? null,
    },
    intensive_triggers:
      Array.isArray(r.intensive_triggers) && r.intensive_triggers.length > 0
        ? (r.intensive_triggers as IntensiveTriggerRecommendation[]).map((t) => ({
            subject_name: String(t.subject_name || "Geral"),
            condition: String(t.condition || "Sprint pontual"),
            recommended_sprint_minutes: Number(t.recommended_sprint_minutes) || 40,
          }))
        : fallback.intensive_triggers,
    pedagogical_guidance: {
      headline:
        typeof rawGuidance?.headline === "string"
          ? rawGuidance.headline
          : fallback.pedagogical_guidance.headline,
      strengths:
        typeof rawGuidance?.strengths === "string"
          ? rawGuidance.strengths
          : fallback.pedagogical_guidance.strengths,
      key_advice:
        typeof rawGuidance?.key_advice === "string"
          ? rawGuidance.key_advice
          : fallback.pedagogical_guidance.key_advice,
      caution_warning:
        checkHiatusRisks(balanced) ||
        (typeof rawGuidance?.caution_warning === "string" ? rawGuidance.caution_warning : null) ||
        health.message ||
        null,
    },
  };
}
