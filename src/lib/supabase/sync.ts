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
  await supabase
    .from("profiles")
    .upsert({ id: userId, theme }, { onConflict: "id" });

  await supabase.from("session_settings").upsert({
    user_id: userId,
    ...data.session_settings,
  });

  await supabase.from("sticky_notes").delete().eq("user_id", userId);
  await supabase.from("note_columns").delete().eq("user_id", userId);
  await supabase.from("subjects").delete().eq("user_id", userId);
  await supabase.from("week_blocks").delete().eq("user_id", userId);
  await supabase.from("reminders").delete().eq("user_id", userId);
  await supabase.from("focus_timers").delete().eq("user_id", userId);
  await supabase.from("study_sessions").delete().eq("user_id", userId);

  if (data.subjects.length) {
    await supabase.from("subjects").insert(
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
  }

  if (data.week_blocks.length) {
    await supabase.from("week_blocks").insert(
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
  }

  if (data.reminders.length) {
    await supabase.from("reminders").insert(
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
  }

  if (data.note_columns.length) {
    await supabase.from("note_columns").insert(
      data.note_columns.map((c) => ({
        id: c.id,
        user_id: userId,
        title: c.title,
        color: c.color,
        sort_order: c.sort_order,
      })),
    );
  }

  if (data.sticky_notes.length) {
    await supabase.from("sticky_notes").insert(
      data.sticky_notes.map((n) => ({
        id: n.id,
        user_id: userId,
        column_id: n.column_id,
        text: n.text,
        color: n.color,
        sort_order: n.sort_order,
      })),
    );
  }

  if (data.timers.length) {
    await supabase.from("focus_timers").insert(
      data.timers.map((t) => ({
        id: t.id,
        user_id: userId,
        name: t.name,
        minutes: t.minutes,
        accent: t.accent,
        sort_order: t.sort_order,
      })),
    );
  }

  if (data.study_sessions.length) {
    await supabase.from("study_sessions").upsert(
      data.study_sessions.slice(0, 50).map((s) => ({
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
  }
}
