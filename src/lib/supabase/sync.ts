import type { SupabaseClient } from "@supabase/supabase-js";
import { createDefaultData } from "@/lib/demo-store";
import type {
  AppData,
  FocusTimer,
  NoteColumn,
  Reminder,
  SessionSettings,
  StickyNote,
  StudySession,
  Subject,
  ThemePref,
  WeekBlock,
} from "@/lib/types";
import { normalizeStudyDays } from "@/lib/utils";

type Client = SupabaseClient;

export type SaveCloudOptions = {
  /**
   * Soft-delete de TODAS as coleções do usuário e grava o payload.
   * Só use no botão explícito “Apagar dados na nuvem”.
   */
  allowEmptyWipe?: boolean;
};

export type SoftDeleteTable =
  | "subjects"
  | "week_blocks"
  | "reminders"
  | "note_columns"
  | "sticky_notes"
  | "focus_timers";

function normalizeFontSize(value: unknown): 0 | 1 | 2 {
  const n = typeof value === "number" ? value : Number(value);
  if (n === 1 || n === 2) return n;
  return 0;
}

function normalizeStudyMinutes(value: unknown, fallback = 25): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(999, Math.floor(n));
}

function asTheme(v: string | null | undefined): ThemePref {
  return v === "dark" || v === "auto" ? v : "light";
}

function assertOk(label: string, error: { message: string } | null) {
  if (error) {
    throw new Error(`[foco] ${label}: ${error.message}`);
  }
}

/** Conta nova / sem dados na nuvem (seguro para seed a partir do local). */
export function isCloudDataEmpty(data: AppData): boolean {
  return (
    data.subjects.length === 0 &&
    data.week_blocks.length === 0 &&
    data.reminders.length === 0 &&
    data.study_sessions.length === 0 &&
    data.sticky_notes.length === 0 &&
    data.note_columns.length === 0
  );
}

function contentFingerprint(data: AppData): string {
  return [
    data.subjects.length,
    data.week_blocks.length,
    data.reminders.length,
    data.note_columns.length,
    data.sticky_notes.length,
    data.timers.length,
  ].join(":");
}

const LIVE = { deleted_at: null as null };

