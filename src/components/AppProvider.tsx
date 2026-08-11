"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  consumeMigrateLocalFlag,
  createDefaultData,
  getDemoUser,
  loadDemoData,
  newId,
  saveDemoData,
  setDemoUser,
  setGuestMode,
} from "@/lib/demo-store";
import { isSupabaseConfigured } from "@/lib/env";
import { loadCloudData, saveCloudData } from "@/lib/supabase/sync";
import type {
  AppData,
  FocusTimer,
  NoteColumn,
  Reminder,
  SessionSettings,
  StickyNote,
  StudySession,
  Subject,
  SubjectStatus,
  Theme,
  ThemePref,
  WeekBlock,
} from "@/lib/types";

type User = { id: string; email: string; name: string };

const THEME_KEY = "foco_semanal_theme";

/** No modo auto: claro das 6h às 17h59, escuro à noite. */
function resolveTheme(pref: ThemePref): Theme {
  if (pref !== "auto") return pref;
  const h = new Date().getHours();
  return h >= 6 && h < 18 ? "light" : "dark";
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}

function getStoredPref(): ThemePref {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark" || stored === "auto") {
    return stored;
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

type AppContextValue = {
  ready: boolean;
  user: User | null;
  data: AppData;
  /** true = logado via Supabase (dados na nuvem) */
  cloud: boolean;
  supabaseReady: boolean;
  theme: Theme;
  themePref: ThemePref;
  setTheme: (pref: ThemePref) => void;
  loginDemo: (name?: string, email?: string) => void;
  logout: () => void;
  setData: (updater: (prev: AppData) => AppData) => void;
  upsertSubject: (subject: Partial<Subject> & { name: string }) => void;
  /** Marca status; se for Ok no último do ciclo, todos voltam pra Próx. */
  setSubjectStatus: (id: string, status: SubjectStatus) => void;
  deleteSubject: (id: string) => void;
  upsertWeekBlock: (block: Partial<WeekBlock> & { day: number; label: string }) => void;
  deleteWeekBlock: (id: string) => void;
  upsertReminder: (
    reminder: Partial<Reminder> & { title: string; notify_at?: string },
  ) => void;
  deleteReminder: (id: string) => void;
  upsertColumn: (col: Partial<NoteColumn> & { title: string }) => void;
  upsertSticky: (note: Partial<StickyNote> & { column_id: string }) => void;
  deleteSticky: (id: string) => void;
  updateSettings: (settings: Partial<SessionSettings>) => void;
  upsertTimer: (timer: Partial<FocusTimer> & { name: string; minutes: number }) => void;
  deleteTimer: (id: string) => void;
  addStudySession: (session: Omit<StudySession, "id">) => void;
  exportBackup: () => string;
  importBackup: (json: string) => { ok: true } | { ok: false; error: string };
  resetDemoData: () => void;
  /** Zera dados na nuvem (e neste aparelho). Só com sessão cloud. */
  resetCloudData: () => Promise<{ ok: true } | { ok: false; error: string }>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [cloud, setCloud] = useState(false);
  const [data, setDataState] = useState<AppData>(() => createDefaultData());
  const [themePref, setThemePrefState] = useState<ThemePref>("light");
  const [theme, setThemeState] = useState<Theme>("light");
  const cloudRef = useRef(false);
  const userIdRef = useRef<string | null>(null);
  const themeRef = useRef<ThemePref>("light");
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    themeRef.current = themePref;
  }, [themePref]);

  // No modo auto, re-avalia periodicamente para trocar ao anoitecer/amanhecer.
  useEffect(() => {
    if (themePref !== "auto") return;
    const tick = () => {
      const next = resolveTheme("auto");
      setThemeState((prev) => {
        if (prev !== next) applyTheme(next);
        return next;
      });
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [themePref]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const initialPref = getStoredPref();
      setThemePrefState(initialPref);
      setThemeState(resolveTheme(initialPref));
      applyTheme(resolveTheme(initialPref));

      if (isSupabaseConfigured()) {
        try {
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          const { data: sessionData } = await supabase.auth.getSession();
          const session = sessionData.session;

          if (session?.user && !cancelled) {
            const uid = session.user.id;
            const localSnapshot = loadDemoData();
            const localPref = getStoredPref();
            const migrate = consumeMigrateLocalFlag();

            if (migrate) {
              try {
                await saveCloudData(supabase, uid, localSnapshot, localPref);
              } catch {
                /* still continue with local snapshot */
              }
              if (cancelled) return;
              setCloud(true);
              cloudRef.current = true;
              userIdRef.current = uid;
              setUser({
                id: uid,
                email: session.user.email ?? "",
                name:
                  session.user.user_metadata?.full_name ||
                  session.user.email ||
                  "Usuário",
              });
              setDataState(localSnapshot);
              setThemePrefState(localPref);
              setThemeState(resolveTheme(localPref));
              applyTheme(resolveTheme(localPref));
              setDemoUser(null);
              setGuestMode(false);
              setReady(true);
              return;
            }

            const loaded = await loadCloudData(supabase, uid);
            if (cancelled) return;
            setCloud(true);
            cloudRef.current = true;
            userIdRef.current = uid;
            setUser({
              id: uid,
              email: session.user.email ?? "",
              name:
                loaded.displayName ||
                session.user.user_metadata?.full_name ||
                session.user.email ||
                "Usuário",
            });
            setDataState(loaded.data);
            setThemePrefState(loaded.theme);
            setThemeState(resolveTheme(loaded.theme));
            applyTheme(resolveTheme(loaded.theme));
            localStorage.setItem(THEME_KEY, loaded.theme);
            setDemoUser(null);
            setGuestMode(false);
            setReady(true);
            return;
          }
        } catch {
          /* cai no local */
        }
      }

      if (cancelled) return;
      // Sem sessão: entra direto no modo local deste aparelho.
      setCloud(false);
      cloudRef.current = false;
      userIdRef.current = null;
      setGuestMode(true);
      let local = getDemoUser();
      if (
        !local ||
        local.email === "demo@foco.local" ||
        local.name === "Demo"
      ) {
        local = {
          id: local?.id ?? newId("user"),
          name: "Você",
          email: "neste aparelho",
        };
        setDemoUser(local);
      }
      setUser(local);
      setDataState(loadDemoData());
      setReady(true);
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistCloud = useCallback((next: AppData, nextTheme: ThemePref) => {
    if (!cloudRef.current || !userIdRef.current) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void (async () => {
        try {
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          await saveCloudData(
            supabase,
            userIdRef.current!,
            next,
            nextTheme,
          );
        } catch {
          /* ignore transient errors */
        }
      })();
    }, 600);
  }, []);

  const setTheme = useCallback(
    (next: ThemePref) => {
      setThemePrefState(next);
      const resolved = resolveTheme(next);
      setThemeState(resolved);
      applyTheme(resolved);
      localStorage.setItem(THEME_KEY, next);
      themeRef.current = next;
      if (cloudRef.current) {
        setDataState((prev) => {
          persistCloud(prev, next);
          return prev;
        });
      }
    },
    [persistCloud],
  );

  const setData = useCallback(
    (updater: (prev: AppData) => AppData) => {
      setDataState((prev) => {
        const next = updater(prev);
        if (cloudRef.current) {
          persistCloud(next, themeRef.current);
        } else {
          saveDemoData(next);
        }
        return next;
      });
    },
    [persistCloud],
  );

  const loginDemo = useCallback((name?: string, email?: string) => {
    cloudRef.current = false;
    userIdRef.current = null;
    setCloud(false);
    setGuestMode(true);
    if (isSupabaseConfigured()) {
      void import("@/lib/supabase/client").then(({ createClient }) => {
        void createClient().auth.signOut();
      });
    }
    const existing = getDemoUser();
    const u = {
      id: existing?.id ?? newId("user"),
      email: email?.trim() || existing?.email || "neste aparelho",
      name: name?.trim() || existing?.name || "Você",
    };
    setDemoUser(u);
    setUser(u);
    const next = loadDemoData();
    setDataState(next);
    saveDemoData(next);
  }, []);

  /** Sai da nuvem e volta ao modo local neste aparelho. */
  const logout = useCallback(() => {
    cloudRef.current = false;
    userIdRef.current = null;
    setCloud(false);
    if (isSupabaseConfigured()) {
      void import("@/lib/supabase/client").then(({ createClient }) => {
        void createClient().auth.signOut();
      });
    }
    setGuestMode(true);
    const existing = getDemoUser();
    const u = {
      id: existing?.id ?? newId("user"),
      email: existing?.email || "neste aparelho",
      name: existing?.name || "Você",
    };
    setDemoUser(u);
    setUser(u);
    setDataState(loadDemoData());
  }, []);

  const exportBackup = useCallback(() => {
    return JSON.stringify(
      {
        version: 1,
        exported_at: new Date().toISOString(),
        theme: themePref,
        user,
        data,
      },
      null,
      2,
    );
  }, [themePref, user, data]);

  const importBackup = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json) as {
        data?: AppData;
        theme?: ThemePref;
        user?: User | null;
      };
      if (!parsed?.data || !Array.isArray(parsed.data.subjects)) {
        return { ok: false as const, error: "Arquivo inválido: falta data.subjects." };
      }
      const imported: AppData = {
        ...createDefaultData(),
        ...parsed.data,
        subjects: parsed.data.subjects ?? [],
        week_blocks: parsed.data.week_blocks ?? [],
        reminders: parsed.data.reminders ?? [],
        note_columns: parsed.data.note_columns ?? [],
        sticky_notes: parsed.data.sticky_notes ?? [],
        study_sessions: parsed.data.study_sessions ?? [],
        session_settings:
          parsed.data.session_settings ?? createDefaultData().session_settings,
        timers: parsed.data.timers?.length
          ? parsed.data.timers
          : createDefaultData().timers,
      };
      saveDemoData(imported);
      setDataState(imported);
      if (
        parsed.theme === "light" ||
        parsed.theme === "dark" ||
        parsed.theme === "auto"
      ) {
        setTheme(parsed.theme);
      }
      if (parsed.user) {
        setDemoUser(parsed.user);
        setUser(parsed.user);
      }
      return { ok: true as const };
    } catch {
      return { ok: false as const, error: "JSON inválido." };
    }
  }, [setTheme]);

  const resetDemoData = useCallback(() => {
    if (cloudRef.current) return;
    const fresh = createDefaultData();
    saveDemoData(fresh);
    setDataState(fresh);
  }, []);

  const resetCloudData = useCallback(async () => {
    if (!cloudRef.current || !userIdRef.current || !isSupabaseConfigured()) {
      return { ok: false as const, error: "Nuvem não conectada." };
    }
    if (saveTimer.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const fresh = createDefaultData();
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await saveCloudData(
        supabase,
        userIdRef.current,
        fresh,
        themeRef.current,
      );
      setDataState(fresh);
      saveDemoData(fresh);
      return { ok: true as const };
    } catch {
      return { ok: false as const, error: "Não foi possível apagar na nuvem." };
    }
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      user,
      data,
      cloud,
      supabaseReady: isSupabaseConfigured(),
      theme,
      themePref,
      setTheme,
      loginDemo,
      logout,
      setData,
      upsertSubject: (subject) => {
        setData((prev) => {
          if (subject.id) {
            return {
              ...prev,
              subjects: prev.subjects.map((s) =>
                s.id === subject.id ? { ...s, ...subject } : s,
              ),
            };
          }
          const row: Subject = {
            id: newId("sub"),
            name: subject.name,
            status: subject.status ?? "prox",
            notes: subject.notes ?? "",
            cycle_order: subject.cycle_order ?? prev.subjects.length,
            active: subject.active ?? true,
          };
          return { ...prev, subjects: [...prev.subjects, row] };
        });
      },
      setSubjectStatus: (id, status) => {
        setData((prev) => {
          const ordered = [...prev.subjects]
            .filter((s) => s.active)
            .sort((a, b) => a.cycle_order - b.cycle_order);
          const idx = ordered.findIndex((s) => s.id === id);
          if (idx < 0) return prev;

          if (status !== "ok") {
            return {
              ...prev,
              subjects: prev.subjects.map((s) =>
                s.id === id ? { ...s, status } : s,
              ),
            };
          }

          // Último Ok do ciclo → todos voltam pra Próx.
          if (idx === ordered.length - 1) {
            return {
              ...prev,
              subjects: prev.subjects.map((s) =>
                s.active ? { ...s, status: "prox" as const } : s,
              ),
            };
          }

          // Ok no meio → esta Ok; próxima vira Próx.
          const next = ordered[idx + 1];
          return {
            ...prev,
            subjects: prev.subjects.map((s) => {
              if (s.id === id) return { ...s, status: "ok" };
              if (next && s.id === next.id) return { ...s, status: "prox" };
              return s;
            }),
          };
        });
      },
      deleteSubject: (id) =>
        setData((prev) => ({
          ...prev,
          subjects: prev.subjects.filter((s) => s.id !== id),
        })),
      upsertWeekBlock: (block) => {
        setData((prev) => {
          if (block.id) {
            return {
              ...prev,
              week_blocks: prev.week_blocks.map((b) =>
                b.id === block.id ? { ...b, ...block } : b,
              ),
            };
          }
          const row: WeekBlock = {
            id: newId("blk"),
            day: block.day,
            label: block.label,
            type: block.type ?? "outro",
            color: block.color,
            sort_order:
              block.sort_order ??
              prev.week_blocks.filter((b) => b.day === block.day).length,
          };
          return { ...prev, week_blocks: [...prev.week_blocks, row] };
        });
      },
      deleteWeekBlock: (id) =>
        setData((prev) => ({
          ...prev,
          week_blocks: prev.week_blocks.filter((b) => b.id !== id),
        })),
      upsertReminder: (reminder) => {
        setData((prev) => {
          if (reminder.id) {
            return {
              ...prev,
              reminders: prev.reminders.map((r) =>
                r.id === reminder.id ? { ...r, ...reminder } : r,
              ),
            };
          }
          const colors = ["#FDE68A", "#A7F3D0", "#FBCFE8", "#BFDBFE", "#FECACA"];
          const row: Reminder = {
            id: newId("rem"),
            title: reminder.title,
            notes: reminder.notes ?? "",
            notify_at:
              reminder.notify_at ??
              new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            remind_minutes_before: reminder.remind_minutes_before ?? 0,
            done_at: reminder.done_at ?? null,
            active: reminder.active ?? true,
            has_alarm: reminder.has_alarm ?? Boolean(reminder.notify_at),
            color:
              reminder.color ??
              colors[prev.reminders.length % colors.length],
          };
          return { ...prev, reminders: [...prev.reminders, row] };
        });
      },
      deleteReminder: (id) =>
        setData((prev) => ({
          ...prev,
          reminders: prev.reminders.filter((r) => r.id !== id),
        })),
      upsertColumn: (col) => {
        setData((prev) => {
          if (col.id) {
            return {
              ...prev,
              note_columns: prev.note_columns.map((c) =>
                c.id === col.id ? { ...c, ...col } : c,
              ),
            };
          }
          const row: NoteColumn = {
            id: newId("col"),
            title: col.title,
            color: col.color ?? "#FDE68A",
            sort_order: col.sort_order ?? prev.note_columns.length,
          };
          return { ...prev, note_columns: [...prev.note_columns, row] };
        });
      },
      upsertSticky: (note) => {
        setData((prev) => {
          if (note.id) {
            return {
              ...prev,
              sticky_notes: prev.sticky_notes.map((n) =>
                n.id === note.id ? { ...n, ...note } : n,
              ),
            };
          }
          const row: StickyNote = {
            id: newId("note"),
            column_id: note.column_id,
            text: note.text ?? "",
            color: note.color ?? "#FDE047",
            sort_order:
              note.sort_order ??
              prev.sticky_notes.filter((n) => n.column_id === note.column_id)
                .length,
          };
          return { ...prev, sticky_notes: [...prev.sticky_notes, row] };
        });
      },
      deleteSticky: (id) =>
        setData((prev) => ({
          ...prev,
          sticky_notes: prev.sticky_notes.filter((n) => n.id !== id),
        })),
      updateSettings: (settings) =>
        setData((prev) => ({
          ...prev,
          session_settings: { ...prev.session_settings, ...settings },
        })),
      upsertTimer: (timer) => {
        setData((prev) => {
          const accents = [
            "var(--signal)",
            "var(--accent-2)",
            "var(--warn)",
            "#8B5CF6",
            "#EC4899",
            "#0EA5E9",
          ];
          if (timer.id) {
            return {
              ...prev,
              timers: prev.timers.map((t) =>
                t.id === timer.id ? { ...t, ...timer } : t,
              ),
            };
          }
          const row: FocusTimer = {
            id: newId("tmr"),
            name: timer.name,
            minutes: Math.max(1, timer.minutes),
            accent: timer.accent ?? accents[prev.timers.length % accents.length],
            sort_order: timer.sort_order ?? prev.timers.length,
          };
          return { ...prev, timers: [...prev.timers, row] };
        });
      },
      deleteTimer: (id) =>
        setData((prev) => ({
          ...prev,
          timers: prev.timers
            .filter((t) => t.id !== id)
            .map((t, i) => ({ ...t, sort_order: i })),
        })),
      addStudySession: (session) =>
        setData((prev) => ({
          ...prev,
          study_sessions: [
            { ...session, id: newId("sess") },
            ...prev.study_sessions,
          ],
        })),
      exportBackup,
      importBackup,
      resetDemoData,
      resetCloudData,
    }),
    [
      ready,
      user,
      data,
      cloud,
      theme,
      themePref,
      setTheme,
      loginDemo,
      logout,
      setData,
      exportBackup,
      importBackup,
      resetDemoData,
      resetCloudData,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp deve estar dentro de AppProvider");
  return ctx;
}
