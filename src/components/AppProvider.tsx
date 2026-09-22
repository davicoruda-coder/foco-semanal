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
  loadDemoData,
  newId,
  saveDemoData,
  setDemoUser,
  setGuestMode,
} from "@/lib/demo-store";
import { parseBackupJson } from "@/lib/backup";
import { isSupabaseConfigured } from "@/lib/env";
import {
  isCloudDataEmpty,
  loadCloudData,
  saveCloudData,
  softDeleteCloudRows,
  type SoftDeleteTable,
} from "@/lib/supabase/sync";
import { rememberLastKnownGood, loadLastKnownGood } from "@/lib/local-recovery";
import { checkCurrentUserAccess } from "@/lib/supabase/access";
import {
  cycleSubjectsOnDay,
  isExclusiveCycleDay,
  todayIndex,
  normalizeStudyDays,
  normalizeExclusiveDays,
  normalizeRotation,
  normalizeSidebarTimerName,
  normalizeSidebarTimerMinutes,
  rotationAdvanced,
  normalizeRecursos,
  normalizeProgress,
  resetDailyStatusIfNeeded,
  incrementCycleRoundsToday,
  clearLastCycleCompletedSubjectId,
} from "@/lib/utils";
import { emitCycleComplete } from "@/lib/study-flow-events";
import { parseSubjectIcon } from "@/lib/subject-icons";
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