export async function loadCloudData(
  supabase: Client,
  userId: string,
): Promise<{ data: AppData; theme: ThemePref; displayName: string | null }> {
  const [
    profileRes,
    subjectsRes,
    blocksRes,
    settingsRes,
    timersRes,
    sessionsRes,
    remindersRes,
    columnsRes,
    stickiesRes,
  ] = await Promise.all([
    supabase.from("profiles").select("display_name, theme").eq("id", userId).maybeSingle(),
    supabase
      .from("subjects")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("cycle_order"),
    supabase
      .from("week_blocks")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("sort_order"),
    supabase.from("session_settings").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("focus_timers")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("sort_order"),
    supabase
      .from("study_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(100),
    supabase
      .from("reminders")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null),
    supabase
      .from("note_columns")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("sort_order"),
    supabase
      .from("sticky_notes")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order("sort_order"),
  ]);

  assertOk("profiles", profileRes.error);
  assertOk("subjects", subjectsRes.error);
  assertOk("week_blocks", blocksRes.error);
  assertOk("session_settings", settingsRes.error);
  assertOk("focus_timers", timersRes.error);
  assertOk("study_sessions", sessionsRes.error);
  assertOk("reminders", remindersRes.error);
  assertOk("note_columns", columnsRes.error);
  assertOk("sticky_notes", stickiesRes.error);

  const defaults = createDefaultData();

  const subjectsRaw: Subject[] = (subjectsRes.data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    status: s.status === "ok" ? "ok" : "prox",
    notes: s.notes ?? "",
    cycle_order: s.cycle_order ?? 0,
    active: s.active ?? true,
    study_days: normalizeStudyDays(s.study_days as number[] | null | undefined),
    study_minutes: normalizeStudyMinutes(s.study_minutes, 25),
  }));
  const subjects: Subject[] = [...subjectsRaw]
    .sort((a, b) => {
      const byOrder = a.cycle_order - b.cycle_order;
      if (byOrder !== 0) return byOrder;
      return a.name.localeCompare(b.name, "pt-BR");
    })
    .map((s, i) => ({ ...s, cycle_order: i }));

  const week_blocks: WeekBlock[] = (blocksRes.data ?? []).map((b) => ({
    id: b.id,
    day: b.day,
    label: b.label,
    type: b.type,
    sort_order: b.sort_order ?? 0,
    color: b.color ?? undefined,
  }));

  const session_settings: SessionSettings = settingsRes.data
    ? {
        focus_minutes: settingsRes.data.focus_minutes,
        break_short_minutes: settingsRes.data.break_short_minutes,
        break_long_minutes: settingsRes.data.break_long_minutes,
      }
    : defaults.session_settings;

  const timers: FocusTimer[] = (timersRes.data ?? []).length
    ? (timersRes.data ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        minutes: t.minutes,
        accent: t.accent ?? "var(--signal)",
        sort_order: t.sort_order ?? 0,
      }))
    : defaults.timers;

  const study_sessions: StudySession[] = (sessionsRes.data ?? []).map((s) => ({
    id: s.id,
    subject_id: s.subject_id,
    subject_name: s.subject_name ?? "",
    started_at: s.started_at,
    ended_at: s.ended_at,
    duration_minutes: s.duration_minutes ?? 0,
    mode: s.mode === "unica" ? "unica" : "ciclo",
    completed: Boolean(s.completed),
  }));

  const reminders: Reminder[] = (remindersRes.data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    notes: r.notes ?? "",
    notify_at: r.notify_at,
    remind_minutes_before: r.remind_minutes_before ?? 10,
    done_at: r.done_at,
    active: r.active ?? true,
    has_alarm: r.has_alarm ?? false,
    color: r.color ?? "#FDE68A",
    font_size: normalizeFontSize(r.font_size),
  }));

  const note_columns: NoteColumn[] = (columnsRes.data ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    color: c.color ?? "#FDE68A",
    sort_order: c.sort_order ?? 0,
  }));

  const sticky_notes: StickyNote[] = (stickiesRes.data ?? []).map((n) => ({
    id: n.id,
    column_id: n.column_id,
    text: n.text ?? "",
    color: n.color ?? "#FDE047",
    sort_order: n.sort_order ?? 0,
  }));

  return {
    data: {
      subjects,
      week_blocks,
      reminders,
      note_columns,
      sticky_notes,
      study_sessions,
      session_settings,
      timers,
    },
    theme: asTheme(profileRes.data?.theme),
    displayName: profileRes.data?.display_name ?? null,
  };
}

/** Soft-delete explícito por id (nunca via save geral). */
export async function softDeleteCloudRows(
  supabase: Client,
  table: SoftDeleteTable,
  userId: string,
  ids: string[],
): Promise<void> {
  const clean = ids.filter(Boolean);
  if (clean.length === 0) return;
  const { error } = await supabase
    .from(table)
    .update({ deleted_at: new Date().toISOString() })
    .eq("user_id", userId)
    .in("id", clean)
    .is("deleted_at", null);
  assertOk(`${table} soft-delete`, error);
}

