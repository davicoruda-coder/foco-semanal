import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/env";
import {
  commitFocusDisplaySnapshot,
  loadFocusLog,
  mergeFocusLogs,
  saveFocusLog,
  type FocusLog,
} from "@/lib/focus-log";

type FocusDayRow = {
  day: string;
  seconds: number;
  by_hour: number[] | null;
};

function normalizeHours(raw: number[] | null | undefined): number[] {
  return Array.from({ length: 24 }, (_, i) =>
    Math.max(0, Math.floor(Number(raw?.[i] ?? 0) || 0)),
  );
}

function rowsToLog(rows: FocusDayRow[]): FocusLog {
  const days: FocusLog["days"] = {};
  for (const row of rows) {
    const key = String(row.day).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
    const byHour = normalizeHours(row.by_hour);
    days[key] = {
      byHour,
      seconds: Math.max(
        0,
        Math.floor(row.seconds) || byHour.reduce((s, n) => s + n, 0),
      ),
    };
  }
  return { version: 1, days };
}

async function getAuthedClient(): Promise<{
  supabase: SupabaseClient;
  userId: string;
} | null> {
  if (!isSupabaseConfigured()) return null;
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { supabase, userId: data.user.id };
}

async function fetchRemoteLog(
  supabase: SupabaseClient,
  userId: string,
): Promise<FocusLog> {
  const { data, error } = await supabase
    .from("focus_days")
    .select("day, seconds, by_hour")
    .eq("user_id", userId);
  if (error) throw new Error(`[foco] focus_days: ${error.message}`);
  return rowsToLog((data ?? []) as FocusDayRow[]);
}

async function upsertLog(
  supabase: SupabaseClient,
  userId: string,
  log: FocusLog,
) {
  const rows = Object.entries(log.days).map(([day, d]) => ({
    user_id: userId,
    day,
    seconds: Math.max(0, Math.floor(d.seconds)),
    by_hour: normalizeHours(d.byHour),
    updated_at: new Date().toISOString(),
  }));
  if (!rows.length) return;
  const { error } = await supabase.from("focus_days").upsert(rows, {
    onConflict: "user_id,day",
  });
  if (error) throw new Error(`[foco] focus_days upsert: ${error.message}`);
}

/**
 * Mescla local + nuvem, grava no aparelho (log + snapshot Foco hoje) e envia de volta.
 * Usar ao abrir Estatísticas ou ao pausar/finalizar Sessão/Cronômetro.
 */
export async function syncFocusLogWithCloud(): Promise<FocusLog> {
  const local = loadFocusLog();
  const auth = await getAuthedClient();
  if (!auth) {
    return commitFocusDisplaySnapshot(local);
  }

  try {
    const remote = await fetchRemoteLog(auth.supabase, auth.userId);
    const merged = mergeFocusLogs(local, remote);
    saveFocusLog(merged);
    commitFocusDisplaySnapshot(merged);
    await upsertLog(auth.supabase, auth.userId, merged);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("foco-focus-log"));
    }
    return merged;
  } catch (err) {
    console.warn("[foco] sync focus_days falhou", err);
    return commitFocusDisplaySnapshot(local);
  }
}

/** Apaga o histórico de foco na nuvem (após reset local). */
export async function clearFocusLogCloud(): Promise<void> {
  const auth = await getAuthedClient();
  if (!auth) return;
  const { error } = await auth.supabase
    .from("focus_days")
    .delete()
    .eq("user_id", auth.userId);
  if (error) {
    console.warn("[foco] clear focus_days falhou", error.message);
  }
}
