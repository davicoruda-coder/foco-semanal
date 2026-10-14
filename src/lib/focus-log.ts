/** Log de tempo de foco (matéria em play). Local-first. */

const STORAGE_KEY = "foco_semanal_focus_log_v1";
/** Snapshot do card "Foco hoje" — só muda em pause/fim/reset ou ao abrir Estatísticas. */
const DISPLAY_KEY = "foco_semanal_focus_display_v1";

export type FocusDay = {
  /** Total do dia em segundos */
  seconds: number;
  /** Segundos por hora (0–23) */
  byHour: number[];
  /** Segundos por matéria / atividade (Nome -> segundos) */
  bySubject?: Record<string, number>;
};

export type FocusLog = {
  version: 1;
  days: Record<string, FocusDay>;
};

function emptyHours(): number[] {
  return Array.from({ length: 24 }, () => 0);
}

function emptyDay(): FocusDay {
  return { seconds: 0, byHour: emptyHours(), bySubject: {} };
}

export function dateKey(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function loadFocusLog(): FocusLog {
  if (typeof window === "undefined") return { version: 1, days: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, days: {} };
    const parsed = JSON.parse(raw) as FocusLog;
    if (!parsed?.days) return { version: 1, days: {} };
    return { version: 1, days: parsed.days };
  } catch {
    return { version: 1, days: {} };
  }
}

export function saveFocusLog(log: FocusLog) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  } catch {
    /* ignore */
  }
}

/** Valor congelado exibido no card Foco hoje. */
export function loadFocusDisplaySnapshot(): FocusLog {
  if (typeof window === "undefined") return { version: 1, days: {} };
  try {
    const raw = localStorage.getItem(DISPLAY_KEY);
    if (!raw) return loadFocusLog();
    const parsed = JSON.parse(raw) as FocusLog;
    if (!parsed?.days) return loadFocusLog();
    return { version: 1, days: parsed.days };
  } catch {
    return loadFocusLog();
  }
}

export function saveFocusDisplaySnapshot(log: FocusLog) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DISPLAY_KEY, JSON.stringify(log));
  } catch {
    /* ignore */
  }
}

/** Copia o log real para o snapshot do card (pause/fim/reset ou Estatísticas). */
export function commitFocusDisplaySnapshot(log?: FocusLog): FocusLog {
  const next = log ?? loadFocusLog();
  saveFocusDisplaySnapshot(next);
  return next;
}

/** Une dois logs: por hora e por matéria, fica o maior valor (evita perder tempo entre aparelhos). */
export function mergeFocusLogs(a: FocusLog, b: FocusLog): FocusLog {
  const keys = new Set([...Object.keys(a.days), ...Object.keys(b.days)]);
  const days: Record<string, FocusDay> = {};
  for (const key of keys) {
    const da = getDay(a, key);
    const db = getDay(b, key);
    const byHour = emptyHours();
    for (let h = 0; h < 24; h++) {
      byHour[h] = Math.max(da.byHour[h] ?? 0, db.byHour[h] ?? 0);
    }
    const hourSum = byHour.reduce((sum, n) => sum + n, 0);

    const bySubject: Record<string, number> = { ...(da.bySubject ?? {}) };
    for (const [sub, sec] of Object.entries(db.bySubject ?? {})) {
      bySubject[sub] = Math.max(bySubject[sub] ?? 0, sec);
    }

    days[key] = {
      byHour,
      seconds: Math.max(hourSum, da.seconds ?? 0, db.seconds ?? 0),
      bySubject,
    };
  }
  return { version: 1, days };
}

/** Zera todo o histórico de tempo de foco neste aparelho. */
export function clearFocusLog(): FocusLog {
  const empty: FocusLog = { version: 1, days: {} };
  saveFocusLog(empty);
  saveFocusDisplaySnapshot(empty);
  return empty;
}

/** Acrescenta segundos de foco no momento atual (dia + hora) e opcionalmente na matéria associada. */
export function addFocusSeconds(
  seconds: number,
  at = new Date(),
  subjectName?: string,
): FocusLog {
  if (seconds <= 0) return loadFocusLog();
  const log = loadFocusLog();
  const key = dateKey(at);
  const hour = at.getHours();
  const day = log.days[key] ?? emptyDay();
  if (!day.byHour || day.byHour.length !== 24) day.byHour = emptyHours();
  day.seconds += seconds;
  day.byHour[hour] = (day.byHour[hour] ?? 0) + seconds;

  if (subjectName) {
    if (!day.bySubject) day.bySubject = {};
    day.bySubject[subjectName] = (day.bySubject[subjectName] ?? 0) + seconds;
  }

  log.days[key] = day;
  saveFocusLog(log);
  return log;
}

export function getDay(log: FocusLog, key: string): FocusDay {
  const d = log.days[key];
  if (!d) return emptyDay();
  if (!d.byHour || d.byHour.length !== 24) {
    return {
      seconds: d.seconds ?? 0,
      byHour: emptyHours(),
      bySubject: d.bySubject ?? {},
    };
  }
  return { ...d, bySubject: d.bySubject ?? {} };
}

/** Agrega os segundos por matéria para uma lista de chaves de dias */
export function aggregatePeriodSubjects(
  log: FocusLog,
  dayKeys: string[],
): { name: string; seconds: number; percentage: number }[] {
  const totals: Record<string, number> = {};
  let totalPeriodSeconds = 0;

  for (const k of dayKeys) {
    const day = getDay(log, k);
    totalPeriodSeconds += day.seconds;
    for (const [name, sec] of Object.entries(day.bySubject ?? {})) {
      totals[name] = (totals[name] ?? 0) + sec;
    }
  }

  // Se houver tempo de foco registrado sem matéria específica (ex: sessões anteriores a este update),
  // atribui a diferença a "Geral / Outros" para o total bater com o cabeçalho
  const accounted = Object.values(totals).reduce((a, b) => a + b, 0);
  if (totalPeriodSeconds > accounted) {
    const diff = totalPeriodSeconds - accounted;
    totals["Geral / Outros"] = (totals["Geral / Outros"] ?? 0) + diff;
  }

  return Object.entries(totals)
    .filter(([, sec]) => sec > 0)
    .map(([name, seconds]) => ({
      name,
      seconds,
      percentage:
        totalPeriodSeconds > 0
          ? Math.round((seconds / totalPeriodSeconds) * 100)
          : 0,
    }))
    .sort((a, b) => b.seconds - a.seconds);
}

export function formatFocusDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}min`;
  if (m > 0) return `${m} min`;
  return `${s}s`;
}

/** Segunda = início da semana (igual ao resto do app). */
export function startOfWeek(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0 Sun
  const mondayOffset = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + mondayOffset);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function weekSeries(log: FocusLog, ref = new Date()) {
  const start = startOfWeek(ref);
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(start, i);
    const key = dateKey(d);
    return { key, date: d, seconds: getDay(log, key).seconds };
  });
}

export function monthSeries(log: FocusLog, ref = new Date()) {
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month, i + 1);
    const key = dateKey(d);
    return { key, date: d, seconds: getDay(log, key).seconds };
  });
}

export function yearSeries(log: FocusLog, ref = new Date()) {
  const year = ref.getFullYear();
  return Array.from({ length: 12 }, (_, month) => {
    let seconds = 0;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      seconds += getDay(log, dateKey(new Date(year, month, day))).seconds;
    }
    return { month, seconds };
  });
}