async function softWipeUserTable(
  supabase: Client,
  table: SoftDeleteTable,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from(table)
    .update({ deleted_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("deleted_at", null);
  assertOk(`${table} soft-wipe`, error);
}

/** Só UPSERT — nunca apaga órfãos. Soft-delete é caminho separado. */
async function upsertCollection(
  supabase: Client,
  table: string,
  rows: Record<string, unknown>[],
  label: string,
): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" });
  assertOk(`${label} upsert`, error);
}

/**
 * Persiste o estado do usuário (UPSERT-ONLY).
 * Não remove linhas remotas que o cliente não conhece — evita wipe multi-device.
 */
export async function saveCloudData(
  supabase: Client,
  userId: string,
  data: AppData,
  theme: ThemePref,
  options: SaveCloudOptions = {},
): Promise<void> {
  const allowEmptyWipe = Boolean(options.allowEmptyWipe);

  const { error: themeError } = await supabase
    .from("profiles")
    .upsert({ id: userId, theme }, { onConflict: "id" });
  if (themeError) {
    console.warn("[foco] falha ao salvar tema na nuvem:", themeError.message);
  }

  const { error: settingsError } = await supabase.from("session_settings").upsert({
    user_id: userId,
    ...data.session_settings,
  });
  assertOk("session_settings upsert", settingsError);

  // Bloqueio: estado vazio nunca sobrescreve nuvem cheia (exceto wipe explícito).
  if (!allowEmptyWipe && isCloudDataEmpty(data)) {
    const remote = await loadCloudData(supabase, userId);
    if (!isCloudDataEmpty(remote.data)) {
      console.warn(
        "[foco] save vazio bloqueado — nuvem ainda tem dados:",
        contentFingerprint(remote.data),
      );
      return;
    }
  }

  if (allowEmptyWipe) {
    await softWipeUserTable(supabase, "sticky_notes", userId);
    await softWipeUserTable(supabase, "note_columns", userId);
    await softWipeUserTable(supabase, "subjects", userId);
    await softWipeUserTable(supabase, "week_blocks", userId);
    await softWipeUserTable(supabase, "reminders", userId);
    await softWipeUserTable(supabase, "focus_timers", userId);
  }

  await upsertCollection(
    supabase,
    "subjects",
    data.subjects.map((s) => ({
      id: s.id,
      user_id: userId,
      name: s.name,
      status: s.status,
      notes: s.notes,
      cycle_order: s.cycle_order,
      active: s.active,
      study_days: normalizeStudyDays(s.study_days),
      study_minutes: normalizeStudyMinutes(s.study_minutes, 25),
      ...LIVE,
    })),
    "subjects",
  );

  await upsertCollection(
    supabase,
    "week_blocks",
    data.week_blocks.map((b) => ({
      id: b.id,
      user_id: userId,
      day: b.day,
      label: b.label,
      type: b.type,
      sort_order: b.sort_order,
      color: b.color ?? null,
      ...LIVE,
    })),
    "week_blocks",
  );

  await upsertCollection(
    supabase,
    "reminders",
    data.reminders.map((r) => ({
      id: r.id,
      user_id: userId,
      title: r.title,
      notes: r.notes,
      notify_at: r.notify_at,
      remind_minutes_before: r.remind_minutes_before,
      done_at: r.done_at,
      active: r.active,
      has_alarm: r.has_alarm,
      color: r.color,
      font_size: r.font_size ?? 0,
      ...LIVE,
    })),
    "reminders",
  );

  await upsertCollection(
    supabase,
    "note_columns",
    data.note_columns.map((c) => ({
      id: c.id,
      user_id: userId,
      title: c.title,
      color: c.color,
      sort_order: c.sort_order,
      ...LIVE,
    })),
    "note_columns",
  );

  await upsertCollection(
    supabase,
    "sticky_notes",
    data.sticky_notes.map((n) => ({
      id: n.id,
      user_id: userId,
      column_id: n.column_id,
      text: n.text,
      color: n.color,
      sort_order: n.sort_order,
      ...LIVE,
    })),
    "sticky_notes",
  );

  await upsertCollection(
    supabase,
    "focus_timers",
    data.timers.map((t) => ({
      id: t.id,
      user_id: userId,
      name: t.name,
      minutes: t.minutes,
      accent: t.accent,
      sort_order: t.sort_order,
      ...LIVE,
    })),
    "focus_timers",
  );

  if (data.study_sessions.length) {
    const { error } = await supabase.from("study_sessions").upsert(
      data.study_sessions.slice(0, 100).map((s) => ({
        id: s.id,
        user_id: userId,
        subject_id: s.subject_id,
        subject_name: s.subject_name,
        started_at: s.started_at,
        ended_at: s.ended_at,
        duration_minutes: s.duration_minutes,
        mode: s.mode,
        completed: s.completed,
      })),
      { onConflict: "id" },
    );
    assertOk("study_sessions upsert", error);
  }
}
