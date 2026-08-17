"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { useTimerRuntime } from "@/components/TimerRuntimeProvider";
import { BackToHoje } from "@/components/BackToHoje";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FocusBarChart } from "@/components/FocusBarChart";
import { downloadFocusReport } from "@/lib/focus-report";
import {
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
  const { data, user } = useApp();
  const { runtime, stopwatch } = useTimerRuntime();
  const [range, setRange] = useState<Range>("semana");
  const [referenceDate, setReferenceDate] = useState(() => new Date());
  const [log, setLog] = useState<FocusLog>({ version: 1, days: {} });
  const [confirmReset, setConfirmReset] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncHint, setSyncHint] = useState<string | null>(null);
  const [downloadingReport, setDownloadingReport] = useState(false);

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

    const onLog = () => applyLocal();
    window.addEventListener("foco-focus-log", onLog);
    const onVis = () => {
      if (document.visibilityState === "visible") void syncCloud();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("foco-focus-log", onLog);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [user]);

  const session = useMemo(
    () =>
      [...(data.timers ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0] ??
      null,
    [data.timers],
  );
  const tracking =
    Boolean(session && runtime[session.id]?.running) || stopwatch.running;

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

  async function resetHistory() {
    const empty = clearFocusLog();
    setLog(empty);
    window.dispatchEvent(new Event("foco-focus-log"));
    setConfirmReset(false);
    await clearFocusLogCloud();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <ConfirmDialog
        open={confirmReset}
        title="Resetar histórico de tempo?"
        message="Isso apaga todo o tempo registrado (dia, semana, mês e ano) neste aparelho e na nuvem. Os temporizadores em si não mudam. Esta ação não pode ser desfeita."
        confirmLabel="Sim, resetar"
        cancelLabel="Cancelar"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => void resetHistory()}
      />

      <BackToHoje />
      <h1 className="font-display pb-0.5 text-2xl font-semibold leading-normal tracking-tight md:text-3xl">
        Estatísticas
      </h1>
      <p className="mt-2 opacity-65">
        Tempo de foco por dia, semana, mês e ano.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="inline-flex items-center gap-2">
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
        </span>
        {user ? (
          <span className="opacity-50">
            {syncing ? "Sincronizando…" : syncHint}
          </span>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--ink)_7%,transparent)] p-1">
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
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                active
                  ? "bg-[var(--surface)] text-[var(--signal)] shadow-sm"
                  : "text-[color-mix(in_srgb,var(--ink)_55%,transparent)] hover:text-[var(--ink)]"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)]/70 p-2">
        <button
          type="button"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full transition hover:bg-[var(--mist)]"
          title="Período anterior"
          aria-label="Mostrar período anterior"
          onClick={() =>
            setReferenceDate((date) => shiftPeriod(date, range, -1))
          }
        >
          <ChevronLeft size={20} strokeWidth={2} />
        </button>

        <div className="min-w-0 flex-1 text-center">
          <p
            className={`truncate text-sm font-semibold ${
              range === "dia" ? "capitalize" : ""
            }`}
          >
            {periodLabel}
          </p>
          {!viewingCurrentPeriod ? (
            <button
              type="button"
              className="mt-0.5 text-xs font-medium text-[var(--signal)] hover:underline"
              onClick={() => setReferenceDate(new Date())}
            >
              Voltar para {CURRENT_PERIOD_LABEL[range].toLowerCase()}
            </button>
          ) : (
            <p className="mt-0.5 text-xs opacity-45">
              {CURRENT_PERIOD_LABEL[range]}
            </p>
          )}
        </div>

        <button
          type="button"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full transition hover:bg-[var(--mist)] disabled:cursor-default disabled:opacity-25 disabled:hover:bg-transparent"
          title="Próximo período"
          aria-label="Mostrar próximo período"
          disabled={viewingCurrentPeriod}
          onClick={() =>
            setReferenceDate((date) => shiftPeriod(date, range, 1))
          }
        >
          <ChevronRight size={20} strokeWidth={2} />
        </button>
      </div>

      <section className="surface mt-5 p-5 md:p-6">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-50">
          Total
        </p>
        <p className="font-mono-num mt-1 text-3xl font-medium tracking-tight md:text-4xl">
          {formatFocusDuration(headline)}
        </p>
        <div className="mt-6">
          <FocusBarChart bars={bars} height={range === "mes" ? 160 : 180} />
        </div>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="surface relative overflow-hidden border-[color-mix(in_srgb,var(--signal)_55%,transparent)] bg-[color-mix(in_srgb,var(--signal)_16%,var(--surface))] p-4 pl-5">
          <span
            className="absolute inset-y-0 left-0 w-1 bg-[var(--signal)]"
            aria-hidden
          />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--signal)]">
            Hoje
          </p>
          <p className="font-mono-num mt-1 text-lg font-medium">
            {formatFocusDuration(currentDay.seconds)}
          </p>
        </div>
        <div className="surface p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider opacity-50">
            Esta semana
          </p>
          <p className="font-mono-num mt-1 text-lg font-medium">
            {formatFocusDuration(currentWeekTotal)}
          </p>
        </div>
        <div className="surface p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider opacity-50">
            Este mês
          </p>
          <p className="font-mono-num mt-1 text-lg font-medium">
            {formatFocusDuration(currentMonthTotal)}
          </p>
        </div>
      </section>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start">
        <button
          type="button"
          className="btn btn-primary w-full sm:w-auto"
          disabled={downloadingReport}
          onClick={() => void downloadReport()}
        >
          <Download size={16} strokeWidth={2} />
          {downloadingReport ? "Gerando PDF…" : REPORT_BUTTON_LABEL[range]}
        </button>
        {user ? (
          <button
            type="button"
            className="btn w-full sm:w-auto"
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
        <button
          type="button"
          className="btn w-full text-[var(--warn)] sm:w-auto"
          onClick={() => setConfirmReset(true)}
        >
          Resetar histórico de tempo
        </button>
      </div>
    </div>
  );
}
