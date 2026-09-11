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
import { DAYS, STATUS_LABEL } from "@/lib/types";
import {
  blockStyle,
  freeRowClass,
  statusClass,
  statusRowClass,
  subjectShowsOnDay,
  todayIndex,
} from "@/lib/utils";
import { ReminderWatcher } from "@/components/ReminderWatcher";
import { ReminderBoard } from "@/components/ReminderBoard";
import { SessionClock } from "@/components/SessionClock";
import { FocusTodayCard } from "@/components/FocusTodayCard";
import { MonthCalendarDialog } from "@/components/MonthCalendar";
import { AutoGrowTextarea } from "@/components/AutoGrowTextarea";
import { StudySessionBar } from "@/components/StudySessionChrome";
import { SessionSubjectClock } from "@/components/SessionSubjectClock";

/** Com o ciclo grande, a semana encolhe para "só hoje" e o ciclo sobe. */
const COMPACT_WEEK_THRESHOLD = 6;

export default function HojePage() {
  const { data, upsertSubject } = useApp();
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
        .filter((s) => s.active && subjectShowsOnDay(s, day))
        .sort((a, b) => {
          const freeA = Number(Boolean(a.is_free));
          const freeB = Number(Boolean(b.is_free));
          if (freeA !== freeB) return freeB - freeA;
          return a.cycle_order - b.cycle_order;
        }),
    [data.subjects, day],
  );

  const todayBlocks = useMemo(
    () =>
      data.week_blocks
        .filter((b) => b.day === day)
        .sort((a, b) => a.sort_order - b.sort_order),
    [data.week_blocks, day],
  );

  const autoCompact = subjects.length >= COMPACT_WEEK_THRESHOLD || narrow;
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

      <div className="grid items-start gap-3 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-3 sm:space-y-5">
          {/* Agenda — só no desktop; no mobile fica na aba Agenda */}
          <section className="surface hidden overflow-hidden p-0 lg:block">
            <div
              className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-white md:px-5 md:py-3"
              style={{
                background:
                  "linear-gradient(120deg, var(--signal), color-mix(in srgb, var(--signal) 55%, var(--accent-2)))",
              }}
            >
              <button
                type="button"
                title="Abrir calendário do mês"
                aria-label="Abrir calendário do mês"
                className="font-display inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-tag)] text-[15px] font-semibold tracking-tight transition hover:opacity-85 md:min-h-0 md:text-lg"
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
                  className="inline-flex min-h-10 items-center gap-1 rounded-full bg-white/15 px-3.5 py-2 text-sm font-medium transition hover:bg-white/25 md:min-h-0 md:rounded-[var(--radius-tag)] md:px-2 md:py-1 md:text-xs"
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
                <div className="grid min-w-[72rem] grid-cols-7 divide-x divide-[var(--line)] md:min-w-[46rem] lg:min-w-0">
                  {weekDays.map(({ name, i }) => {
                    const blocks = data.week_blocks
                      .filter((b) => b.day === i)
                      .sort((a, b) => a.sort_order - b.sort_order);
                    const isToday = i === day;
                    return (
                      <div
                        key={name}
                        className="min-h-[min(58vh,28rem)] min-w-0 bg-[var(--mist)] md:min-h-44"
                      >
                        <div
                          className={`border-b px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider md:px-2 md:py-2 ${
                            isToday
                              ? "relative z-[1] border-[color-mix(in_srgb,var(--signal)_18%,var(--line))] text-[var(--ink)]"
                              : "border-[var(--line)] text-[color-mix(in_srgb,var(--ink)_72%,transparent)]"
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
                        <div className="space-y-2 p-2 md:space-y-1.5">
                          {blocks.length === 0 && (
                            <p className="px-1 text-sm opacity-40 md:text-xs">
                              —
                            </p>
                          )}
                          {blocks.map((b) => {
                            const style = blockStyle(b, { muted: !isToday });
                            return (
                              <div
                                key={b.id}
                                title={b.label}
                                className="rounded-[var(--radius-tag)] px-2 py-2 text-sm font-medium leading-snug break-words hyphens-auto tabular-nums md:px-2 md:py-1.5 md:text-xs lg:text-sm"
                                style={style.style}
                                lang="pt-BR"
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
              <div className="bg-[var(--signal-soft)]/50 px-3.5 py-2.5 md:px-5 md:py-3">
                <div className="flex flex-wrap items-center gap-2">
                  {todayBlocks.length === 0 && (
                    <p className="text-sm opacity-55">Nenhum bloco hoje.</p>
                  )}
                  {todayBlocks.map((b) => {
                    const style = blockStyle(b);
                    return (
                      <div
                        key={b.id}
                        className="rounded-full px-3 py-1.5 text-sm font-medium tabular-nums"
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

          <section className="surface overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-3.5 py-2.5 md:px-5 md:py-3">
              <h2 className="font-display text-[15px] font-semibold tracking-tight md:text-lg">
                Ciclo de Estudos
              </h2>
              <Link
                href="/materias?from=hoje"
                title="Gerenciar matérias"
                aria-label="Gerenciar matérias"
                className="grid size-10 place-items-center rounded-full text-[color-mix(in_srgb,var(--ink)_45%,transparent)] transition hover:bg-[var(--mist)] hover:text-[var(--signal)] md:size-auto md:p-1.5"
              >
                <SlidersHorizontal size={18} strokeWidth={1.75} />
              </Link>
            </div>

            <StudySessionBar />

            <div className="space-y-2 p-2.5 md:hidden">
              {subjects.map((s) => {
                const free = Boolean(s.is_free);
                return (
                  <div
                    key={s.id}
                    className={`rounded-[14px] px-3.5 py-3 ${
                      free ? freeRowClass() : statusRowClass(s.status)
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2.5 gap-y-1">
                        <p className="min-w-0 text-[15px] font-semibold leading-snug">
                          {s.name}
                        </p>
                        <SessionSubjectClock subjectId={s.id} compact />
                      </div>
                      {!free && (
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${statusClass(s.status)}`}
                        >
                          {STATUS_LABEL[s.status]}
                        </span>
                      )}
                      {free && (
                        <span className="shrink-0 rounded-full bg-[var(--signal-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--signal)] ring-1 ring-[color-mix(in_srgb,var(--signal)_35%,transparent)]">
                          Livre
                        </span>
                      )}
                    </div>
                    <AutoGrowTextarea
                      className="mt-2 w-full rounded-[10px] border border-[color-mix(in_srgb,var(--ink)_8%,transparent)] bg-[color-mix(in_srgb,var(--surface)_55%,transparent)] px-2.5 py-2 text-sm leading-snug text-[color-mix(in_srgb,var(--ink)_84%,transparent)] focus:border-[var(--signal)] focus:bg-[var(--surface)] focus:text-[var(--ink)]"
                      value={s.notes}
                      placeholder="Anotações…"
                      minPx={40}
                      maxPx={88}
                      onChange={(notes) => upsertSubject({ ...s, notes })}
                    />
                  </div>
                );
              })}
              {subjects.length === 0 && (
                <p className="px-2 py-8 text-center text-sm opacity-55">
                  Nenhuma matéria para hoje —{" "}
                  <Link
                    href="/materias?from=hoje"
                    className="text-[var(--signal)]"
                  >
                    gerenciar
                  </Link>
                </p>
              )}
            </div>

            <div className="hidden md:block">
              <table className="w-full table-fixed border-separate border-spacing-0 text-left">
                <colgroup>
                  <col className="w-[22%]" />
                  <col className="w-[8.5rem]" />
                  <col />
                </colgroup>
                <thead>
                  <tr className="bg-[var(--mist)] text-xs font-medium uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
                    <th className="border-b border-[var(--line)] px-5 py-3 text-left">
                      Matéria
                    </th>
                    <th className="border-b border-[var(--line)] py-3 pl-2 pr-2 text-left">
                      Status
                    </th>
                    <th className="border-b border-[var(--line)] px-5 py-3 text-left">
                      Anotações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((s, i) => {
                    const free = Boolean(s.is_free);
                    const rowBorder =
                      i < subjects.length - 1
                        ? "border-b-2 border-[var(--surface)]"
                        : "";
                    return (
                      <tr
                        key={s.id}
                        className={`transition-colors ${free ? freeRowClass() : statusRowClass(s.status)}`}
                      >
                        <td
                          className={`break-words px-5 py-3 align-middle text-base font-medium leading-snug ${rowBorder}`}
                        >
                          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                            <span className="min-w-0">{s.name}</span>
                            <SessionSubjectClock subjectId={s.id} />
                          </div>
                        </td>
                        <td
                          className={`py-3 pl-2 pr-2 align-middle ${rowBorder}`}
                        >
                          {free ? (
                            <span className="inline-flex rounded-full bg-[var(--signal-soft)] px-2.5 py-1.5 text-xs font-medium text-[var(--signal)] ring-1 ring-[color-mix(in_srgb,var(--signal)_35%,transparent)]">
                              Livre
                            </span>
                          ) : (
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1.5 text-xs font-medium ${statusClass(s.status)}`}
                            >
                              {STATUS_LABEL[s.status]}
                            </span>
                          )}
                        </td>
                        <td className={`px-5 py-3 align-middle ${rowBorder}`}>
                          <div className="flex min-h-[2.25rem] items-start">
                            <AutoGrowTextarea
                              className="w-full break-words rounded-[var(--radius-tag)] border border-transparent bg-transparent px-0 py-0 text-[15px] font-normal leading-snug text-[color-mix(in_srgb,var(--ink)_84%,transparent)] focus:border-[var(--line)] focus:bg-[var(--surface)] focus:px-2 focus:py-1 focus:text-[var(--ink)]"
                              value={s.notes}
                              placeholder="Anotações…"
                              minPx={22}
                              maxPx={44}
                              rows={1}
                              onChange={(notes) =>
                                upsertSubject({ ...s, notes })
                              }
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {subjects.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-5 py-8 text-sm opacity-55">
                        Nenhuma matéria para hoje —{" "}
                        <Link
                          href="/materias?from=hoje"
                          className="text-[var(--signal)]"
                        >
                          gerenciar
                        </Link>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Ferramentas compactas — só mobile (aba Estudo) */}
          <div className="surface overflow-hidden lg:hidden">
            <SessionClock variant="livre" compact />
            <div className="border-t border-[var(--line)]">
              <FocusTodayCard compact embedded />
            </div>
          </div>
        </div>

        <aside className="hidden space-y-4 lg:sticky lg:top-[4.5rem] lg:block lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto lg:self-start">
          <div className="surface p-3">
            <ReminderBoard compact />
          </div>
          <SessionClock layout="stack" variant="livre" />
          <FocusTodayCard />
        </aside>
      </div>
    </div>
  );
}
