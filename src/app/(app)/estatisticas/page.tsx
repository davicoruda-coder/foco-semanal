"use client";

import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { useTimerRuntime } from "@/components/TimerRuntimeProvider";
import { FocusBarChart } from "@/components/FocusBarChart";
import {
  dateKey,
  formatFocusDuration,
  getDay,
  loadFocusLog,
  monthSeries,
  weekSeries,
  yearSeries,
  type FocusLog,
} from "@/lib/focus-log";
import { DAYS } from "@/lib/types";

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
  const { data } = useApp();
  const { runtime, stopwatch } = useTimerRuntime();
  const [range, setRange] = useState<Range>("semana");
  const [log, setLog] = useState<FocusLog>({ version: 1, days: {} });

  useEffect(() => {
    const refresh = () => setLog(loadFocusLog());
    refresh();
    window.addEventListener("foco-focus-log", refresh);
    const id = window.setInterval(refresh, 2000);
    return () => {
      window.removeEventListener("foco-focus-log", refresh);
      window.clearInterval(id);
    };
  }, []);

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
    if (range === "dia") {
      return today.byHour.map((seconds, h) => ({
        label: String(h).padStart(2, "0"),
        value: seconds,
        hint: `${String(h).padStart(2, "0")}h — ${formatFocusDuration(seconds)}`,
      }));
    }
    if (range === "semana") {
      return week.map((d, i) => ({
        label: DAYS[i].slice(0, 3),
        value: d.seconds,
        hint: `${DAYS[i]} — ${formatFocusDuration(d.seconds)}`,
      }));
    }
    if (range === "mes") {
      return month.map((d) => ({
        label: String(d.date.getDate()),
        value: d.seconds,
        hint: `${d.date.getDate()}/${d.date.getMonth() + 1} — ${formatFocusDuration(d.seconds)}`,
      }));
    }
    return year.map((m) => ({
      label: MONTHS_SHORT[m.month],
      value: m.seconds,
      hint: `${MONTHS_SHORT[m.month]} — ${formatFocusDuration(m.seconds)}`,
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

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display pb-0.5 text-2xl font-semibold leading-normal tracking-tight md:text-3xl">
        Estatísticas
      </h1>
      <p className="mt-1 text-sm opacity-60">
        Tempo contado só enquanto a{" "}
        <span className="font-medium text-[var(--signal)]">Sessão</span> ou o{" "}
        <span className="font-medium text-[var(--signal)]">Cronômetro</span>{" "}
        estiverem em play.
      </p>

      <div className="mt-3 flex items-center gap-2 text-xs">
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
        <div className="surface p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider opacity-50">
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
    </div>
  );
}