type User = { id: string; email: string; name: string; avatarUrl?: string };

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
  logout: () => void;
  updateUserAvatar: (url: string | null) => Promise<boolean>;
  setData: (updater: (prev: AppData) => AppData) => void;
  upsertSubject: (subject: Partial<Subject> & { name: string }) => void;
  /** Marca status; Ok no último do ciclo de hoje → todos (incluindo o último) voltam pra Próx. */
  setSubjectStatus: (id: string, status: SubjectStatus) => void;
  /** Reabre matéria recém-concluída para tempo extra (reverte status para prox, decrementa cycle_done e recua o rodízio). */
  reopenSubjectForExtraTime: (id: string) => void;
  /** Reinicia manualmente o ciclo de matérias de hoje para o status inicial (prox). */
  resetCycleToday: () => void;
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
  /** Zera dados na nuvem (e neste aparelho). Só com sessão cloud. */
  resetCloudData: () => Promise<{ ok: true } | { ok: false; error: string }>;
  /** Estado da sincronização com a nuvem (para aviso na UI). */
  cloudSync: {
    status: "idle" | "saving" | "error" | "offline";
    message: string | null;
  };
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [cloud, setCloud] = useState(false);
  const [data, setDataState] = useState<AppData>(() => createDefaultData());
  const [themePref, setThemePrefState] = useState<ThemePref>("light");
  const [theme, setThemeState] = useState<Theme>("light");
  const [cloudSync, setCloudSync] = useState<{
    status: "idle" | "saving" | "error" | "offline";
    message: string | null;
  }>({ status: "idle", message: null });
  const cloudRef = useRef(false);
  const userIdRef = useRef<string | null>(null);
  const themeRef = useRef<ThemePref>("light");
  const saveTimer = useRef<number | null>(null);
  const pendingSaveRef = useRef<{ data: AppData; theme: ThemePref } | null>(
    null,
  );
  const saveInFlightRef = useRef(false);
  const loadOkRef = useRef(false);
  const lastLoadAtRef = useRef(0);
  const hiddenAtRef = useRef<number | null>(null);
  /** Sobe a cada alteração local — re-sync assíncrono descarta se mudou no meio. */
  const dataRevRef = useRef(0);

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
    let unsubscribe: (() => void) | undefined;

    async function enterSession(
      uid: string,
      sessionUser: {
        email?: string | null;
        user_metadata?: { full_name?: string; custom_avatar?: string; avatar_url?: string; picture?: string };
      },
    ) {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const access = await checkCurrentUserAccess(supabase);
      if (!access.allowed) {
        await supabase.auth.signOut();
        if (!cancelled) clearSession();
        return;
      }
      const localSnapshot = loadDemoData();
      const localPref = getStoredPref();
      // Limpa flag antiga; migrate só se a nuvem estiver vazia (nunca sobrescreve).
      const migrateFlag = consumeMigrateLocalFlag();

      let loaded: Awaited<ReturnType<typeof loadCloudData>>;
      try {
        loaded = await loadCloudData(supabase, uid);
        loadOkRef.current = true;
        lastLoadAtRef.current = Date.now();
      } catch (err) {
        console.error("[foco] falha ao carregar nuvem:", err);
        loadOkRef.current = false;
        if (cancelled) return;
        const fallback = loadLastKnownGood() ?? localSnapshot;
        setCloud(true);
        cloudRef.current = true;
        userIdRef.current = uid;
        setUser({
          id: uid,
          email: sessionUser.email ?? "",
          name:
            sessionUser.user_metadata?.full_name ||
            sessionUser.email ||
            "Usuário",
          avatarUrl:
            sessionUser.user_metadata?.custom_avatar ||
            undefined,
        });
        setDataState(fallback);
        setCloudSync({
          status: "error",
          message:
            "Sem conexão com a nuvem — alterações locais não serão salvas até recarregar.",
        });
        setThemePrefState(localPref);
        setThemeState(resolveTheme(localPref));
        applyTheme(resolveTheme(localPref));
        setDemoUser(null);
        setGuestMode(false);
        setReady(true);
        return;
      }

      if (cancelled) return;

      const cloudEmpty = isCloudDataEmpty(loaded.data);
      // Seed / migrate local → nuvem somente quando a conta ainda não tem dados.
      if (cloudEmpty && (migrateFlag || localSnapshot.subjects.length > 0)) {
        try {
          await saveCloudData(supabase, uid, localSnapshot, localPref);
          loaded = {
            data: localSnapshot,
            theme: localPref,
            displayName: loaded.displayName,
          };
        } catch (err) {
          console.warn("[foco] seed local→nuvem falhou:", err);
        }
      }

      setCloud(true);
      cloudRef.current = true;
      userIdRef.current = uid;
      setUser({
        id: uid,
        email: sessionUser.email ?? "",
        name:
          loaded.displayName ||
          sessionUser.user_metadata?.full_name ||
          sessionUser.email ||
          "Usuário",
        avatarUrl:
          sessionUser.user_metadata?.custom_avatar ||
          undefined,
      });
      // Se a nuvem ainda não tiver as colunas de peso/ciclo (migration SQL pendente no Supabase),
      // preserva o peso/ciclo que o usuário já configurou localmente em vez de resetar.
      if (localSnapshot?.subjects?.length && (!loaded.dbHasWeight || !loaded.dbHasCycleDone)) {
        const localById = new Map(localSnapshot.subjects.map((s) => [s.id, s]));
        loaded.data.subjects = loaded.data.subjects.map((s) => {
          const local = localById.get(s.id);
          if (!local) return s;
          return {
            ...s,
            weight: !loaded.dbHasWeight && local.weight ? local.weight : s.weight,
            cycle_done: !loaded.dbHasCycleDone && local.cycle_done !== undefined ? local.cycle_done : s.cycle_done,
          };
        });
      }

      setDataState(loaded.data);
      // Espelha a nuvem no aparelho para o próximo boot não gravar vazio.
      saveDemoData(loaded.data);
      rememberLastKnownGood(loaded.data);
      setCloudSync({ status: "idle", message: null });
      const theme =
        localPref === "auto" && loaded.theme !== "auto"
          ? "auto"
          : loaded.theme;
      setThemePrefState(theme);
      setThemeState(resolveTheme(theme));
      applyTheme(resolveTheme(theme));
      localStorage.setItem(THEME_KEY, theme);
      // Persist the daily reset or auto theme back to the cloud
      const needsCloudSave = loaded.didDailyReset || (theme === "auto" && loaded.theme !== "auto");
      if (needsCloudSave) {
        void saveCloudData(supabase, uid, loaded.data, theme).catch(() => {});
      }
      setDemoUser(null);
      setGuestMode(false);
      setReady(true);
    }

    function clearSession() {
      cloudRef.current = false;
      userIdRef.current = null;
      loadOkRef.current = false;
      pendingSaveRef.current = null;
      setCloud(false);
      setUser(null);
      setDataState(createDefaultData());
      setGuestMode(false);
      setReady(true);
    }

    async function boot() {
      const initialPref = getStoredPref();
      setThemePrefState(initialPref);
      setThemeState(resolveTheme(initialPref));
      applyTheme(resolveTheme(initialPref));

      if (!isSupabaseConfigured()) {
        if (!cancelled) clearSession();
        return;
      }

      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: userData } = await supabase.auth.getUser();
        const authUser = userData.user;

        if (authUser && !cancelled) {
          await enterSession(authUser.id, authUser);
        } else if (!cancelled) {
          clearSession();
        }

        const { data: sub } = supabase.auth.onAuthStateChange(
          (event, nextSession) => {
            if (cancelled) return;
            if (event === "SIGNED_OUT") {
              clearSession();
              return;
            }
            if (event === "SIGNED_IN" && nextSession?.user) {
              if (userIdRef.current === nextSession.user.id && cloudRef.current) {
                return;
              }
              void enterSession(nextSession.user.id, nextSession.user);
            }
          },
        );
        unsubscribe = () => sub.subscription.unsubscribe();
      } catch {
        if (!cancelled) clearSession();
      }
    }

    void boot();
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const flushCloudSaveRef = useRef<() => Promise<void>>(async () => {});

  flushCloudSaveRef.current = async () => {
    if (saveInFlightRef.current) return;
    if (!cloudRef.current || !userIdRef.current) return;
    if (!loadOkRef.current) return;
    const pending = pendingSaveRef.current;
    if (!pending) return;
    saveInFlightRef.current = true;
    pendingSaveRef.current = null;
    setCloudSync({ status: "saving", message: null });
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await saveCloudData(
        supabase,
        userIdRef.current,
        pending.data,
        pending.theme,
      );
      rememberLastKnownGood(pending.data);
      setCloudSync({ status: "idle", message: null });
    } catch (err) {
      console.error("[foco] falha ao salvar na nuvem:", err);
      setCloudSync({
        status: "error",
        message: "Falha ao salvar na nuvem. Tentando de novo…",
      });
      if (!pendingSaveRef.current) {
        pendingSaveRef.current = pending;
      }
    } finally {
      saveInFlightRef.current = false;
      if (pendingSaveRef.current) {
        void flushCloudSaveRef.current();
      }
    }
  };

  const persistCloud = useCallback((next: AppData, nextTheme: ThemePref) => {
    if (!cloudRef.current || !userIdRef.current) return;
    if (!loadOkRef.current) return;
    pendingSaveRef.current = { data: next, theme: nextTheme };
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void flushCloudSaveRef.current();
    }, 600);
  }, []);

  const softDelete = useCallback(
    async (table: SoftDeleteTable, ids: string[]) => {
      if (!cloudRef.current || !userIdRef.current || !loadOkRef.current) return;
      if (!isSupabaseConfigured()) return;
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        await softDeleteCloudRows(supabase, table, userIdRef.current, ids);
      } catch (err) {
        console.error("[foco] soft-delete falhou:", err);
        setCloudSync({
          status: "error",
          message: "Não foi possível excluir na nuvem. Tente de novo.",
        });
      }
    },
    [],
  );

  // Ao voltar do background: se passou tempo, recarrega a nuvem (evita save stale).
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        return;
      }
      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;
      if (!cloudRef.current || !userIdRef.current || !loadOkRef.current) return;
      if (pendingSaveRef.current || saveInFlightRef.current) return;
      const awayMs = hiddenAt ? Date.now() - hiddenAt : 0;
      const sinceLoad = Date.now() - lastLoadAtRef.current;
      if (awayMs < 90_000 && sinceLoad < 180_000) return;

      const revAtStart = dataRevRef.current;
      const uid = userIdRef.current;

      void (async () => {
        try {
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          if (!uid) return;
          const loaded = await loadCloudData(supabase, uid);
          // Local mudou ou há save pendente/em voo: não pisar o Ok da matéria.
          if (pendingSaveRef.current || saveInFlightRef.current) return;
          if (dataRevRef.current !== revAtStart) return;
          if (userIdRef.current !== uid) return;
          lastLoadAtRef.current = Date.now();
          if (!loaded.dbHasWeight || !loaded.dbHasCycleDone) {
            const currentLocal = loadDemoData();
            if (currentLocal?.subjects?.length) {
              const localById = new Map(currentLocal.subjects.map((s) => [s.id, s]));
              loaded.data.subjects = loaded.data.subjects.map((s) => {
                const local = localById.get(s.id);
                if (!local) return s;
                return {
                  ...s,
                  weight: !loaded.dbHasWeight && local.weight ? local.weight : s.weight,
                  cycle_done: !loaded.dbHasCycleDone && local.cycle_done !== undefined ? local.cycle_done : s.cycle_done,
                };
              });
            }
          }
          setDataState(loaded.data);
          saveDemoData(loaded.data);
          rememberLastKnownGood(loaded.data);
          setCloudSync({ status: "idle", message: null });
        } catch (err) {
          console.warn("[foco] re-sync ao focar falhou:", err);
        }
      })();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Flush pendente ao fechar/esconder a aba ou recarregar.
  useEffect(() => {
    function flushNow() {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      void flushCloudSaveRef.current();
    }
    function onHide() {
      if (document.visibilityState === "hidden") flushNow();
    }
    window.addEventListener("beforeunload", flushNow);
    window.addEventListener("pagehide", flushNow);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("beforeunload", flushNow);
      window.removeEventListener("pagehide", flushNow);
      document.removeEventListener("visibilitychange", onHide);
    };
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
        if (next !== prev) dataRevRef.current += 1;
        if (cloudRef.current) {
          persistCloud(next, themeRef.current);
          saveDemoData(next);
        }
        return next;
      });
    },
    [persistCloud],
  );

  /** Sai da nuvem e volta à tela de login. */
  const logout = useCallback(() => {
    void (async () => {
      if (isSupabaseConfigured()) {
        try {
          const { createClient } = await import("@/lib/supabase/client");
          await createClient().auth.signOut();
        } catch (err) {
          console.error("[foco] falha ao sair:", err);
        }
      }
      cloudRef.current = false;
      userIdRef.current = null;
      loadOkRef.current = false;
      pendingSaveRef.current = null;
      setCloud(false);
      setUser(null);
      setDataState(createDefaultData());
      setGuestMode(false);
    })();
  }, []);

  const updateUserAvatar = useCallback(async (url: string | null) => {
    try {
      if (isSupabaseConfigured()) {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { error } = await supabase.auth.updateUser({
          data: { custom_avatar: url },
        });
        if (error) throw error;
      }
      setUser((prev) => (prev ? { ...prev, avatarUrl: url ?? undefined } : null));
      return true;
    } catch (err) {
      console.error("[foco] falha ao atualizar avatar:", err);
      return false;
    }
  }, []);

  const exportBackup = useCallback(() => {
    return JSON.stringify(
      {
        version: 1,
        exported_at: new Date().toISOString(),
        theme: themePref,
        data,
      },
      null,
      2,
    );
  }, [themePref, data]);

  const importBackup = useCallback((json: string) => {
    const parsed = parseBackupJson(json);
    if (!parsed.ok) return parsed;
    const imported = parsed.data;
    // Com sync upsert-only, import NÃO apaga o que já está na nuvem —
    // só sobe/atualiza o que veio no arquivo. Itens extras na nuvem permanecem.
    saveDemoData(imported);
    setDataState(imported);
    rememberLastKnownGood(imported);
    if (cloudRef.current) {
      persistCloud(imported, parsed.theme ?? themeRef.current);
    }
    if (parsed.theme) setTheme(parsed.theme);
    return { ok: true as const };
  }, [setTheme, persistCloud]);

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
        { allowEmptyWipe: true },
      );
      setDataState(fresh);
      saveDemoData(fresh);
      rememberLastKnownGood(fresh);
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
      logout,
      setData,
      upsertSubject: (subject) => {
        setData((prev) => {
          if (subject.id) {
            const patch = { ...subject };
            // Status só via setSubjectStatus — evita anotações com spread velho
            // sobrescreverem o Ok do timer.
            delete (patch as { status?: SubjectStatus }).status;
            if ("active" in subject) {
              patch.active = Boolean(subject.active);
            }
            if ("study_days" in subject) {
              patch.study_days = normalizeStudyDays(subject.study_days);
            }
            if ("exclusive_days" in subject) {
              patch.exclusive_days = normalizeExclusiveDays(
                subject.exclusive_days,
              );
            }
            if ("study_minutes" in subject) {
              const n = Number(subject.study_minutes);
              patch.study_minutes =
                Number.isFinite(n) && n >= 1 ? Math.min(999, Math.floor(n)) : 25;
            }
            if ("is_free" in subject) {
              patch.is_free = Boolean(subject.is_free);
            }
            if ("rotation" in subject) {
              patch.rotation = normalizeRotation(subject.rotation);
            }
            if ("icon" in subject) {
              patch.icon = parseSubjectIcon(subject.icon);
            }
            if ("recursos" in subject) {
              patch.recursos = normalizeRecursos(subject.recursos);
            }
            if ("weight" in subject) {
              const w = Number(subject.weight);
              patch.weight =
                Number.isFinite(w) && w >= 1 ? Math.min(10, Math.floor(w)) : 1;
            }
            if ("cycle_done" in subject) {
              const cd = Number(subject.cycle_done);
              patch.cycle_done =
                Number.isFinite(cd) && cd >= 0 ? Math.floor(cd) : 0;
            }
            if ("progress" in subject) {
              patch.progress = normalizeProgress(subject.progress);
            }
            // exclusive_status só via setSubjectStatus (mini-ciclo).
            delete (patch as { exclusive_status?: SubjectStatus }).exclusive_status;
            return {
              ...prev,
              subjects: prev.subjects.map((s) =>
                s.id === subject.id
                  ? {
                      ...s,
                      ...patch,
                      status: s.status,
                      exclusive_status: s.exclusive_status,
                    }
                  : s,
              ),
            };
          }
          const row: Subject = {
            id: newId("sub"),
            name: subject.name,
            status: subject.status ?? "prox",
            exclusive_status: subject.exclusive_status ?? "prox",
            notes: subject.notes ?? "",
            cycle_order: subject.cycle_order ?? prev.subjects.length,
            active: subject.active ?? true,
            study_days: normalizeStudyDays(subject.study_days),
            exclusive_days: normalizeExclusiveDays(subject.exclusive_days),
            study_minutes:
              typeof subject.study_minutes === "number" && subject.study_minutes >= 1
                ? Math.min(999, Math.floor(subject.study_minutes))
                : 25,
            is_free: Boolean(subject.is_free),
            rotation: normalizeRotation(subject.rotation),
            icon: parseSubjectIcon(subject.icon),
            recursos: normalizeRecursos(subject.recursos),
            weight:
              typeof subject.weight === "number" && subject.weight >= 1
                ? Math.min(10, Math.floor(subject.weight))
                : 1,
            cycle_done:
              typeof subject.cycle_done === "number" && subject.cycle_done >= 0
                ? Math.floor(subject.cycle_done)
                : 0,
            progress: normalizeProgress(subject.progress),
          };
          return { ...prev, subjects: [...prev.subjects, row] };
        });
      },
      setSubjectStatus: (id, status) => {
        setData((prev) => {
          const target = prev.subjects.find((s) => s.id === id);
          if (!target) return prev;
          // Solo exclusivo: sem Concluída/Próxima.
          const day = todayIndex();
          if (
            !isExclusiveCycleDay(prev.subjects, day) &&
            cycleSubjectsOnDay(prev.subjects, day).length === 0
          ) {
            return prev;
          }

          const exclusiveCycle = isExclusiveCycleDay(prev.subjects, day);

          const ordered = cycleSubjectsOnDay(prev.subjects, day);
          const idx = ordered.findIndex((s) => s.id === id);
          if (idx < 0) return prev;

          const readStatus = (s: Subject): SubjectStatus =>
            exclusiveCycle ? (s.exclusive_status ?? "prox") : s.status;

          const writeStatus = (s: Subject, next: SubjectStatus): Subject =>
            exclusiveCycle
              ? { ...s, exclusive_status: next }
              : { ...s, status: next };

          const restartToday = (subjects: typeof prev.subjects) => {
            const ids = new Set(cycleSubjectsOnDay(subjects, day).map((s) => s.id));
            return subjects.map((s) =>
              ids.has(s.id)
                ? {
                    ...writeStatus(s, "prox"),
                    cycle_done: 0,
                  }
                : s,
            );
          };

          // Concluiu e usa rodízio → a "da vez" avança (nos dois modos).
          const advanceIfTarget = (s: Subject): Subject => {
            if (s.id !== id) return s;
            const rot = normalizeRotation(s.rotation);
            if (!rot) return s;
            return { ...s, rotation: rotationAdvanced(rot) };
          };

          if (status !== "ok") {
            return {
              ...prev,
              subjects: prev.subjects.map((s) =>
                s.id === id
                  ? { ...writeStatus(s, status), cycle_done: 0 }
                  : s,
              ),
            };
          }

          // Conclusão de uma rodada da matéria
          const currentDone = Math.max(0, target.cycle_done ?? 0);
          const weight = Math.max(1, target.weight ?? 1);
          const nextDone = currentDone + 1;
          const isTargetFullyDone = nextDone >= weight;

          const updatedSubjects = prev.subjects.map((s) => {
            if (s.id === id) {
              const advanced = advanceIfTarget(s);
              return {
                ...writeStatus(advanced, isTargetFullyDone ? "ok" : "prox"),
                cycle_done: nextDone,
              };
            }
            return s;
          });

          // Verifica se todas as matérias ativas do ciclo de hoje completaram seus pesos ou foram concluídas
          const todayAfter = cycleSubjectsOnDay(updatedSubjects, day);
          const allCycleCompleted =
            todayAfter.length > 0 &&
            todayAfter.every((s) => {
              const w = Math.max(1, s.weight ?? 1);
              const d = Math.max(0, s.cycle_done ?? 0);
              return exclusiveCycle
                ? s.exclusive_status === "ok"
                : s.status === "ok" || d >= w;
            });

          if (allCycleCompleted) {
            const nextRound = incrementCycleRoundsToday(id);
            emitCycleComplete(nextRound);
            return { ...prev, subjects: restartToday(updatedSubjects) };
          }

          return { ...prev, subjects: updatedSubjects };
        });
      },
      reopenSubjectForExtraTime: (id) => {
        setData((prev) => {
          const target = prev.subjects.find((s) => s.id === id);
          if (!target) return prev;
          const day = todayIndex();
          const exclusiveCycle = isExclusiveCycleDay(prev.subjects, day);

          const writeStatus = (s: Subject, next: SubjectStatus): Subject =>
            exclusiveCycle
              ? { ...s, exclusive_status: next }
              : { ...s, status: next };

          const revertRotation = (s: Subject): Subject => {
            if (s.id !== id) return s;
            const rot = normalizeRotation(s.rotation);
            if (!rot || rot.items.length <= 1) return s;
            const len = rot.items.length;
            const prevIdx = (rot.index - 1 + len) % len;
            return {
              ...s,
              rotation: { ...rot, index: prevIdx },
            };
          };

          const currentDone = Math.max(0, target.cycle_done ?? 0);
          const prevDone = Math.max(0, currentDone - 1);

          return {
            ...prev,
            subjects: prev.subjects.map((s) => {
              if (s.id === id) {
                const reverted = revertRotation(s);
                return {
                  ...writeStatus(reverted, "prox"),
                  cycle_done: prevDone,
                };
              }
              return s;
            }),
          };
        });
      },
      resetCycleToday: () => {
        clearLastCycleCompletedSubjectId();
        setData((prev) => {
          const day = todayIndex();
          const exclusiveCycle = isExclusiveCycleDay(prev.subjects, day);
          const writeStatus = (s: Subject, next: SubjectStatus): Subject =>
            exclusiveCycle
              ? { ...s, exclusive_status: next }
              : { ...s, status: next };
          const ids = new Set(cycleSubjectsOnDay(prev.subjects, day).map((s) => s.id));
          return {
            ...prev,
            subjects: prev.subjects.map((s) =>
              ids.has(s.id)
                ? {
                    ...writeStatus(s, "prox"),
                    cycle_done: 0,
                  }
                : s,
            ),
          };
        });
      },
      deleteSubject: (id) => {
        void softDelete("subjects", [id]);
        setData((prev) => ({
          ...prev,
          subjects: prev.subjects.filter((s) => s.id !== id),
        }));
      },
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
      deleteWeekBlock: (id) => {
        void softDelete("week_blocks", [id]);
        setData((prev) => ({
          ...prev,
          week_blocks: prev.week_blocks.filter((b) => b.id !== id),
        }));
      },
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
            font_size: reminder.font_size ?? 0,
          };
          return { ...prev, reminders: [...prev.reminders, row] };
        });
      },
      deleteReminder: (id) => {
        void softDelete("reminders", [id]);
        setData((prev) => ({
          ...prev,
          reminders: prev.reminders.filter((r) => r.id !== id),
        }));
      },
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
      deleteSticky: (id) => {
        void softDelete("sticky_notes", [id]);
        setData((prev) => ({
          ...prev,
          sticky_notes: prev.sticky_notes.filter((n) => n.id !== id),
        }));
      },
      updateSettings: (settings) =>
        setData((prev) => ({
          ...prev,
          session_settings: {
            ...prev.session_settings,
            ...settings,
            ...(settings.sidebar_timer_name !== undefined
              ? {
                  sidebar_timer_name: normalizeSidebarTimerName(
                    settings.sidebar_timer_name,
                  ),
                }
              : {}),
            ...(settings.sidebar_timer_minutes !== undefined
              ? {
                  sidebar_timer_minutes: normalizeSidebarTimerMinutes(
                    settings.sidebar_timer_minutes,
                  ),
                }
              : {}),
          },
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
      deleteTimer: (id) => {
        void softDelete("focus_timers", [id]);
        setData((prev) => ({
          ...prev,
          timers: prev.timers
            .filter((t) => t.id !== id)
            .map((t, i) => ({ ...t, sort_order: i })),
        }));
      },
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
      resetCloudData,
      cloudSync,
      updateUserAvatar,
    }),
    [
      ready,
      user,
      data,
      cloud,
      theme,
      themePref,
      setTheme,
      logout,
      updateUserAvatar,
      setData,
      softDelete,
      exportBackup,
      importBackup,
      resetCloudData,
      cloudSync,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp deve estar dentro de AppProvider");
  return ctx;
}
