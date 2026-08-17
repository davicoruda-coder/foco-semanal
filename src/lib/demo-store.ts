import type { AppData } from "./types";

function id(_prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${_prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createDefaultData(): AppData {
  return {
    subjects: [],
    week_blocks: [],
    reminders: [],
    note_columns: [],
    sticky_notes: [],
    study_sessions: [],
    session_settings: {
      focus_minutes: 40,
      break_short_minutes: 5,
      break_long_minutes: 10,
    },
    timers: [
      {
        id: id("tmr"),
        name: "Sessão",
        minutes: 40,
        accent: "var(--signal)",
        sort_order: 0,
      },
      {
        id: id("tmr"),
        name: "Estudo",
        minutes: 10,
        accent: "var(--accent-2)",
        sort_order: 1,
      },
    ],
  };
}

const STORAGE_KEY = "foco_semanal_data_v1";
const AUTH_KEY = "foco_semanal_demo_user";
const GUEST_KEY = "foco_semanal_guest";
/** Após magic link, sobe os dados locais para a nuvem uma vez. */
export const MIGRATE_LOCAL_KEY = "foco_semanal_migrate_local";

export function isGuestMode() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(GUEST_KEY) === "1";
}

export function setGuestMode(enabled: boolean) {
  if (typeof window === "undefined") return;
  if (enabled) localStorage.setItem(GUEST_KEY, "1");
  else localStorage.removeItem(GUEST_KEY);
}

export function markMigrateLocalOnNextCloudLogin() {
  if (typeof window === "undefined") return;
  localStorage.setItem(MIGRATE_LOCAL_KEY, "1");
}

export function consumeMigrateLocalFlag(): boolean {
  if (typeof window === "undefined") return false;
  const on = localStorage.getItem(MIGRATE_LOCAL_KEY) === "1";
  if (on) localStorage.removeItem(MIGRATE_LOCAL_KEY);
  return on;
}

export function loadDemoData(): AppData {
  if (typeof window === "undefined") return createDefaultData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const data = createDefaultData();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data;
    }
    const data = JSON.parse(raw) as AppData;
    // Migra status antigo "aguard" → "prox"
    data.subjects = (data.subjects ?? []).map((s) => ({
      ...s,
      status: s.status === "ok" ? "ok" : "prox",
    }));
    const colors = ["#FDE68A", "#A7F3D0", "#FBCFE8", "#BFDBFE", "#FECACA"];
    data.reminders = (data.reminders ?? []).map((r, i) => ({
      ...r,
      has_alarm: r.has_alarm ?? true,
      color: r.color ?? colors[i % colors.length],
    }));
    if (!data.timers?.length) {
      const s = data.session_settings ?? {
        focus_minutes: 40,
        break_short_minutes: 5,
        break_long_minutes: 10,
      };
      data.timers = [
        {
          id: id("tmr"),
          name: "Sessão",
          minutes: s.focus_minutes ?? 40,
          accent: "var(--signal)",
          sort_order: 0,
        },
        {
          id: id("tmr"),
          name: "Estudo",
          minutes: s.break_long_minutes ?? 10,
          accent: "var(--accent-2)",
          sort_order: 1,
        },
      ];
    }
    return data;
  } catch {
    return createDefaultData();
  }
}

export function saveDemoData(data: AppData) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getDemoUser(): { id: string; email: string; name: string } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setDemoUser(user: { id: string; email: string; name: string } | null) {
  if (typeof window === "undefined") return;
  if (!user) localStorage.removeItem(AUTH_KEY);
  else localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

export function newId(prefix: string) {
  return id(prefix);
}
