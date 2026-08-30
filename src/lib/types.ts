export type SubjectStatus = "ok" | "prox";

export type Theme = "light" | "dark";

/** Preferência de aparência: fixa ou automática (claro de dia, escuro à noite). */
export type ThemePref = Theme | "auto";

export type BlockType = "trabalho" | "estudo" | "reuniao" | "pessoal" | "outro";

export type SessionMode = "ciclo" | "unica";

export type TimerPhase = "focus" | "break_short" | "break_long";

export interface Subject {
  id: string;
  name: string;
  status: SubjectStatus;
  notes: string;
  cycle_order: number;
  active: boolean;
  /**
   * Dias da semana em que a matéria aparece no ciclo (0=Seg … 6=Dom).
   * `null` = todos os dias.
   */
  study_days: number[] | null;
  /** Minutos do temporizador desta matéria (play no ciclo). */
  study_minutes: number;
}

export interface WeekBlock {
  id: string;
  day: number; // 0=Seg ... 6=Dom
  label: string;
  type: BlockType;
  sort_order: number;
  /** Cor custom do bloco; se ausente, usa a cor do tipo */
  color?: string;
}

export interface Reminder {
  id: string;
  title: string;
  notes: string;
  notify_at: string; // ISO — usado quando has_alarm
  remind_minutes_before: number;
  done_at: string | null;
  active: boolean;
  /** Se false, é só nota — sem alarme */
  has_alarm: boolean;
  color: string;
  /**
   * Tamanho da fonte: 0 = atual (máximo), 1 e 2 = um pouco menores.
   */
  font_size: 0 | 1 | 2;
}

export interface NoteColumn {
  id: string;
  title: string;
  color: string;
  sort_order: number;
}

export interface StickyNote {
  id: string;
  column_id: string;
  text: string;
  color: string;
  sort_order: number;
}

export interface StudySession {
  id: string;
  subject_id: string | null;
  subject_name: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
  mode: SessionMode;
  completed: boolean;
}

export interface SessionSettings {
  focus_minutes: number;
  break_short_minutes: number;
  break_long_minutes: number;
}

/** Temporizadores da tela principal (Bloco, Estudo, …) */
export interface FocusTimer {
  id: string;
  name: string;
  minutes: number;
  /** Cor do anel, ex. var(--signal) ou #hex */
  accent: string;
  sort_order: number;
}

export interface AppData {
  subjects: Subject[];
  week_blocks: WeekBlock[];
  reminders: Reminder[];
  note_columns: NoteColumn[];
  sticky_notes: StickyNote[];
  study_sessions: StudySession[];
  session_settings: SessionSettings;
  timers: FocusTimer[];
}

export const DAYS = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
] as const;

export const STATUS_LABEL: Record<SubjectStatus, string> = {
  ok: "Concluída",
  prox: "Próxima",
};

export const BLOCK_TYPE_LABEL: Record<BlockType, string> = {
  trabalho: "Trabalho",
  estudo: "Estudo",
  reuniao: "Reunião",
  pessoal: "Pessoal",
  outro: "Outro",
};
