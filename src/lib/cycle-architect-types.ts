export type StudyPhase =
  | "iniciante_teoria"
  | "intermediario_exercicios"
  | "reta_final_revisao";

export type SubjectNature = "conceptual" | "practical" | "mixed";

export interface SubjectAssessmentInput {
  id?: string;
  name: string;
  difficulty: number; // 1 (fácil) a 5 (muito difícil)
  exam_weight: number; // 1 (baixa relevância) a 5 (prioridade máxima/edital)
  nature: SubjectNature;
  study_days?: number[] | null; // 0=Seg ... 6=Dom
  current_notes?: string;
}

export interface DayTimeBudget {
  dayIndex: number; // 0=Segunda ... 6=Domingo
  availableMinutes: number;
}

export interface CycleArchitectRequestPayload {
  study_phase: StudyPhase;
  daily_budgets: DayTimeBudget[];
  subjects: SubjectAssessmentInput[];
  user_notes?: string;
}

export interface ArchitectSubjectRecommendation {
  id?: string;
  name: string;
  weight: number; // 1 a 4
  study_minutes: number; // 15 a 90
  nature: SubjectNature;
  allowed_days: number[] | null;
  priority_shift?: "manha" | "tarde" | "noite" | "livre";
  pedagogical_reason: string;
}

export interface IntensiveTriggerRecommendation {
  subject_name: string;
  condition: string;
  recommended_sprint_minutes: number;
}

export interface CycleArchitectResponsePayload {
  strategy_summary: {
    strategy_name: string;
    total_cycle_minutes: number;
    estimated_weekly_rounds: number;
    daily_entropy_target: number;
    average_block_minutes: number;
  };
  subjects: ArchitectSubjectRecommendation[];
  cycle_health: {
    is_mathematically_healthy: boolean;
    max_share_percent: number;
    adjacency_risk: boolean;
    warning_message: string | null;
  };
  intensive_triggers: IntensiveTriggerRecommendation[];
  pedagogical_guidance: {
    headline: string;
    strengths: string;
    key_advice: string;
    caution_warning: string | null;
  };
}
