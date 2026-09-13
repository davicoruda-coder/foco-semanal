"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BookMarked,
  CalendarDays,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { DAYS } from "@/lib/types";
import {
  blockStyle,
  cycleStatusPresentation,
  exclusiveSubjectsOnDay,
  isExclusiveCycleDay,
  isExclusiveSoloDay,
  freeRowClass,
  normalizeRotation,
  nextCycleSubjectId,
  rotationWithItemNotes,
  subjectsOnDay,
  subjectTreatAsFree,
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
import { SubjectIcon } from "@/components/SubjectIcon";

export default function HojePage() {
  const { data, upsertSubject } = useApp();
  const [calendarOpen, setCalendarOpen] = useState(false);
  /** null = padrão (só hoje); true = semana; false = só hoje forçado */
  const [weekOverride, setWeekOverride] = useState<boolean | null>(null);
  const day = todayIndex();

  const subjects = useMemo(
    () =>
      [...subjectsOnDay(data.subjects, day)].sort((a, b) => {
        const freeA = Number(subjectTreatAsFree(a, day, data.subjects));
        const freeB = Number(subjectTreatAsFree(b, day, data.subjects));
        if (freeA !== freeB) return freeB - freeA;
        return a.cycle_order - b.cycle_order;
      }),
    [data.subjects, day],
  );

  const queueHeadId = useMemo(
    () => nextCycleSubjectId(data.subjects, day),
    [data.subjects, day],
  );

  const exclusiveTodayList = useMemo(
    () => exclusiveSubjectsOnDay(data.subjects, day),
    [data.subjects, day],
  );
  const exclusiveCycleToday = useMemo(
    () => isExclusiveCycleDay(data.subjects, day),
    [data.subjects, day],
  );
  const exclusiveSoloToday = useMemo(
    () => isExclusiveSoloDay(data.subjects, day),
    [data.subjects, day],
  );

  const todayBlocks = useMemo(
    () =>
      data.week_blocks
        .filter((b) => b.day === day)
        .sort((a, b) => a.sort_order - b.sort_order),
    [data.week_blocks, day],
  );

  // Padrão: só o dia — libera espaço pro ciclo. Botão Semana expande.
  const showFullWeek = weekOverride === true;
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
          {/* Contexto do dia — mobile/tablet; no desktop a agenda completa cobre isso */}
          <section className="surface overflow-hidden p-0 lg:hidden">
            <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] bg-[var(--mist)] px-3.5 py-2">
              <button
                type="button"
                title="Abrir calendário do mês"
                aria-label="Abrir calendário do mês"
                className="font-display inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold tracking-tight text-[var(--ink)]"
                onClick={() => setCalendarOpen(true)}
              >
                <CalendarDays size={18} strokeWidth={2} />
                {`${DAYS[day]} · ${new Date().toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                })}`}
              </button>
              <Link
                href="/agenda"
                className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-[var(--signal)]"
              >
                Agenda
              </Link>
            </div>
            {todayBlocks.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto overscroll-x-contain px-3.5 py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {todayBlocks.map((b) => {
                  const style = blockStyle(b);
                  return (
                    <div
                      key={b.id}
                      className="shrink-0 rounded-full px-3 py-1.5 text-sm font-medium tabular-nums"
                      style={style.style}
                    >
                      {b.label}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="px-3.5 py-2.5 text-sm text-[color-mix(in_srgb,var(--ink)_45%,transparent)]">
                Nenhum bloco hoje.
              </p>
            )}
          </section>

          {/* Agenda — só no desktop; no mobile fica na aba Agenda */}
          <section className="surface hidden overflow-hidden p-0 lg:block">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] bg-[var(--mist)] px-3.5 py-2.5 md:px-5 md:py-3">
              <button
                type="button"
                title="Abrir calendário do mês"
                aria-label="Abrir calendário do mês"
                className="font-display inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-tag)] text-[15px] font-semibold tracking-tight text-[var(--ink)] transition hover:text-[var(--signal)] md:min-h-0 md:text-lg"
                onClick={() => setCalendarOpen(true)}
              >
                <CalendarDays size={18} strokeWidth={2} />
                {`${DAYS[day]} · ${new Date().toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                })}`}
              </button>
              <button
                type="button"
                title={
                  showFullWeek ? "Mostrar só hoje" : "Mostrar semana toda"
                }
                aria-label={
                  showFullWeek ? "Mostrar só hoje" : "Mostrar semana toda"
                }
                className="inline-flex min-h-10 items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] px-3.5 py-2 text-sm font-medium text-[color-mix(in_srgb,var(--ink)_70%,transparent)] transition hover:bg-[color-mix(in_srgb,var(--ink)_12%,transparent)] hover:text-[var(--ink)] md:min-h-0 md:rounded-[var(--radius-tag)] md:px-2 md:py-1 md:text-xs"
                onClick={() => setWeekOverride(showFullWeek ? false : true)}
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
                        className="min-h-36 min-w-0 bg-[var(--mist)] md:min-h-40"
                      >
                        <div
                          className={`border-b px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider md:px-2 md:py-2 ${
                            isToday
                              ? "relative z-[1] border-[color-mix(in_srgb,var(--signal)_18%,var(--line))] text-[var(--signal)]"
                              : "border-[var(--line)] text-[color-mix(in_srgb,var(--ink)_72%,transparent)]"
                          }`}
                          style={
                            isToday
                              ? {
                                  background:
                                    "color-mix(in srgb, var(--signal) 10%, var(--surface))",
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
              <div className="bg-[var(--surface)] px-3.5 py-2.5 md:px-5 md:py-3">
                <div className="flex flex-wrap items-center gap-2">
                  {todayBlocks.length === 0 && (
                    <p className="text-sm text-[color-mix(in_srgb,var(--ink)_45%,transparent)]">
                      Nenhum bloco hoje.
                    </p>
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

          <section className="surface p-0 max-lg:overflow-visible lg:overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-3.5 py-3 md:px-5 md:py-3.5">
              <h2 className="font-display text-lg font-semibold tracking-tight text-[var(--ink)] md:text-xl">
                Ciclo de Estudos
              </h2>
              <Link
                href="/materias?from=hoje"
                title="Gerenciar matérias"
                aria-label="Gerenciar matérias"
                className="grid size-11 place-items-center rounded-full text-[color-mix(in_srgb,var(--ink)_45%,transparent)] transition hover:bg-[var(--mist)] hover:text-[var(--signal)] lg:size-auto lg:p-1.5"
              >
                <BookMarked size={18} strokeWidth={1.75} />
              </Link>
            </div>

            {exclusiveSoloToday && exclusiveTodayList[0] ? (
              <div className="border-b border-[color-mix(in_srgb,var(--signal)_22%,var(--line))] bg-[color-mix(in_srgb,var(--signal)_10%,var(--surface))] px-3.5 py-3 md:px-5">
                <p className="text-sm font-semibold text-[var(--ink)] md:text-[15px]">
                  Hoje é só{" "}
                  <span className="text-[var(--signal)]">
                    {exclusiveTodayList[0].name}
                  </span>
                </p>
                <p className="mt-1 text-xs leading-snug text-[color-mix(in_srgb,var(--ink)_58%,transparent)] md:text-sm">
                  Ciclo pausado — só anotações neste dia. Amanhã volta como
                  estava.
                </p>
              </div>
            ) : exclusiveCycleToday ? (
              <div className="border-b border-[color-mix(in_srgb,var(--signal)_22%,var(--line))] bg-[color-mix(in_srgb,var(--signal)_10%,var(--surface))] px-3.5 py-3 md:px-5">
                <p className="text-sm font-semibold text-[var(--ink)] md:text-[15px]">
                  Hoje:{" "}
                  <span className="text-[var(--signal)]">
                    {exclusiveTodayList.map((s) => s.name).join(", ")}
                  </span>
                </p>
                <p className="mt-1 text-xs leading-snug text-[color-mix(in_srgb,var(--ink)_58%,transparent)] md:text-sm">
                  Mini-ciclo só destas matérias. O ciclo dos outros dias não
                  muda.
                </p>
              </div>
            ) : null}

            <div className="sticky top-[calc(3rem+env(safe-area-inset-top))] z-10 bg-[var(--surface)]/95 shadow-[0_10px_18px_-14px_color-mix(in_srgb,var(--ink)_45%,transparent)] backdrop-blur-md empty:hidden lg:static lg:bg-transparent lg:shadow-none lg:backdrop-blur-none">
              <StudySessionBar />
            </div>

            <div className="space-y-2.5 p-2.5 lg:hidden">
              {subjects.map((s) => {
                const free = subjectTreatAsFree(s, day, data.subjects);
                const libreInCycle = Boolean(s.is_free) && !free;
                const rot = normalizeRotation(s.rotation);
                const rotItem = rot ? rot.items[rot.index] : null;
                const displayStatus = exclusiveCycleToday
                  ? (s.exclusive_status ?? "prox")
                  : s.status;
                const statusUi = free
                  ? null
                  : cycleStatusPresentation(displayStatus, s.id === queueHeadId);
                return (
                  <div
                    key={s.id}
                    className={`rounded-[14px] px-3.5 py-3.5 ${
                      free
                        ? freeRowClass()
                        : (statusUi?.rowClass ?? "")
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1.5">
                        <span className="inline-flex min-w-0 items-center gap-2.5">
                          <SubjectIcon name={s.name} icon={s.icon} size={36} />
                          <p className="min-w-0 text-base font-semibold leading-snug">
                            {s.name}
                          </p>
                        </span>
                        {libreInCycle && (
                          <span className="rounded-full bg-[var(--signal-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--signal)]">
                            Livre
                          </span>
                        )}
                        {rotItem && (
                          <span className="rounded-full bg-[var(--signal-soft)] px-2.5 py-1 text-xs font-medium text-[var(--signal)]">
                            Da vez: {rotItem.name}
                          </span>
                        )}
                        <SessionSubjectClock subjectId={s.id} compact />
                      </div>
                      {!free && statusUi && (
                        <span
                          className={`inline-flex min-h-8 shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ${statusUi.chipClass}`}
                        >
                          {statusUi.label}
                        </span>
                      )}
                      {free && (
                        <span className="inline-flex min-h-8 shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] text-[color-mix(in_srgb,var(--ink)_65%,transparent)] ring-[var(--line)]">
                          Só hoje
                        </span>
                      )}
                    </div>
                    <AutoGrowTextarea
                      className="mt-2.5 w-full rounded-[10px] border border-[color-mix(in_srgb,var(--ink)_8%,transparent)] bg-[color-mix(in_srgb,var(--surface)_55%,transparent)] px-3 py-2.5 text-base leading-snug text-[color-mix(in_srgb,var(--ink)_84%,transparent)] placeholder:text-[color-mix(in_srgb,var(--ink)_38%,transparent)] focus:border-[var(--signal)] focus:bg-[var(--surface)] focus:text-[var(--ink)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--signal)_16%,transparent)]"
                      value={rotItem ? rotItem.notes : s.notes}
                      placeholder="Anotações…"
                      minPx={44}
                      maxPx={120}
                      onChange={(notes) =>
                        rot && rotItem
                          ? upsertSubject({
                              ...s,
                              rotation: rotationWithItemNotes(
                                rot,
                                rotItem.id,
                                notes,
                              ),
                            })
                          : upsertSubject({ ...s, notes })
                      }
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

            <div className="hidden lg:block">
              <table className="w-full table-fixed border-separate border-spacing-0 text-left">
                <colgroup>
                  <col className="w-[30%]" />
                  <col className="w-[7.25rem]" />
                  <col />
                </colgroup>
                <thead>
                  <tr className="bg-[var(--mist)] text-[11px] font-medium uppercase tracking-[0.06em] text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
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
                    const free = subjectTreatAsFree(s, day, data.subjects);
                    const libreInCycle = Boolean(s.is_free) && !free;
                    const rot = normalizeRotation(s.rotation);
                    const rotItem = rot ? rot.items[rot.index] : null;
                    const displayStatus = exclusiveCycleToday
                      ? (s.exclusive_status ?? "prox")
                      : s.status;
                    const statusUi = free
                      ? null
                      : cycleStatusPresentation(
                          displayStatus,
                          s.id === queueHeadId,
                        );
                    const rowBorder =
                      i < subjects.length - 1
                        ? "border-b-2 border-[var(--surface)]"
                        : "";
                    return (
                      <tr
                        key={s.id}
                        className={`transition-colors ${
                          free
                            ? freeRowClass()
                            : (statusUi?.rowClass ?? "")
                        }`}
                      >
                        <td
                          className={`break-words px-5 py-3.5 align-middle text-base font-medium leading-snug ${rowBorder}`}
                        >
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                            <span className="inline-flex min-w-0 items-center gap-3">
                              <SubjectIcon name={s.name} icon={s.icon} size={36} />
                              <span className="min-w-0">{s.name}</span>
                            </span>
                            {libreInCycle && (
                              <span className="rounded-full bg-[var(--signal-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--signal)]">
                                Livre
                              </span>
                            )}
                            {rotItem && (
                              <span className="rounded-full bg-[var(--signal-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--signal)]">
                                Da vez: {rotItem.name}
                              </span>
                            )}
                            <SessionSubjectClock subjectId={s.id} />
                          </div>
                        </td>
                        <td
                          className={`py-3.5 pl-2 pr-2 align-middle ${rowBorder}`}
                        >
                          {free ? (
                            <span className="inline-flex rounded-full px-2.5 py-1.5 text-xs font-semibold ring-1 bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] text-[color-mix(in_srgb,var(--ink)_65%,transparent)] ring-[var(--line)]">
                              Só hoje
                            </span>
                          ) : statusUi ? (
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1.5 text-xs font-semibold ${statusUi.chipClass}`}
                            >
                              {statusUi.label}
                            </span>
                          ) : null}
                        </td>
                        <td className={`px-5 py-3.5 align-middle ${rowBorder}`}>
                          <div className="flex min-h-[2.25rem] items-start">
                            <AutoGrowTextarea
                              className="w-full break-words rounded-[var(--radius-tag)] border border-transparent bg-transparent px-0 py-0 text-[15px] font-normal leading-snug text-[color-mix(in_srgb,var(--ink)_84%,transparent)] placeholder:text-[color-mix(in_srgb,var(--ink)_38%,transparent)] focus:border-[var(--line)] focus:bg-[var(--surface)] focus:px-2 focus:py-1 focus:text-[var(--ink)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--signal)_14%,transparent)]"
                              value={rotItem ? rotItem.notes : s.notes}
                              placeholder="Anotações…"
                              minPx={22}
                              maxPx={44}
                              rows={1}
                              onChange={(notes) =>
                                rot && rotItem
                                  ? upsertSubject({
                                      ...s,
                                      rotation: rotationWithItemNotes(
                                        rot,
                                        rotItem.id,
                                        notes,
                                      ),
                                    })
                                  : upsertSubject({ ...s, notes })
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

          {/* Ferramentas compactas — mobile/tablet (aba Estudo) */}
          <div className="surface overflow-hidden lg:hidden">
            <FocusTodayCard compact embedded />
            <div className="border-t border-[var(--line)]">
              <SessionClock variant="livre" compact />
            </div>
          </div>
        </div>

        <aside className="hidden space-y-4 lg:sticky lg:top-[4.5rem] lg:block lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto lg:self-start">
          <div className="surface p-3">
            <ReminderBoard compact />
          </div>
          <FocusTodayCard />
          <SessionClock layout="stack" variant="livre" />
        </aside>
      </div>
    </div>
  );
}
