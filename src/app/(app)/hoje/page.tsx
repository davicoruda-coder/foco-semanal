"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { DAYS, STATUS_LABEL, type SubjectStatus } from "@/lib/types";
import { blockStyle, statusClass, statusRowClass, todayIndex } from "@/lib/utils";
import { ReminderWatcher } from "@/components/ReminderWatcher";
import { ReminderBoard } from "@/components/ReminderBoard";
import { SessionClock } from "@/components/SessionClock";
import { FocusTodayCard } from "@/components/FocusTodayCard";
import { MonthCalendarDialog } from "@/components/MonthCalendar";

/** Com o ciclo grande, a semana encolhe para "só hoje" e o ciclo sobe. */
const COMPACT_WEEK_THRESHOLD = 5;

export default function HojePage() {
  const { data, upsertSubject, setSubjectStatus } = useApp();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [weekOverride, setWeekOverride] = useState<boolean | null>(null);
  const [narrow, setNarrow] = useState(false);
  const day = todayIndex();

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const subjects = useMemo(
    () =>
      [...data.subjects]
        .filter((s) => s.active)
        .sort((a, b) => a.cycle_order - b.cycle_order),
    [data.subjects],
  );

  const todayBlocks = useMemo(
    () =>
      data.week_blocks
        .filter((b) => b.day === day)
        .sort((a, b) => a.sort_order - b.sort_order),
    [data.week_blocks, day],
  );

  const autoCompact =
    subjects.length >= COMPACT_WEEK_THRESHOLD || narrow;
  const showFullWeek = weekOverride ?? !autoCompact;
  const showWeekToggle = autoCompact || weekOverride !== null;

  const weekDays = DAYS.map((name, i) => ({ name, i }));

  return (
    <div>
      <ReminderWatcher />
      <MonthCalendarDialog
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
      />

      <div className="grid items-start gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4 sm:space-y-5">
          <section className="surface overflow-hidden p-0">
            <div
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-white md:px-5"
              style={{
                background:
                  "linear-gradient(120deg, var(--signal), color-mix(in srgb, var(--signal) 55%, var(--accent-2)))",
              }}
            >
              <button
                type="button"
                title="Abrir calendário do mês"
                aria-label="Abrir calendário do mês"
                className="font-display inline-flex items-center gap-2 rounded-[var(--radius-tag)] text-base font-semibold tracking-tight transition hover:opacity-85 md:text-lg"
                onClick={() => setCalendarOpen(true)}
              >
                <CalendarDays size={18} strokeWidth={2} />
                {`${DAYS[day]} · ${new Date().toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                })}`}
              </button>
              {showWeekToggle && (
                <button
                  type="button"
                  title={
                    showFullWeek ? "Mostrar só hoje" : "Mostrar semana toda"
                  }
                  aria-label={
                    showFullWeek ? "Mostrar só hoje" : "Mostrar semana toda"
                  }
                  className="inline-flex items-center gap-1 rounded-[var(--radius-tag)] bg-white/15 px-2 py-1 text-xs font-medium transition hover:bg-white/25"
                  onClick={() => setWeekOverride(!showFullWeek)}
                >
                  {showFullWeek ? (
                    <>
                      <ChevronUp size={14} strokeWidth={2} /> Só hoje
                    </>
                  ) : (
                    <>
                      <ChevronDown size={14} strokeWidth={2} /> Semana
                    </>
                  )}
                </button>
              )}
            </div>

            {showFullWeek ? (
              <div className="-mx-0 overflow-x-auto overscroll-x-contain">
                <div className="grid min-w-[640px] grid-cols-7 divide-x divide-[var(--line)] sm:min-w-[720px]">
                  {weekDays.map(({ name, i }) => {
                    const blocks = data.week_blocks
                      .filter((b) => b.day === i)
                      .sort((a, b) => a.sort_order - b.sort_order);
                    const isToday = i === day;
                    return (
                      <div
                        key={name}
                        className="min-h-36 bg-[var(--mist)] sm:min-h-44"
                      >
                        <div
                          className={`border-b px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider ${
                            isToday
                              ? "relative z-[1] border-[color-mix(in_srgb,var(--signal)_18%,var(--line))] text-[var(--ink)]"
                              : "border-[var(--line)] opacity-55"
                          }`}
                          style={
                            isToday
                              ? {
                                  background:
                                    "color-mix(in srgb, var(--signal) 12%, var(--signal-soft))",
                                  boxShadow:
                                    "inset 0 0 10px color-mix(in srgb, var(--signal) 18%, transparent), 0 0 6px color-mix(in srgb, var(--signal) 10%, transparent)",
                                }
                              : undefined
                          }
                        >
                          {name.slice(0, 3)}
                        </div>
                        <div className="space-y-1.5 p-2">
                          {blocks.length === 0 && (
                            <p className="px-1 text-[11px] opacity-40">—</p>
                          )}
                          {blocks.map((b) => {
                            const style = blockStyle(b, { muted: !isToday });
                            return (
                              <div
                                key={b.id}
                                className="rounded-[var(--radius-tag)] px-2 py-1.5 text-[13px] font-medium leading-snug sm:text-sm"
                                style={style.style}
                              >
                                {b.label}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-[var(--signal-soft)]/50 p-3 md:px-5">
                <div className="flex flex-wrap items-center gap-2">
                  {todayBlocks.length === 0 && (
                    <p className="text-sm opacity-55">Nenhum bloco hoje.</p>
                  )}
                  {todayBlocks.map((b) => {
                    const style = blockStyle(b);
                    return (
                      <div
                        key={b.id}
                        className="rounded-[var(--radius-tag)] px-3 py-1.5 text-sm font-medium"
                        style={style.style}
                      >
                        {b.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          <div className="surface p-4 lg:hidden">
            <ReminderBoard compact />
          </div>

          <section className="surface overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-3 md:px-5">
              <h2 className="font-display text-base font-semibold tracking-tight md:text-lg">
                Ciclo de Estudos
              </h2>
              <Link
                href="/materias"
                title="Gerenciar matérias"
                aria-label="Gerenciar matérias"
                className="rounded-full p-1.5 text-[color-mix(in_srgb,var(--ink)_45%,transparent)] transition hover:bg-[var(--mist)] hover:text-[var(--signal)]"
              >
                <SlidersHorizontal size={16} strokeWidth={1.75} />
              </Link>
            </div>

            {/* Mobile: cards empilhados */}
            <div className="divide-y divide-[var(--line)] md:hidden">
              {subjects.map((s) => (
                <div
                  key={s.id}
                  className={`space-y-2.5 px-4 py-3.5 ${statusRowClass(s.status)}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 text-[15px] font-semibold leading-snug">
                      {s.name}
                    </p>
                    <div className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-[var(--line)] bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] p-0.5">
                      {(["ok", "prox"] as SubjectStatus[]).map((st) => {
                        const active = s.status === st;
                        return (
                          <button
                            key={st}
                            type="button"
                            className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                              active
                                ? statusClass(st)
                                : "text-[color-mix(in_srgb,var(--ink)_55%,transparent)]"
                            }`}
                            onClick={() => setSubjectStatus(s.id, st)}
                          >
                            {STATUS_LABEL[st]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <textarea
                    className="min-h-12 w-full resize-y rounded-[var(--radius-tag)] border border-[var(--line)] bg-[var(--surface)]/70 px-2.5 py-2 text-sm outline-none focus:border-[var(--signal)]"
                    value={s.notes}
                    placeholder="Anotações…"
                    onChange={(e) =>
                      upsertSubject({ ...s, notes: e.target.value })
                    }
                  />
                </div>
              ))}
              {subjects.length === 0 && (
                <p className="px-4 py-8 text-sm opacity-55">
                  Nenhuma matéria —{" "}
                  <Link href="/materias" className="text-[var(--signal)]">
                    adicionar
                  </Link>
                </p>
              )}
            </div>

            {/* Desktop: tabela */}
            <div className="hidden md:block">
              <table className="w-full table-fixed border-separate border-spacing-0 text-left">
                <colgroup>
                  <col className="w-[30%]" />
                  <col className="w-40" />
                  <col />
                </colgroup>
                <thead>
                  <tr className="bg-[var(--mist)] text-xs uppercase tracking-wider opacity-60">
                    <th className="border-b border-[var(--line)] px-5 py-3 font-medium">
                      Matéria
                    </th>
                    <th className="border-b border-[var(--line)] px-3 py-3 font-medium">
                      Conclusão
                    </th>
                    <th className="border-b border-[var(--line)] px-5 py-3 font-medium">
                      Anotações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((s, i) => (
                    <tr
                      key={s.id}
                      className={`transition-colors ${statusRowClass(s.status)}`}
                    >
                      <td
                        className={`break-words px-5 py-3 align-top font-medium ${
                          i < subjects.length - 1
                            ? "border-b-2 border-[var(--surface)]"
                            : ""
                        }`}
                      >
                        {s.name}
                      </td>
                      <td
                        className={`px-3 py-3 align-top ${
                          i < subjects.length - 1
                            ? "border-b-2 border-[var(--surface)]"
                            : ""
                        }`}
                      >
                        <div className="inline-flex items-center gap-0.5 rounded-full border border-[var(--line)] bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] p-0.5">
                          {(["ok", "prox"] as SubjectStatus[]).map((st) => {
                            const active = s.status === st;
                            return (
                              <button
                                key={st}
                                type="button"
                                className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                                  active
                                    ? statusClass(st)
                                    : "text-[color-mix(in_srgb,var(--ink)_55%,transparent)] hover:text-[var(--ink)]"
                                }`}
                                onClick={() => setSubjectStatus(s.id, st)}
                              >
                                {STATUS_LABEL[st]}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td
                        className={`px-5 py-3 align-top ${
                          i < subjects.length - 1
                            ? "border-b-2 border-[var(--surface)]"
                            : ""
                        }`}
                      >
                        <textarea
                          className="min-h-14 w-full resize-y break-words rounded-[var(--radius-tag)] border border-transparent bg-transparent px-2 py-1 text-sm outline-none focus:border-[var(--line)] focus:bg-[var(--surface)]"
                          value={s.notes}
                          placeholder="Anotações…"
                          onChange={(e) =>
                            upsertSubject({ ...s, notes: e.target.value })
                          }
                        />
                      </td>
                    </tr>
                  ))}
                  {subjects.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-5 py-8 text-sm opacity-55">
                        Nenhuma matéria —{" "}
                        <Link href="/materias" className="text-[var(--signal)]">
                          adicionar
                        </Link>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <div className="space-y-4 lg:hidden">
            <SessionClock layout="stack" />
            <FocusTodayCard />
          </div>
        </div>

        <aside className="hidden space-y-4 lg:sticky lg:top-[4.5rem] lg:block lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto lg:self-start">
          <div className="surface p-3">
            <ReminderBoard compact />
          </div>
          <SessionClock layout="stack" />
          <FocusTodayCard />
        </aside>
      </div>
    </div>
  );
}
