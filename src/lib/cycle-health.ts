/**
 * Diagnóstico de Saúde e Proporcionalidade do Ciclo de Estudos
 *
 * Avalia o balanceamento matemático dos pesos (1x a 4x) atribuídos às matérias
 * ativas de ciclo para prevenir monopólio de carga horária e quebra
 * do princípio de anti-adjacência (intercalação espaçada).
 */

export interface CycleSubjectCandidate {
  id: string;
  name: string;
  weight?: number | null;
  active?: boolean;
  is_free?: boolean;
}

export type CycleHealthIssueType = "adjacency_risk" | "monopoly";

export interface DominantSubjectInfo {
  id: string;
  name: string;
  weight: number;
  sharePercent: number;
}

export interface CycleHealthMetrics {
  activeSubjectsCount: number;
  totalSlots: number;
  maxWeight: number;
  maxSharePercent: number;
  maxAllowedWithoutCollision: number;
}

export interface CycleHealthResult {
  isHealthy: boolean;
  issueType: CycleHealthIssueType | null;
  dominantSubject: DominantSubjectInfo | null;
  metrics: CycleHealthMetrics;
  title?: string;
  message?: string;
  recommendation?: string;
}

/**
 * Analisa a distribuição de pesos das matérias do ciclo de estudos.
 *
 * Regras Matemáticas:
 * 1. Quebra de Anti-adjacência (Pigeonhole):
 *    Se w_max > ceil(W / 2), é matematicamente impossível intercalar
 *    sem colocar a mesma matéria em sessões consecutivas.
 *
 * 2. Monopolização do Ciclo:
 *    Se w_max >= 3 e a matéria dominante absorve >= 50% do total de slots
 *    em ciclos de 3 a 5 matérias, o tempo de reexposição das matérias
 *    secundárias fica excessivamente longo, prejudicando a retenção espaçada.
 *
 * @param subjects Lista de matérias cadastradas.
 * @returns Diagnóstico com métricas, status de saúde e mensagens de aviso pedagógico.
 */
export function analyzeCycleHealth(
  subjects: CycleSubjectCandidate[],
): CycleHealthResult {
  // Filtra apenas matérias ativas que participam da fila rotativa do ciclo (não livres)
  const activeCycleSubjects = subjects.filter(
    (s) => (s.active ?? true) && !s.is_free,
  );

  const activeSubjectsCount = activeCycleSubjects.length;

  // Com 0 ou 1 matéria, o conceito de intercalação ponderada não se aplica
  if (activeSubjectsCount <= 1) {
    const single = activeCycleSubjects[0];
    const weight = single ? Math.max(1, single.weight ?? 1) : 0;
    return {
      isHealthy: true,
      issueType: null,
      dominantSubject: single
        ? {
            id: single.id,
            name: single.name,
            weight,
            sharePercent: 100,
          }
        : null,
      metrics: {
        activeSubjectsCount,
        totalSlots: weight,
        maxWeight: weight,
        maxSharePercent: single ? 100 : 0,
        maxAllowedWithoutCollision: weight,
      },
    };
  }

  // Calcula peso e slots
  let totalSlots = 0;
  let maxWeight = 0;
  let dominantCandidate: CycleSubjectCandidate | null = null;

  for (const s of activeCycleSubjects) {
    const w = Math.max(1, s.weight ?? 1);
    totalSlots += w;
    if (w > maxWeight) {
      maxWeight = w;
      dominantCandidate = s;
    }
  }

  const maxAllowedWithoutCollision = Math.ceil(totalSlots / 2);
  const share = totalSlots > 0 ? maxWeight / totalSlots : 0;
  const sharePercent = Math.round(share * 100);

  const dominantSubject: DominantSubjectInfo | null = dominantCandidate
    ? {
        id: dominantCandidate.id,
        name: dominantCandidate.name,
        weight: maxWeight,
        sharePercent,
      }
    : null;

  const metrics: CycleHealthMetrics = {
    activeSubjectsCount,
    totalSlots,
    maxWeight,
    maxSharePercent: sharePercent,
    maxAllowedWithoutCollision,
  };

  // Critério 1: Quebra de Anti-adjacência (Pigeonhole Principle)
  if (maxWeight > maxAllowedWithoutCollision) {
    const subjectName = dominantSubject?.name ?? "Esta matéria";
    return {
      isHealthy: false,
      issueType: "adjacency_risk",
      dominantSubject,
      metrics,
      title: "Ciclo com repetição consecutiva",
      message: `Com peso ${maxWeight}x em "${subjectName}", não há matérias suficientes no ciclo para intercalar. Ela precisará ser estudada duas vezes seguidas.`,
      recommendation:
        "Reduza o peso para manter o ciclo intercalado ou use o Modo Intensivo se precisar focar nela temporariamente.",
    };
  }

  // Critério 2: Monopolização do Ciclo
  // Em fluxos pequenos (3 a 5 matérias), peso >= 3 consumindo >= 50% do tempo
  if (maxWeight >= 3 && share >= 0.5 && activeSubjectsCount <= 5) {
    const subjectName = dominantSubject?.name ?? "Esta matéria";
    return {
      isHealthy: false,
      issueType: "monopoly",
      dominantSubject,
      metrics,
      title: "Ciclo desbalanceado",
      message: `"${subjectName}" ocupa ${sharePercent}% de todo o ciclo (${maxWeight} de ${totalSlots} sessões). As outras matérias demorarão muito para reaparecer.`,
      recommendation:
        "Para acelerar uma matéria pontual (ex: prova próxima), prefira o Modo Intensivo em vez de inflar o peso no ciclo.",
    };
  }

  return {
    isHealthy: true,
    issueType: null,
    dominantSubject,
    metrics,
  };
}

