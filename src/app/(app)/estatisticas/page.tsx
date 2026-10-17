"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  PieChart,
  Plus,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { RevisaoProvider } from "@/components/revisao/RevisaoProvider";
import { RevisaoStats } from "@/components/revisao/RevisaoStats";
import { SIDEBAR_TIMER_ID, useTimerRuntime } from "@/components/TimerRuntimeProvider";
import { DialogFrame } from "@/components/DialogFrame";
import { FocusBarChart } from "@/components/FocusBarChart";
import {
  clearInterrupts,
  dismissInterrupt,
  formatInterruptWhen,
  interruptSummary,
  INTERRUPT_EVENT,
  loadInterrupts,
  type ClockInterrupt,
} from "@/lib/clock-interrupt";
import { downloadFocusReport } from "@/lib/focus-report";
import {
  addFocusSeconds,
  aggregatePeriodSubjects,
  commitFocusDisplaySnapshot,
  dateKey,
  formatFocusDuration,
  getDay,
  loadFocusLog,
  monthSeries,
  startOfWeek,
  weekSeries,
  yearSeries,
  type FocusLog,
} from "@/lib/focus-log";
import {
  syncFocusLogWithCloud,
} from "@/lib/supabase/focus-sync";
import { DAYS, type StudySession } from "@/lib/types";

type Range = "dia" | "semana" | "mes" | "ano";

const REPORT_BUTTON_LABEL: Record<Range, string> = {
  dia: "Baixar PDF do dia",
  semana: "Baixar PDF da semana",
  mes: "Baixar PDF do mês",
  ano: "Baixar PDF do ano",
};

const CURRENT_PERIOD_LABEL: Record<Range, string> = {
  dia: "Hoje",
  semana: "Esta semana",
  mes: "Este mês",
  ano: "Este ano",
};

const MONTHS_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const MONTHS_LONG = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const WEEKDAY_FULL = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;

