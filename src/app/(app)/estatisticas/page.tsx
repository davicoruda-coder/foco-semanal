"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { useTimerRuntime } from "@/components/TimerRuntimeProvider";
import { BackToHoje } from "@/components/BackToHoje";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FocusBarChart } from "@/components/FocusBarChart";
import {
  clearFocusLog,
  commitFocusDisplaySnapshot,
  dateKey,
  formatFocusDuration,
  getDay,
  loadFocusLog,
  monthSeries,
  weekSeries,
  yearSeries,
  type FocusLog,
} from "@/lib/focus-log";
import {
  clearFocusLogCloud,
  syncFocusLogWithCloud,
} from "@/lib/supabase/focus-sync";
import { DAYS } from "@/lib/types";
import { todayIndex } from "@/lib/utils";

type Range = "dia" | "semana" | "mes" | "ano";

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

export default function EstatisticasPage() {
  const { data, user } = useApp();
  const { runtime, stopwatch } = useTimerRuntime();
  const [range, setRange] = useState<Range>("semana");
  const [log, setLog] = useState<FocusLog>({ version: 1, days: {} });
  const [confirmReset, setConfirmReset] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncHint, setSyncHint] = useState<string | null>(null);

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

  const today = getDay(log, dateKey());
  const week = useMemo(() => weekSeries(log), [log]);
  const month = useMemo(() => monthSeries(log), [log]);
  const year = useMemo(() => yearSeries(log), [log]);

  const weekTotal = week.reduce((a, b) => a + b.seconds, 0);
  const monthTotal = month.reduce((a, b) => a + b.seconds, 0);
  const yearTotal = year.reduce((a, b) => a + b.seconds, 0);

  const bars = useMemo(() => {
    const now = new Date();
    if (range === "dia") {
      const hour = now.getHours();
      return today.byHour.map((seconds, h) => ({
        label: String(h).padStart(2, "0"),
        value: seconds,
        hint: `${String(h).padStart(2, "0")}h — ${formatFocusDuration(seconds)}`,
        emphasis: h === hour,
      }));
    }
    if (range === "semana") {
      const todayI = todayIndex();
      return week.map((d, i) => ({
        label: DAYS[i].slice(0, 3),
        value: d.seconds,
        hint: `${DAYS[i]} — ${formatFocusDuration(d.seconds)}`,
        emphasis: i === todayI,
      }));
    }
    if (range === "mes") {
      const todayN = now.getDate();
      return month.map((d) => ({
        label: String(d.date.getDate()),
        value: d.seconds,
        hint: `${d.date.getDate()}/${d.date.getMonth() + 1} — ${formatFocusDuration(d.seconds)}`,
        emphasis: d.date.getDate() === todayN,
      }));
    }
    const monthI = now.getMonth();
    return year.map((m) => ({
      label: MONTHS_SHORT[m.month],
      value: m.seconds,
      hint: `${MONTHS_SHORT[m.month]} — ${formatFocusDuration(m.seconds)}`,
      emphasis: m.month === monthI,
    }));
  }, [range, today, week, month, year]);

  const headline =
    range === "dia"
      ? today.seconds
      : range === "semana"
        ? weekTotal
        : range === "mes"
          ? monthTotal
          : yearTotal;

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
      <p className="mt-1 text-sm opacity-60">
        Tempo contado só enquanto a{" "}
        <span className="font-medium text-[var(--signal)]">Sessão</span> ou o{" "}
        <span className="font-medium text-[var(--signal)]">Cronômetro</span>{" "}
        estiverem em play. O histórico sincroniza na nuvem ao pausar ou ao abrir
        esta página.
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
        <div className="surface border-[color-mix(in_srgb,var(--signal)_42%,var(--line))] bg-[var(--signal-soft)] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--signal)]">
            Hoje
          </p>
          <p className="font-mono-num mt-1 text-lg font-medium">
            {formatFocusDuration(today.seconds)}
          </p>
        </div>
        <div className="surface p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider opacity-50">
            Esta semana
          </p>
          <p className="font-mono-num mt-1 text-lg font-medium">
            {formatFocusDuration(weekTotal)}
          </p>
        </div>
        <div className="surface p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider opacity-50">
            Este mês
          </p>
          <p className="font-mono-num mt-1 text-lg font-medium">
            {formatFocusDuration(monthTotal)}
          </p>
        </div>
      </section>

      <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
        {user ? (
          <button
            type="button"
            className="btn"
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
          className="btn text-[var(--warn)]"
          onClick={() => setConfirmReset(true)}
        >
          Resetar histórico de tempo
        </button>
      </div>
    </div>
  );
}
