"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  PieChart,
  Plus,
  X,
} from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { RevisaoProvider } from "@/components/revisao/RevisaoProvider";
import { RevisaoStats } from "@/components/revisao/RevisaoStats";
import { SIDEBAR_TIMER_ID, useTimerRuntime } from "@/components/TimerRuntimeProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";
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
  clearFocusLog,
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
  clearFocusLogCloud,
  syncFocusLogWithCloud,
} from "@/lib/supabase/focus-sync";
import { promptDestructivePassword } from "@/lib/destructive-guard";
import { DAYS } from "@/lib/types";

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
  const { user } = useApp();
  const { runtime, stopwatch, subjectStopwatches } = useTimerRuntime();
  const [range, setRange] = useState<Range>("semana");
  const [referenceDate, setReferenceDate] = useState(() => new Date());
  const [log, setLog] = useState<FocusLog>({ version: 1, days: {} });
  const [confirmReset, setConfirmReset] = useState(false);
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
        hint: `${DAYS[i]} — ${formatFocusDuration(d.seconds)}`,
        emphasis: d.key === currentKey,
      }));
    }
    if (range === "mes") {
      return month.map((d) => ({
        label: String(d.date.getDate()),
        value: d.seconds,
        hint: `${d.date.getDate()}/${d.date.getMonth() + 1} — ${formatFocusDuration(d.seconds)}`,
        emphasis: d.key === currentKey,
      }));
    }
    const monthI = now.getMonth();
    const selectedIsCurrentYear =
      referenceDate.getFullYear() === now.getFullYear();
    return year.map((m) => ({
      label: MONTHS_SHORT[m.month],
      value: m.seconds,
      hint: `${MONTHS_SHORT[m.month]} — ${formatFocusDuration(m.seconds)}`,
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

  async function downloadReport() {
    setDownloadingReport(true);
    try {
      await downloadFocusReport({
        period: report.period,
        totalSeconds: headline,
        rows: report.rows,
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

  async function resetHistory() {
    const auth = promptDestructivePassword("resetar o histórico de tempo");
    if (auth === "cancel") {
      setConfirmReset(false);
      return;
    }
    if (auth === "wrong") {
      window.alert("Senha incorreta. Tente de novo.");
      return;
    }
    const empty = clearFocusLog();
    clearInterrupts();
    setInterrupts([]);
    setLog(empty);
    window.dispatchEvent(new Event("foco-focus-log"));
    setConfirmReset(false);
    await clearFocusLogCloud();
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-5">
      <ConfirmDialog
        open={confirmReset}
        title="Resetar histórico de tempo?"
        message="Isso apaga todo o tempo registrado (dia, semana, mês e ano) neste aparelho e na nuvem, e os avisos de sessão interrompida. Os temporizadores em si não mudam. Será pedida a senha de autorização. Esta ação não pode ser desfeita."
        confirmLabel="Sim, resetar"
        cancelLabel="Cancelar"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => void resetHistory()}
      />

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

      {/* Top Controls: Seletor de Módulo (Tempo de Foco | Diagnóstico de Erros), Status e Período */}
      <div className="flex flex-col gap-3 border-b border-[var(--line)] pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Seletor Segmentado de Visualização: Tempo de Foco | Diagnóstico de Erros */}
          <div className="grid grid-cols-2 sm:inline-flex w-full sm:w-auto items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--mist)] p-1">
            <button
              type="button"
              onClick={() => setMetricaView("foco")}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                metricaView === "foco"
                  ? "bg-[var(--signal)] text-white shadow-xs"
                  : "text-[color-mix(in_srgb,var(--ink)_60%,transparent)] hover:text-[var(--ink)]"
              }`}
            >
              <Clock size={15} strokeWidth={2} className="shrink-0" />
              <span>Tempo de Foco</span>
            </button>

            <button
              type="button"
              onClick={() => setMetricaView("diagnostico")}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                metricaView === "diagnostico"
                  ? "bg-[var(--signal)] text-white shadow-xs"
                  : "text-[color-mix(in_srgb,var(--ink)_60%,transparent)] hover:text-[var(--ink)]"
              }`}
            >
              <PieChart size={15} strokeWidth={2} className="shrink-0" />
              <span>Diagnóstico de Erros</span>
            </button>
          </div>

          {/* Quando no modo Foco: Status do cronômetro e Seletor de Período (Dia | Semana | Mês | Ano) */}
          {metricaView === "foco" && (
            <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 text-xs">
              <div className="flex items-center gap-2">
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

              {/* Range Selector: Dia | Semana | Mês | Ano */}
              <div className="flex flex-wrap gap-1 rounded-full border border-[var(--line)] bg-[var(--surface)] p-1 shadow-xs">
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
                      className={`rounded-full px-3.5 py-1 text-xs sm:text-sm font-semibold transition ${
                        active
                          ? "bg-[var(--signal)] text-white shadow-xs"
                          : "text-[color-mix(in_srgb,var(--ink)_65%,transparent)] hover:text-[var(--ink)]"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {metricaView === "foco" ? (
        <>
          {/* Navegador de período (Anterior / Atual / Próximo) */}
          <div className="flex items-center gap-2 rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] p-2 shadow-xs">
        <button
          type="button"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition hover:bg-[var(--mist)]"
          title="Período anterior"
          aria-label="Mostrar período anterior"
          onClick={() =>
            setReferenceDate((date) => shiftPeriod(date, range, -1))
          }
        >
          <ChevronLeft size={18} strokeWidth={2} />
        </button>

        <div className="min-w-0 flex-1 text-center">
          <p
            className={`truncate text-sm font-semibold text-[var(--ink)] ${
              range === "dia" ? "capitalize" : ""
            }`}
          >
            {periodLabel}
          </p>
          {!viewingCurrentPeriod ? (
            <button
              type="button"
              className="mt-0.5 text-xs font-semibold text-[var(--signal)] hover:underline"
              onClick={() => setReferenceDate(new Date())}
            >
              Voltar para {CURRENT_PERIOD_LABEL[range].toLowerCase()}
            </button>
          ) : (
            <p className="mt-0.5 text-xs opacity-50">
              {CURRENT_PERIOD_LABEL[range]}
            </p>
          )}
        </div>

        <button
          type="button"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition hover:bg-[var(--mist)] disabled:cursor-default disabled:opacity-25 disabled:hover:bg-transparent"
          title="Próximo período"
          aria-label="Mostrar próximo período"
          disabled={viewingCurrentPeriod}
          onClick={() =>
            setReferenceDate((date) => shiftPeriod(date, range, 1))
          }
        >
          <ChevronRight size={18} strokeWidth={2} />
        </button>
      </div>

      {/* Grid Dashboard: Coluna Principal (Gráfico + Resumos) + Coluna Lateral (Ações + Avisos) */}
      <div className="grid items-start gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Coluna Principal */}
        <div className="min-w-0 space-y-4 sm:space-y-5">
          <section className="surface p-5 sm:p-6 shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
              Tempo Total no Período
            </p>
            <p className="font-mono-num mt-1 text-3xl font-semibold tracking-tight md:text-4xl text-[var(--ink)]">
              {formatFocusDuration(headline)}
            </p>
            <div className="mt-6">
              <FocusBarChart bars={bars} height={range === "mes" ? 170 : 190} />
            </div>
          </section>

          {/* Cards de Resumo Rápido */}
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="surface relative overflow-hidden border-[color-mix(in_srgb,var(--signal)_45%,var(--line))] bg-[color-mix(in_srgb,var(--signal)_8%,var(--surface))] p-4 pl-5 shadow-xs">
              <span
                className="absolute inset-y-0 left-0 w-1 bg-[var(--signal)]"
                aria-hidden
              />
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
        </div>

        {/* Coluna Lateral de Ações e Avisos */}
        <aside className="space-y-4">
          <section className="surface p-4 sm:p-5 shadow-xs space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
              Ações de Relatório
            </p>

            <button
              type="button"
              className="btn btn-primary w-full justify-center"
              disabled={downloadingReport}
              onClick={() => void downloadReport()}
            >
              <Download size={16} strokeWidth={2} />
              {downloadingReport ? "Gerando PDF…" : REPORT_BUTTON_LABEL[range]}
            </button>

            <button
              type="button"
              className="btn w-full justify-center"
              onClick={openAddTime}
            >
              <Plus size={16} strokeWidth={2} />
              Adicionar tempo
            </button>

            {user ? (
              <button
                type="button"
                className="btn w-full justify-center text-xs"
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
                Atualizar da nuvem
              </button>
            ) : null}

            <div className="pt-2 border-t border-[var(--line)]">
              <button
                type="button"
                className="text-xs font-medium text-[var(--warn)] hover:underline opacity-80 hover:opacity-100 transition"
                onClick={() => setConfirmReset(true)}
              >
                Resetar histórico de tempo
              </button>
            </div>
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
