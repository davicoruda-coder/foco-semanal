import { createDefaultData } from "@/lib/demo-store";
import { plainTextFromHtml } from "@/lib/note-html";
import type {
  AppData,
  BlockType,
  FocusTimer,
  NoteColumn,
  Reminder,
  SessionSettings,
  StickyNote,
  StudySession,
  Subject,
  SubjectStatus,
  ThemePref,
  WeekBlock,
} from "@/lib/types";
import { sanitizeCssColor, normalizeStudyDays } from "@/lib/utils";

export const MAX_BACKUP_BYTES = 1_048_576;
const MAX_ITEMS = 500;
const MAX_SESSIONS = 100;
const MAX_NAME = 200;
const MAX_TEXT = 8_000;
const MAX_ID = 80;

const BLOCK_TYPES = new Set<BlockType>([
  "trabalho",
  "estudo",
  "reuniao",
  "pessoal",
  "outro",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = "", max = MAX_TEXT): string {
  if (typeof value !== "string") return fallback;
  return value.slice(0, max);
}

function asId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  if (!id || id.length > MAX_ID) return null;
  if (!/^[\w-]+$/.test(id)) return null;
  return id;
}

function asInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asColor(value: unknown, fallback: string): string {
  return sanitizeCssColor(typeof value === "string" ? value : null, fallback);
}

function isJsonBackupFile(file: File): boolean {
  const name = file.name.toLowerCase();
  if (name.endsWith(".json")) return true;
  return file.type === "application/json" || file.type === "text/json";
}

export function backupFileError(file: File): string | null {
  if (file.size > MAX_BACKUP_BYTES) {
    return "Arquivo grande demais (máximo 1 MB).";
  }
  if (!isJsonBackupFile(file)) {
    return "Envie um arquivo JSON de backup.";
  }
  return null;
}

function parseSubject(raw: unknown, index: number): Subject | null {
  if (!isRecord(raw)) return null;
  const id = asId(raw.id);
  const name = asString(raw.name, "", MAX_NAME).trim();
  if (!id || !name) return null;
  const status: SubjectStatus = raw.status === "ok" ? "ok" : "prox";
  const studyDaysRaw = Array.isArray(raw.study_days)
    ? raw.study_days.filter((d): d is number => typeof d === "number")
    : null;
  return {
    id,
    name,
    status,
    notes: asString(raw.notes, "", MAX_TEXT),
    cycle_order: asInt(raw.cycle_order, index, 0, 9_999),
    active: asBool(raw.active, true),
    study_days: normalizeStudyDays(studyDaysRaw),
    study_minutes: Math.min(999, Math.max(1, asInt(raw.study_minutes, 25, 1, 999))),
  };
}

function parseWeekBlock(raw: unknown, index: number): WeekBlock | null {
  if (!isRecord(raw)) return null;
  const id = asId(raw.id);
  const label = asString(raw.label, "", MAX_NAME).trim();
  if (!id || !label) return null;
  const type = BLOCK_TYPES.has(raw.type as BlockType)
    ? (raw.type as BlockType)
    : "outro";
  const color = asColor(raw.color, "");
  return {
    id,
    day: asInt(raw.day, 0, 0, 6),
    label,
    type,
    sort_order: asInt(raw.sort_order, index, 0, 9_999),
    ...(color ? { color } : {}),
  };
}

function parseReminder(raw: unknown): Reminder | null {
  if (!isRecord(raw)) return null;
  const id = asId(raw.id);
  if (!id) return null;
  const title = plainTextFromHtml(asString(raw.title, "", MAX_TEXT)).slice(
    0,
    MAX_TEXT,
  );
  const notifyAt = asString(raw.notify_at, new Date().toISOString(), 40);
  const doneAt =
    typeof raw.done_at === "string" ? raw.done_at.slice(0, 40) : null;
  return {
    id,
    title,
    notes: asString(raw.notes, "", MAX_TEXT),
    notify_at: notifyAt,
    remind_minutes_before: asInt(raw.remind_minutes_before, 10, 0, 24 * 60),
    done_at: doneAt,
    active: asBool(raw.active, true),
    has_alarm: asBool(raw.has_alarm, false),
    color: asColor(raw.color, "#FDE68A"),
    font_size: (() => {
      const n = typeof raw.font_size === "number" ? raw.font_size : Number(raw.font_size);
      return n === 1 || n === 2 ? n : 0;
    })(),
  };
}

function parseColumn(raw: unknown, index: number): NoteColumn | null {
  if (!isRecord(raw)) return null;
  const id = asId(raw.id);
  const title = asString(raw.title, "", MAX_NAME).trim();
  if (!id || !title) return null;
  return {
    id,
    title,
    color: asColor(raw.color, "#FDE68A"),
    sort_order: asInt(raw.sort_order, index, 0, 9_999),
  };
}

