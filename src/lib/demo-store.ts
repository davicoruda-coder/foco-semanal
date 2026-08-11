import type { AppData } from "./types";

function id(_prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${_prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createDefaultData(): AppData {
  const colFaculdade = id("col");
  const colPython = id("col");
  const colProjetos = id("col");
  const colGeral = id("col");

  return {
    subjects: [
      {
        id: id("sub"),
        name: "Faculdade",
        status: "prox",
        notes: "4 Semestre",
        cycle_order: 0,
        active: true,
      },
      {
        id: id("sub"),
        name: "Python",
        status: "ok",
        notes: "Revisão Teste 3: Sobre int, float e bool - depois continuar do video 35",
        cycle_order: 1,
        active: true,
      },
      {
        id: id("sub"),
        name: "Projetos",
        status: "prox",
        notes: "Projeto Sistema Estudo",
        cycle_order: 2,
        active: true,
      },
    ],
    week_blocks: [
      ...[0, 1, 2, 3, 4].map((day) => ({
        id: id("blk"),
        day,
        label: "Trabalho",
        type: "trabalho" as const,
        sort_order: 0,
      })),
      {
        id: id("blk"),
        day: 2,
        label: "Reunião",
        type: "reuniao",
        sort_order: 1,
      },
      {
        id: id("blk"),
        day: 5,
        label: "Trabalho",
        type: "trabalho",
        sort_order: 0,
      },
      {
        id: id("blk"),
        day: 5,
        label: "Estudo",
        type: "estudo",
        sort_order: 1,
      },
      {
        id: id("blk"),
        day: 5,
        label: "Reunião",
        type: "reuniao",
        sort_order: 2,
      },
      {
        id: id("blk"),
        day: 6,
        label: "Campo",
        type: "pessoal",
        sort_order: 0,
      },
      {
        id: id("blk"),
        day: 6,
        label: "Estudo",
        type: "estudo",
        sort_order: 1,
      },
      {
        id: id("blk"),
        day: 6,
        label: "Estudo",
        type: "estudo",
        sort_order: 2,
      },
      {
        id: id("blk"),
        day: 6,
        label: "L. banheiro",
        type: "pessoal",
        sort_order: 3,
      },
      {
        id: id("blk"),
        day: 6,
        label: "Est. Família",
        type: "estudo",
        sort_order: 4,
      },
    ],
    reminders: [],
    note_columns: [
      { id: colFaculdade, title: "Faculdade", color: "#99F6E4", sort_order: 0 },
      { id: colPython, title: "Python", color: "#FDE68A", sort_order: 1 },
      { id: colProjetos, title: "Projetos", color: "#FBCFE8", sort_order: 2 },
      { id: colGeral, title: "Geral", color: "#BBF7D0", sort_order: 3 },
    ],
    sticky_notes: [
      {
        id: id("note"),
        column_id: colPython,
        text: "Revisar vídeo 20",
        color: "#FDE047",
        sort_order: 0,
      },
      {
        id: id("note"),
        column_id: colProjetos,
        text: "Sistema Foco Semanal",
        color: "#67E8F9",
        sort_order: 0,
      },
    ],
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
        name: "Estudo 1",
        minutes: 10,
        accent: "var(--accent-2)",
        sort_order: 1,
      },
      {
        id: id("tmr"),
        name: "Estudo 2",
        minutes: 5,
        accent: "var(--warn)",
        sort_order: 2,
      },
    ],
    music_settings: {
      source: "none",
      drive_folder_id: null,
      drive_folder_name: null,
      local_folder_name: null,
    },
    music_day_map: [],
  };
}

const STORAGE_KEY = "foco_semanal_data_v1";
const AUTH_KEY = "foco_semanal_demo_user";
const GUEST_KEY = "foco_semanal_guest";

export function isGuestMode() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(GUEST_KEY) === "1";
}

export function setGuestMode(enabled: boolean) {
  if (typeof window === "undefined") return;
  if (enabled) localStorage.setItem(GUEST_KEY, "1");
  else localStorage.removeItem(GUEST_KEY);
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
          name: "Estudo 1",
          minutes: s.break_long_minutes ?? 10,
          accent: "var(--accent-2)",
          sort_order: 1,
        },
        {
          id: id("tmr"),
          name: "Estudo 2",
          minutes: s.break_short_minutes ?? 5,
          accent: "var(--warn)",
          sort_order: 2,
        },
      ];
    }
    const ms = data.music_settings ?? createDefaultData().music_settings;
    const rawSource = (ms as { source?: string }).source;
    data.music_settings = {
      source:
        rawSource === "local" || rawSource === "drive"
          ? rawSource
          : "none",
      drive_folder_id: ms.drive_folder_id ?? null,
      drive_folder_name: ms.drive_folder_name ?? null,
      local_folder_name: ms.local_folder_name ?? null,
    };
    data.music_day_map = (data.music_day_map ?? []).map((m) => ({
      day: m.day,
      file_id:
        (m as { file_id?: string; drive_file_id?: string }).file_id ??
        (m as { drive_file_id?: string }).drive_file_id ??
        m.file_name,
      file_name: m.file_name,
    }));
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
