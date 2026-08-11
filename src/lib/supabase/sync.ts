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

type Client = SupabaseClient;

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
    supabase.from("subjects").select("*").eq("user_id", userId).order("cycle_order"),
    supabase.from("week_blocks").select("*").eq("user_id", userId).order("sort_order"),
    supabase.from("session_settings").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("focus_timers").select("*").eq("user_id", userId).order("sort_order"),
    supabase
      .from("study_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(100),
    supabase.from("reminders").select("*").eq("user_id", userId),
    supabase.from("note_columns").select("*").eq("user_id", userId).order("sort_order"),
    supabase.from("sticky_notes").select("*").eq("user_id", userId).order("sort_order"),
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

  const subjects: Subject[] = (subjectsRes.data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    status: s.status === "ok" ? "ok" : "prox",
    notes: s.notes ?? "",
    cycle_order: s.cycle_order ?? 0,
    active: s.active ?? true,
  }));

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

/** Persiste o estado completo do usuário (replace por coleção). */
export async function saveCloudData(
  supabase: Client,
  userId: string,
  data: AppData,
  theme: ThemePref,
): Promise<void> {
  const { error: themeError } = await supabase
    .from("profiles")
    .upsert({ id: userId, theme }, { onConflict: "id" });
  if (themeError) {
    // Banco antigo pode rejeitar "auto"; não bloqueia o restante do save.
    console.warn("[foco] falha ao salvar tema na nuvem:", themeError.message);
  }

  const { error: settingsError } = await supabase.from("session_settings").upsert({
    user_id: userId,
    ...data.session_settings,
  });
  assertOk("session_settings upsert", settingsError);

  // study_sessions: upsert only (não apaga histórico remoto além do que sincronizamos)
  const deletes = await Promise.all([
    supabase.from("sticky_notes").delete().eq("user_id", userId),
    supabase.from("note_columns").delete().eq("user_id", userId),
    supabase.from("subjects").delete().eq("user_id", userId),
    supabase.from("week_blocks").delete().eq("user_id", userId),
    supabase.from("reminders").delete().eq("user_id", userId),
    supabase.from("focus_timers").delete().eq("user_id", userId),
  ]);
  for (const res of deletes) {
    assertOk("delete collection", res.error);
  }

  if (data.subjects.length) {
    const { error } = await supabase.from("subjects").insert(
      data.subjects.map((s) => ({
        id: s.id,
        user_id: userId,
        name: s.name,
        status: s.status,
        notes: s.notes,
        cycle_order: s.cycle_order,
        active: s.active,
      })),
    );
    assertOk("subjects insert", error);
  }

  if (data.week_blocks.length) {
    const { error } = await supabase.from("week_blocks").insert(
      data.week_blocks.map((b) => ({
        id: b.id,
        user_id: userId,
        day: b.day,
        label: b.label,
        type: b.type,
        sort_order: b.sort_order,
        color: b.color ?? null,
      })),
    );
    assertOk("week_blocks insert", error);
  }

  if (data.reminders.length) {
    const { error } = await supabase.from("reminders").insert(
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
      })),
    );
    assertOk("reminders insert", error);
  }

  if (data.note_columns.length) {
    const { error } = await supabase.from("note_columns").insert(
      data.note_columns.map((c) => ({
        id: c.id,
        user_id: userId,
        title: c.title,
        color: c.color,
        sort_order: c.sort_order,
      })),
    );
    assertOk("note_columns insert", error);
  }

  if (data.sticky_notes.length) {
    const { error } = await supabase.from("sticky_notes").insert(
      data.sticky_notes.map((n) => ({
        id: n.id,
        user_id: userId,
        column_id: n.column_id,
        text: n.text,
        color: n.color,
        sort_order: n.sort_order,
      })),
    );
    assertOk("sticky_notes insert", error);
  }

  if (data.timers.length) {
    const { error } = await supabase.from("focus_timers").insert(
      data.timers.map((t) => ({
        id: t.id,
        user_id: userId,
        name: t.name,
        minutes: t.minutes,
        accent: t.accent,
        sort_order: t.sort_order,
      })),
    );
    assertOk("focus_timers insert", error);
  }

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