function periodStart(range: Range, date: Date): Date {
  if (range === "semana") return startOfWeek(date);
  if (range === "mes") return new Date(date.getFullYear(), date.getMonth(), 1);
  if (range === "ano") return new Date(date.getFullYear(), 0, 1);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isCurrentPeriod(range: Range, date: Date): boolean {
  return dateKey(periodStart(range, date)) === dateKey(periodStart(range, new Date()));
}

function shiftPeriod(date: Date, range: Range, amount: number): Date {
  const next = new Date(date);
  if (range === "dia") {
    next.setDate(next.getDate() + amount);
  } else if (range === "semana") {
    next.setDate(next.getDate() + amount * 7);
  } else if (range === "mes") {
    next.setDate(1);
    next.setMonth(next.getMonth() + amount);
  } else {
    next.setDate(1);
    next.setMonth(0);
    next.setFullYear(next.getFullYear() + amount);
  }
  return next;
}

export default function EstatisticasPage() {
  const { user, data } = useApp();
  const { runtime, stopwatch, subjectStopwatches } = useTimerRuntime();
  const [range, setRange] = useState<Range>("semana");
  const [referenceDate, setReferenceDate] = useState(() => new Date());
  const [log, setLog] = useState<FocusLog>({ version: 1, days: {} });
  const [syncing, setSyncing] = useState(false);
  const [syncHint, setSyncHint] = useState<string | null>(null);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [interrupts, setInterrupts] = useState<ClockInterrupt[]>([]);
  const [addTimeOpen, setAddTimeOpen] = useState(false);
  const [addHours, setAddHours] = useState("0");
  const [addMinutes, setAddMinutes] = useState("25");
  const [addDay, setAddDay] = useState(() => dateKey());
  const [addHourOfDay, setAddHourOfDay] = useState(() =>
    String(new Date().getHours()),
  );
  const [addHint, setAddHint] = useState<string | null>(null);
  const [metricaView, setMetricaView] = useState<"foco" | "diagnostico">("foco");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (
        params.get("aba") === "diagnostico" ||
        params.get("tab") === "diagnostico"
      ) {
        setMetricaView("diagnostico");
      }
    }
  }, []);

  useEffect(() => {
    const applyLocal = () => {
      const next = loadFocusLog();
      commitFocusDisplaySnapshot(next);
      setLog(next);
    };

    const syncCloud = async () => {
      if (!user) {
        applyLocal();
        return;
      }
      setSyncing(true);
      setSyncHint("Sincronizando com a nuvem…");
      try {
        const merged = await syncFocusLogWithCloud();
        setLog(merged);
        setSyncHint("Atualizado da nuvem");
      } catch {
        applyLocal();
        setSyncHint("Sem conexão — mostrando dados deste aparelho");
      } finally {
        setSyncing(false);
      }
    };

    applyLocal();
    void syncCloud();
    setInterrupts(loadInterrupts());

    const onLog = () => applyLocal();
    const onInterrupt = () => setInterrupts(loadInterrupts());
    window.addEventListener("foco-focus-log", onLog);
    window.addEventListener(INTERRUPT_EVENT, onInterrupt);
    const onVis = () => {
      if (document.visibilityState === "visible") void syncCloud();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("foco-focus-log", onLog);
      window.removeEventListener(INTERRUPT_EVENT, onInterrupt);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [user]);

  const tracking =
    Object.entries(runtime).some(
      ([id, r]) =>
        r.running && (id === SIDEBAR_TIMER_ID || id.startsWith("sub:")),
    ) ||
    stopwatch.running ||
    Object.values(subjectStopwatches).some((s) => s.running);

  const currentDay = getDay(log, dateKey());
  const currentWeek = useMemo(() => weekSeries(log), [log]);
  const currentMonth = useMemo(() => monthSeries(log), [log]);
  const selectedDay = useMemo(
    () => getDay(log, dateKey(referenceDate)),
    [log, referenceDate],
  );
  const week = useMemo(
    () => weekSeries(log, referenceDate),
    [log, referenceDate],
  );
  const month = useMemo(
    () => monthSeries(log, referenceDate),
    [log, referenceDate],
  );
  const year = useMemo(
    () => yearSeries(log, referenceDate),
    [log, referenceDate],
  );

  const currentWeekTotal = currentWeek.reduce((a, b) => a + b.seconds, 0);
  const currentMonthTotal = currentMonth.reduce((a, b) => a + b.seconds, 0);
  const weekTotal = week.reduce((a, b) => a + b.seconds, 0);
  const monthTotal = month.reduce((a, b) => a + b.seconds, 0);
  const yearTotal = year.reduce((a, b) => a + b.seconds, 0);

  const bars = useMemo(() => {
    const now = new Date();
    const currentKey = dateKey(now);
    if (range === "dia") {
      const hour = now.getHours();
      const selectedIsToday = dateKey(referenceDate) === currentKey;
      return selectedDay.byHour.map((seconds, h) => ({
        label: String(h).padStart(2, "0"),
        value: seconds,
        hint: `${String(h).padStart(2, "0")}h — ${formatFocusDuration(seconds)}`,
        emphasis: selectedIsToday && h === hour,
      }));
    }
    if (range === "semana") {
      return week.map((d, i) => ({
        label: DAYS[i].slice(0, 3),
        value: d.seconds,
        hint: formatFocusDuration(d.seconds),
        emphasis: d.key === currentKey,
      }));
    }
    if (range === "mes") {
      return month.map((d) => {
        const day = String(d.date.getDate()).padStart(2, "0");
        const monthNum = String(d.date.getMonth() + 1).padStart(2, "0");
        const weekday = WEEKDAY_FULL[d.date.getDay()];
        return {
          label: String(d.date.getDate()),
          value: d.seconds,
          hint: `${day}/${monthNum} ${weekday} — ${formatFocusDuration(d.seconds)}`,
          emphasis: d.key === currentKey,
        };
      });
    }
    const monthI = now.getMonth();
    const selectedIsCurrentYear =
      referenceDate.getFullYear() === now.getFullYear();
    return year.map((m) => ({
      label: MONTHS_SHORT[m.month],
      value: m.seconds,
      hint: formatFocusDuration(m.seconds),
      emphasis: selectedIsCurrentYear && m.month === monthI,
    }));
  }, [range, referenceDate, selectedDay, week, month, year]);

  const headline =
    range === "dia"
      ? selectedDay.seconds
      : range === "semana"
        ? weekTotal
        : range === "mes"
          ? monthTotal
          : yearTotal;

  const viewingCurrentPeriod = isCurrentPeriod(range, referenceDate);

  const periodLabel = useMemo(() => {
    const shortDate = (date: Date) =>
      new Intl.DateTimeFormat("pt-BR").format(date);
    if (range === "dia") {
      return new Intl.DateTimeFormat("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(referenceDate);
    }
    if (range === "semana") {
      const first = week[0]?.date ?? referenceDate;
      const last = week[week.length - 1]?.date ?? referenceDate;
      return `${shortDate(first)} a ${shortDate(last)}`;
    }
    if (range === "mes") {
      return `${MONTHS_LONG[referenceDate.getMonth()]} de ${referenceDate.getFullYear()}`;
    }
    return String(referenceDate.getFullYear());
  }, [range, referenceDate, week]);

  const report = useMemo(() => {
    const shortDate = (date: Date) =>
      new Intl.DateTimeFormat("pt-BR").format(date);
    if (range === "dia") {
      return {
        period: `Dia — ${shortDate(referenceDate)}`,
        filename: `relatorio-foco-dia-${dateKey(referenceDate)}.pdf`,
        rows: selectedDay.byHour.map((seconds, hour) => ({
          label: `${String(hour).padStart(2, "0")}:00–${String(hour).padStart(2, "0")}:59`,
          seconds,
        })),
      };
    }

    if (range === "semana") {
      const first = week[0]?.date ?? referenceDate;
      const last = week[week.length - 1]?.date ?? referenceDate;
      return {
        period: `Semana — ${shortDate(first)} a ${shortDate(last)}`,
        filename: `relatorio-foco-semana-${dateKey(first)}.pdf`,
        rows: week.map((day, index) => ({
          label: `${DAYS[index]} — ${shortDate(day.date)}`,
          seconds: day.seconds,
        })),
      };
    }

    if (range === "mes") {
      return {
        period: `${MONTHS_LONG[referenceDate.getMonth()]} de ${referenceDate.getFullYear()}`,
        filename: `relatorio-foco-mes-${referenceDate.getFullYear()}-${String(
          referenceDate.getMonth() + 1,
        ).padStart(2, "0")}.pdf`,
        rows: month.map((day) => ({
          label: shortDate(day.date),
          seconds: day.seconds,
        })),
      };
    }

    return {
      period: `Ano de ${referenceDate.getFullYear()}`,
      filename: `relatorio-foco-ano-${referenceDate.getFullYear()}.pdf`,
      rows: year.map((item) => ({
        label: MONTHS_LONG[item.month],
        seconds: item.seconds,
      })),
    };
  }, [range, referenceDate, selectedDay, week, month, year]);

  const periodDayKeys = useMemo(() => {
    if (range === "dia") return [dateKey(referenceDate)];
    if (range === "semana") return week.map((d) => d.key);
    if (range === "mes") return month.map((d) => d.key);
    const yearNum = referenceDate.getFullYear();
    return Object.keys(log.days).filter((k) => k.startsWith(`${yearNum}-`));
  }, [range, referenceDate, week, month, log.days]);

  const subjectBreakdown = useMemo(() => {
    return aggregatePeriodSubjects(log, periodDayKeys);
  }, [log, periodDayKeys]);

  const selectedDateKey = dateKey(referenceDate);
  const daySessions = useMemo(() => {
    return (data.study_sessions ?? []).filter((s: StudySession) => {
      if (!s.started_at) return false;
      return s.started_at.startsWith(selectedDateKey);
    });
  }, [data.study_sessions, selectedDateKey]);

  async function downloadReport() {
    setDownloadingReport(true);
    try {
      await downloadFocusReport({
        period: report.period,
        totalSeconds: headline,
        rows: report.rows,
        subjectRows: subjectBreakdown,
        filename: report.filename,
      });
    } catch (error) {
      console.error("[foco] falha ao gerar relatório:", error);
      window.alert("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setDownloadingReport(false);
    }
  }

  const addSeconds = useMemo(() => {
    const hours = Math.max(0, Math.min(12, Math.floor(Number(addHours) || 0)));
    const minutes = Math.max(0, Math.min(59, Math.floor(Number(addMinutes) || 0)));
    return hours * 3600 + minutes * 60;
  }, [addHours, addMinutes]);

  function openAddTime() {
    const today = dateKey();
    const viewingDay = range === "dia" ? dateKey(referenceDate) : today;
    setAddDay(viewingDay);
    setAddHours("0");
    setAddMinutes("25");
    setAddHourOfDay(
      viewingDay === today ? String(new Date().getHours()) : "12",
    );
    setAddHint(null);
    setAddTimeOpen(true);
  }

  async function submitAddTime() {
    if (addSeconds <= 0) {
      setAddHint("Informe pelo menos 1 minuto.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(addDay)) {
      setAddHint("Data inválida.");
      return;
    }
    const [year, month, day] = addDay.split("-").map(Number);
    const hour = Math.max(0, Math.min(23, Math.floor(Number(addHourOfDay) || 0)));
    const at = new Date(year, month - 1, day, hour, 0, 0, 0);
    const next = addFocusSeconds(addSeconds, at);
    commitFocusDisplaySnapshot(next);
    setLog(next);
    window.dispatchEvent(new Event("foco-focus-log"));
    setAddTimeOpen(false);
    if (user) {
      try {
        const merged = await syncFocusLogWithCloud();
        setLog(merged);
      } catch {
        /* local already saved */
      }
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-5">
      <DialogFrame
        open={addTimeOpen}
        onClose={() => setAddTimeOpen(false)}
        labelledBy="add-time-title"
        cardClassName="surface w-full max-w-sm p-6 shadow-[var(--shadow-lg)]"
      >
        <h2 id="add-time-title" className="font-display text-xl font-semibold">
          Adicionar tempo
        </h2>
        <p className="mt-2 text-sm opacity-65">
          Some minutos de estudo feitos fora do sistema (cronômetro próprio,
          caderno, etc.).
        </p>
        <div className="mt-4 grid gap-3">
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium opacity-60">Dia</span>
            <input
              type="date"
              className="input"
              value={addDay}
              max={dateKey()}
              onChange={(e) => setAddDay(e.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium opacity-60">Horas</span>
              <input
                type="number"
                min={0}
                max={12}
                className="input"
                value={addHours}
                onChange={(e) => setAddHours(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium opacity-60">Minutos</span>
              <input
                type="number"
                min={0}
                max={59}
                className="input"
                value={addMinutes}
                onChange={(e) => setAddMinutes(e.target.value)}
              />
            </label>
          </div>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium opacity-60">
              Horário no gráfico do dia
            </span>
            <select
              className="input"
              value={addHourOfDay}
              onChange={(e) => setAddHourOfDay(e.target.value)}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={String(h)}>
                  {String(h).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-3 text-sm font-medium">
          Vai somar {formatFocusDuration(addSeconds)}
        </p>
        {addHint ? (
          <p className="mt-1 text-sm text-[var(--warn)]">{addHint}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="btn"
            onClick={() => setAddTimeOpen(false)}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={addSeconds <= 0}
            onClick={() => void submitAddTime()}
          >
            Adicionar
          </button>
        </div>
      </DialogFrame>

      <h1 className="sr-only">Métricas de Desempenho e Foco</h1>

      {/* Top Controls: Seletor de Módulo (Tempo de Foco | Diagnóstico de Erros) e Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[color-mix(in_srgb,var(--line)_70%,transparent)]">
        {/* Seletor Segmentado de Visualização em Abas Limpas */}
        <nav
          aria-label="Visualizações de métricas"
          className="grid grid-cols-2 sm:flex sm:items-center gap-1 sm:gap-6"
        >
          <button
            type="button"
            onClick={() => setMetricaView("foco")}
            className={`group relative inline-flex items-center justify-center gap-2 px-2 sm:px-1 py-2 sm:py-3 text-xs sm:text-sm font-semibold transition-colors ${
              metricaView === "foco"
                ? "text-[var(--ink)]"
                : "text-[color-mix(in_srgb,var(--ink)_55%,transparent)] hover:text-[var(--ink)]"
            }`}
          >
            <Clock
              size={15}
              strokeWidth={2}
              className={`shrink-0 transition-colors ${
                metricaView === "foco"
                  ? "text-[var(--signal)]"
                  : "text-[color-mix(in_srgb,var(--ink)_45%,transparent)] group-hover:text-[var(--signal)]"
              }`}
            />
            <span className="truncate">Tempo de Foco</span>
            {metricaView === "foco" && (
              <span className="absolute inset-x-0 -bottom-px h-[2.5px] rounded-full bg-[var(--signal)]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setMetricaView("diagnostico")}
            className={`group relative inline-flex items-center justify-center gap-2 px-2 sm:px-1 py-2 sm:py-3 text-xs sm:text-sm font-semibold transition-colors ${
              metricaView === "diagnostico"
                ? "text-[var(--ink)]"
                : "text-[color-mix(in_srgb,var(--ink)_55%,transparent)] hover:text-[var(--ink)]"
            }`}
          >
            <PieChart
              size={15}
              strokeWidth={2}
              className={`shrink-0 transition-colors ${
                metricaView === "diagnostico"
                  ? "text-[var(--signal)]"
                  : "text-[color-mix(in_srgb,var(--ink)_45%,transparent)] group-hover:text-[var(--signal)]"
              }`}
            />
            <span className="truncate">Diagnóstico de Erros</span>
            {metricaView === "diagnostico" && (
              <span className="absolute inset-x-0 -bottom-px h-[2.5px] rounded-full bg-[var(--signal)]" />
            )}
          </button>
        </nav>

        {/* Quando no modo Foco: Status do cronômetro (à direita) */}
        {metricaView === "foco" && (
          <div className="flex items-center gap-2 text-xs pb-2.5 sm:pb-0">
            <span
              className={`inline-flex h-2 w-2 rounded-full ${
                tracking
                  ? "bg-[var(--ok)]"
                  : "bg-[color-mix(in_srgb,var(--ink)_25%,transparent)]"
              }`}
            />
            <span className="opacity-60">
              {tracking ? "Registrando agora…" : "Pausado — não está contando"}
            </span>
            {syncing ? (
              <span className="opacity-50">Sincronizando…</span>
            ) : null}
          </div>
        )}
      </div>

      {metricaView === "foco" ? (
        <>
          {/* Grid Dashboard: Coluna Principal (Gráfico + Resumos) + Coluna Lateral (Ações + Avisos) */}
          <div className="grid items-start gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
            {/* Coluna Principal */}
            <div className="min-w-0 space-y-4 sm:space-y-5">
              <section className="surface p-5 sm:p-6 shadow-xs space-y-5">
                {/* Header Integrado do Card: Métrica Principal + Controles Temporais (Granularidade & Data) */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--line)]/50 pb-4 sm:pb-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
                      Tempo Total no Período
                    </p>
                    <p className="font-mono-num mt-1 text-3xl font-semibold tracking-tight md:text-4xl text-[var(--ink)]">
                      {formatFocusDuration(headline)}
                    </p>
                  </div>

                  {/* Controles de Granularidade e Navegação de Data */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                    {/* Seletor de Escala (Dia | Semana | Mês | Ano) */}
                    <div className="inline-flex h-[36px] items-center gap-0.5 rounded-xl border border-[var(--line)] bg-[var(--mist)] p-1 shadow-2xs shrink-0">
                      {(
                        [
                          ["dia", "Dia"],
                          ["semana", "Semana"],
                          ["mes", "Mês"],
                          ["ano", "Ano"],
                        ] as const
                      ).map(([value, label]) => {
                        const active = range === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setRange(value)}
                            className={`h-full inline-flex items-center rounded-lg px-2.5 sm:px-3 text-xs font-semibold transition ${
                              active
                                ? "bg-[var(--surface)] text-[var(--ink)] shadow-xs ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
                                : "text-[color-mix(in_srgb,var(--ink)_65%,transparent)] hover:text-[var(--ink)] hover:bg-[var(--surface)]/40"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Navegador de Período (Chevrons + Label) */}
                    <div className="inline-flex h-[36px] items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-1 sm:px-1.5 shadow-2xs shrink-0">
                      <button
                        type="button"
                        className="grid h-7 w-7 place-items-center rounded-lg transition hover:bg-[var(--mist)] text-[var(--ink)] active:scale-95"
                        title="Período anterior"
                        aria-label="Mostrar período anterior"
                        onClick={() =>
                          setReferenceDate((date) => shiftPeriod(date, range, -1))
                        }
                      >
                        <ChevronLeft size={16} strokeWidth={2.2} />
                      </button>

                      <div className="px-2 sm:px-2.5 text-center">
                        <p
                          className={`text-xs sm:text-sm font-semibold text-[var(--ink)] whitespace-nowrap ${
                            range === "dia" ? "capitalize" : ""
                          }`}
                        >
                          {periodLabel}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="grid h-7 w-7 place-items-center rounded-lg transition hover:bg-[var(--mist)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent text-[var(--ink)] active:scale-95"
                        title="Próximo período"
                        aria-label="Mostrar próximo período"
                        disabled={viewingCurrentPeriod}
                        onClick={() =>
                          setReferenceDate((date) => shiftPeriod(date, range, 1))
                        }
                      >
                        <ChevronRight size={16} strokeWidth={2.2} />
                      </button>
                    </div>

                    {/* Atalho rápido para retornar ao período atual */}
                    {!viewingCurrentPeriod && (
                      <button
                        type="button"
                        onClick={() => setReferenceDate(new Date())}
                        className="h-[36px] inline-flex items-center gap-1.5 rounded-xl border border-[color-mix(in_srgb,var(--signal)_35%,var(--line))] bg-[color-mix(in_srgb,var(--signal)_8%,var(--surface))] px-2.5 sm:px-3 text-xs font-semibold text-[var(--signal)] shadow-2xs hover:bg-[var(--signal)] hover:text-white transition active:scale-95 shrink-0"
                        title={`Voltar para ${CURRENT_PERIOD_LABEL[range].toLowerCase()}`}
                      >
                        <RotateCcw size={13} strokeWidth={2.2} />
                        <span>{CURRENT_PERIOD_LABEL[range]}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-1">
                  <FocusBarChart bars={bars} height={range === "mes" ? 170 : 190} />
                </div>
              </section>

          {/* Cards de Resumo Rápido */}
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="surface border-[color-mix(in_srgb,var(--signal)_45%,var(--line))] bg-[color-mix(in_srgb,var(--signal)_8%,var(--surface))] p-4 shadow-xs">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--signal)]">
                Hoje
              </p>
              <p className="font-mono-num mt-1 text-xl font-semibold text-[var(--ink)]">
                {formatFocusDuration(currentDay.seconds)}
              </p>
            </div>
            <div className="surface p-4 shadow-xs">
              <p className="text-[11px] font-semibold uppercase tracking-wider opacity-60">
                Esta semana
              </p>
              <p className="font-mono-num mt-1 text-xl font-semibold text-[var(--ink)]">
                {formatFocusDuration(currentWeekTotal)}
              </p>
            </div>
            <div className="surface p-4 shadow-xs">
              <p className="text-[11px] font-semibold uppercase tracking-wider opacity-60">
                Este mês
              </p>
              <p className="font-mono-num mt-1 text-xl font-semibold text-[var(--ink)]">
                {formatFocusDuration(currentMonthTotal)}
              </p>
            </div>
          </section>

          {/* Distribuição por Matéria no Período */}
          <section className="surface p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--line)]/60 pb-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--signal)]">
                  Tempo por Matéria no Período
                </h3>
                <p className="text-xs text-[color-mix(in_srgb,var(--ink)_55%,transparent)] mt-0.5">
                  Discriminação do foco dedicado a cada disciplina e atividade
                </p>
              </div>
            </div>

            {subjectBreakdown.length === 0 ? (
              <p className="text-xs text-[color-mix(in_srgb,var(--ink)_45%,transparent)] py-2">
                Nenhum tempo discriminado por matéria neste período. Conforme você estuda as matérias do ciclo, o progresso individual aparecerá aqui.
              </p>
            ) : (
              <div className="space-y-3 pt-1">
                {subjectBreakdown.map((item) => (
                  <div key={item.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[var(--ink)] truncate max-w-[200px] sm:max-w-xs">
                        {item.name}
                      </span>
                      <div className="flex items-center gap-2 font-mono-num shrink-0">
                        <span className="font-semibold text-[var(--ink)]">
                          {formatFocusDuration(item.seconds)}
                        </span>
                        <span className="text-[11px] font-medium text-[color-mix(in_srgb,var(--ink)_50%,transparent)] w-10 text-right">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]">
                      <div
                        className="h-full rounded-full bg-[var(--signal)] transition-all duration-300"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Sessões Concluídas no Dia (quando na visão Dia) */}
          {range === "dia" && daySessions.length > 0 && (
            <section className="surface p-5 sm:p-6 shadow-xs space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider opacity-60">
                Sessões Concluídas no Dia
              </h3>
              <div className="divide-y divide-[var(--line)]/40 text-xs">
                {daySessions.map((sess: StudySession) => (
                  <div key={sess.id} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-[var(--ink)] truncate">
                        {sess.subject_name}
                      </span>
                      <span className="text-[10px] text-[color-mix(in_srgb,var(--ink)_45%,transparent)]">
                        {new Date(sess.started_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <span className="font-mono-num font-semibold text-[var(--signal)] shrink-0">
                      {sess.duration_minutes} min
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Coluna Lateral de Ações e Avisos */}
        <aside className="space-y-4">
          <section className="surface p-4 sm:p-5 shadow-xs space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
              Ações de Relatório
            </p>

            <button
              type="button"
              className="btn w-full justify-center bg-[var(--surface)] hover:bg-[var(--mist)] text-sm font-semibold shadow-2xs gap-2"
              disabled={downloadingReport}
              onClick={() => void downloadReport()}
            >
              <Download size={15} strokeWidth={2} />
              <span>{downloadingReport ? "Gerando PDF…" : REPORT_BUTTON_LABEL[range]}</span>
            </button>

            <button
              type="button"
              className="btn w-full justify-center bg-[var(--surface)] hover:bg-[var(--mist)] text-sm font-semibold shadow-2xs gap-2"
              onClick={openAddTime}
            >
              <Plus size={15} strokeWidth={2} />
              <span>Adicionar tempo</span>
            </button>

            {user ? (
              <button
                type="button"
                className="btn w-full justify-center bg-[var(--surface)] hover:bg-[var(--mist)] text-sm font-semibold shadow-2xs gap-2"
                disabled={syncing}
                onClick={() => {
                  setSyncing(true);
                  setSyncHint("Sincronizando com a nuvem…");
                  void syncFocusLogWithCloud()
                    .then((merged) => {
                      setLog(merged);
                      setSyncHint("Atualizado da nuvem");
                    })
                    .catch(() => {
                      setSyncHint("Falha ao sincronizar");
                    })
                    .finally(() => setSyncing(false));
                }}
              >
                <RefreshCw size={15} strokeWidth={2} className={syncing ? "animate-spin" : ""} />
                <span>{syncing ? "Sincronizando…" : "Atualizar da nuvem"}</span>
              </button>
            ) : null}
          </section>

          {interrupts.length > 0 ? (
            <section className="surface p-4 sm:p-5 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
                    Sessão interrompida
                  </p>
                  <p className="mt-1 text-xs opacity-65 leading-relaxed">
                    O computador desligou ou o navegador parou.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearInterrupts();
                    setInterrupts([]);
                  }}
                  className="shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-medium text-[var(--ink)] opacity-60 hover:bg-[var(--mist)] hover:opacity-100 transition-opacity"
                >
                  Limpar
                </button>
              </div>
              <ul className="mt-3 space-y-2">
                {interrupts.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-[var(--mist)]/50 p-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{interruptSummary(item)}</p>
                      <p className="text-[10px] opacity-50">
                        {formatInterruptWhen(item)}
                      </p>
                    </div>
                    <button
                      type="button"
                      title="Dispensar aviso"
                      aria-label="Dispensar aviso"
                      onClick={() => {
                        dismissInterrupt(item.id);
                        setInterrupts(loadInterrupts());
                      }}
                      className="rounded p-1 opacity-50 hover:bg-[var(--surface)] hover:opacity-100"
                    >
                      <X size={14} strokeWidth={2} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
        </>
      ) : (
        <div className="pt-2">
          <RevisaoProvider>
            <RevisaoStats />
          </RevisaoProvider>
        </div>
      )}
    </div>
  );
}