function parseSticky(raw: unknown, index: number, columnIds: Set<string>): StickyNote | null {
  if (!isRecord(raw)) return null;
  const id = asId(raw.id);
  const columnId = asId(raw.column_id);
  if (!id || !columnId || !columnIds.has(columnId)) return null;
  return {
    id,
    column_id: columnId,
    text: asString(raw.text, "", MAX_TEXT),
    color: asColor(raw.color, "#FDE047"),
    sort_order: asInt(raw.sort_order, index, 0, 9_999),
  };
}

function parseSession(raw: unknown): StudySession | null {
  if (!isRecord(raw)) return null;
  const id = asId(raw.id);
  if (!id) return null;
  const subjectId = raw.subject_id == null ? null : asId(raw.subject_id);
  return {
    id,
    subject_id: subjectId,
    subject_name: asString(raw.subject_name, "", MAX_NAME),
    started_at: asString(raw.started_at, new Date().toISOString(), 40),
    ended_at: typeof raw.ended_at === "string" ? raw.ended_at.slice(0, 40) : null,
    duration_minutes: asInt(raw.duration_minutes, 0, 0, 24 * 60),
    mode: raw.mode === "unica" ? "unica" : "ciclo",
    completed: asBool(raw.completed, false),
  };
}

function parseSettings(raw: unknown): SessionSettings {
  const defaults = createDefaultData().session_settings;
  if (!isRecord(raw)) return defaults;
  return {
    focus_minutes: asInt(raw.focus_minutes, defaults.focus_minutes, 1, 180),
    break_short_minutes: asInt(
      raw.break_short_minutes,
      defaults.break_short_minutes,
      1,
      60,
    ),
    break_long_minutes: asInt(
      raw.break_long_minutes,
      defaults.break_long_minutes,
      1,
      120,
    ),
  };
}

function parseTimer(raw: unknown, index: number): FocusTimer | null {
  if (!isRecord(raw)) return null;
  const id = asId(raw.id);
  const name = asString(raw.name, "", MAX_NAME).trim();
  if (!id || !name) return null;
  return {
    id,
    name,
    minutes: asInt(raw.minutes, 25, 1, 180),
    accent: asColor(raw.accent, "var(--signal)"),
    sort_order: asInt(raw.sort_order, index, 0, 9_999),
  };
}

export function parseBackupJson(
  json: string,
): { ok: true; data: AppData; theme?: ThemePref } | { ok: false; error: string } {
  if (json.length > MAX_BACKUP_BYTES) {
    return { ok: false, error: "Arquivo grande demais (máximo 1 MB)." };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: "JSON inválido." };
  }
  if (!isRecord(parsed) || !isRecord(parsed.data)) {
    return { ok: false, error: "Arquivo inválido: falta o objeto data." };
  }
  const raw = parsed.data;
  if (!Array.isArray(raw.subjects)) {
    return { ok: false, error: "Arquivo inválido: falta data.subjects." };
  }

  const defaults = createDefaultData();
  const subjects = raw.subjects
    .slice(0, MAX_ITEMS)
    .map(parseSubject)
    .filter((s): s is Subject => s !== null);
  const week_blocks = (Array.isArray(raw.week_blocks) ? raw.week_blocks : [])
    .slice(0, MAX_ITEMS)
    .map(parseWeekBlock)
    .filter((b): b is WeekBlock => b !== null);
  const reminders = (Array.isArray(raw.reminders) ? raw.reminders : [])
    .slice(0, MAX_ITEMS)
    .map(parseReminder)
    .filter((r): r is Reminder => r !== null);
  const note_columns = (Array.isArray(raw.note_columns) ? raw.note_columns : [])
    .slice(0, MAX_ITEMS)
    .map(parseColumn)
    .filter((c): c is NoteColumn => c !== null);
  const columnIds = new Set(note_columns.map((c) => c.id));
  const sticky_notes = (Array.isArray(raw.sticky_notes) ? raw.sticky_notes : [])
    .slice(0, MAX_ITEMS)
    .map((item, i) => parseSticky(item, i, columnIds))
    .filter((n): n is StickyNote => n !== null);
  const study_sessions = (Array.isArray(raw.study_sessions)
    ? raw.study_sessions
    : []
  )
    .slice(0, MAX_SESSIONS)
    .map(parseSession)
    .filter((s): s is StudySession => s !== null);
  const timers = (Array.isArray(raw.timers) ? raw.timers : [])
    .slice(0, 50)
    .map(parseTimer)
    .filter((t): t is FocusTimer => t !== null);

  const theme =
    parsed.theme === "light" || parsed.theme === "dark" || parsed.theme === "auto"
      ? parsed.theme
      : undefined;

  return {
    ok: true,
    theme,
    data: {
      subjects,
      week_blocks,
      reminders,
      note_columns,
      sticky_notes,
      study_sessions,
      session_settings: parseSettings(raw.session_settings),
      timers: timers.length ? timers : defaults.timers,
    },
  };
}
