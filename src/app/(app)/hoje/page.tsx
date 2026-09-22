"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BookMarked,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  RotateCcw,
} from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { useStudyFlow } from "@/components/StudyFlowProvider";
import { DAYS } from "@/lib/types";
import {
  blockStyle,
  cycleStatusPresentation,
  exclusiveSubjectsOnDay,
  isExclusiveCycleDay,
  isExclusiveSoloDay,
  freeRowClass,
  formatSubjectFocusList,
  normalizeRotation,
  buildWeightedCycleQueue,
  nextCycleSubjectId,
  rotationWithItemNotes,
  rotationWithItemRecursos,
  subjectsOnDay,
  subjectTreatAsFree,
  todayIndex,
} from "@/lib/utils";
import { SubjectResources } from "@/components/SubjectResources";
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
  const { data, upsertSubject, resetCycleToday } = useApp();
  const flow = useStudyFlow();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [showFullCycle, setShowFullCycle] = useState(false);
  /** null = padrão (só hoje); true = semana; false = só hoje forçado */
  const [weekOverride, setWeekOverride] = useState<boolean | null>(null);
  const day = todayIndex();

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

  const subjects = useMemo(() => {
    const base = [...subjectsOnDay(data.subjects, day)];
    const queue = buildWeightedCycleQueue(data.subjects, day);

    // Se há uma sessão ativa ou bloco em preview, as matérias do bloco têm prioridade máxima na ordem de estudo
    const activeBlockIds = flow.sessionActive
      ? flow.block.slice(flow.currentIndex).map((s) => s.id)
      : flow.previewBlock.map((s) => s.id);

    return base.sort((a, b) => {
      const freeA = subjectTreatAsFree(a, day, data.subjects);
      const freeB = subjectTreatAsFree(b, day, data.subjects);

      const inBlockA = activeBlockIds.indexOf(a.id);
      const inBlockB = activeBlockIds.indexOf(b.id);

      const isDoneA = (exclusiveCycleToday ? a.exclusive_status : a.status) === "ok";
      const isDoneB = (exclusiveCycleToday ? b.exclusive_status : b.status) === "ok";

      // 0: Matérias do bloco em execução (em ordem do bloco: atual primeiro, depois as seguintes)
      // 1: Demais matérias pendentes na fila geral
      // 2: Matérias livres standalone
      // 3: Matérias já concluídas
      const groupA =
        !isDoneA && inBlockA !== -1
          ? 0
          : !isDoneA && queue.some((q) => q.id === a.id)
            ? 1
            : freeA
              ? 2
              : 3;
      const groupB =
        !isDoneB && inBlockB !== -1
          ? 0
          : !isDoneB && queue.some((q) => q.id === b.id)
            ? 1
            : freeB
              ? 2
              : 3;

      if (groupA !== groupB) return groupA - groupB;

      // Dentro do bloco ativo, ordena rigorosamente pela ordem de estudo do bloco
      if (groupA === 0) {
        return inBlockA - inBlockB;
      }

      // Dentro da fila geral, ordena pela fila ponderada
      if (groupA === 1) {
        const idxA = queue.findIndex((q) => q.id === a.id);
        const idxB = queue.findIndex((q) => q.id === b.id);
        return idxA - idxB;
      }

      return a.cycle_order - b.cycle_order;
    });
  }, [
    data.subjects,
    day,
    flow.sessionActive,
    flow.block,
    flow.currentIndex,
    flow.previewBlock,
    exclusiveCycleToday,
  ]);

  const queueHeadId = useMemo(() => {
    if (flow.sessionActive) {
      const remainingBlock = flow.block.slice(flow.currentIndex + 1);
      if (remainingBlock.length > 0) {
        return remainingBlock[0].id;
      }
      const activeIds = new Set(
        flow.block.slice(flow.currentIndex).map((s) => s.id),
      );
      const queue = buildWeightedCycleQueue(data.subjects, day);
      const nextInQueue = queue.find((q) => !activeIds.has(q.id));
      return nextInQueue?.id ?? null;
    }
    if (flow.previewBlock.length > 0) {
      return flow.previewBlock[0].id;
    }
    return nextCycleSubjectId(data.subjects, day);
  }, [
    flow.sessionActive,
    flow.block,
    flow.currentIndex,
    flow.previewBlock,
    data.subjects,
    day,
  ]);

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

  const { visibleSubjects, hiddenDone, hiddenPending } = useMemo(() => {
    // Subjects currently in the session block (running or about to start)
    const sessionIds = new Set(
      (flow.sessionActive ? flow.block : flow.previewBlock).map((s) => s.id)
    );

    const active = subjects.filter((s) => {
      const free = subjectTreatAsFree(s, day, data.subjects);
      if (free) return true; // keep standalone chronometers visible
      return sessionIds.has(s.id);
    });
    
    const hidden = subjects.filter((s) => !active.includes(s));
    let hd = 0;
    let hp = 0;
    hidden.forEach((s) => {
      const displayStatus = exclusiveCycleToday ? (s.exclusive_status ?? "prox") : s.status;
      if (displayStatus === "ok") hd++;
      else hp++;
    });

    return {
      visibleSubjects: showFullCycle ? subjects : active,
      hiddenDone: hd,
      hiddenPending: hp,
    };
  }, [
    showFullCycle,
    subjects,
    day,
    data.subjects,
    exclusiveCycleToday,
    flow.sessionActive,
    flow.block,
    flow.previewBlock,
  ]);

  const hasHidden = hiddenDone > 0 || hiddenPending > 0;

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
                title={showFullWeek ? "Mostrar apenas hoje" : "Mostrar grade da semana toda"}
                aria-label={
                  showFullWeek ? "Mostrar apenas hoje" : "Mostrar grade da semana toda"
                }
                className="inline-flex min-h-10 items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] px-3.5 py-2 text-sm font-medium text-[color-mix(in_srgb,var(--ink)_70%,transparent)] transition hover:bg-[color-mix(in_srgb,var(--ink)_12%,transparent)] hover:text-[var(--ink)] md:min-h-0 md:rounded-[var(--radius-tag)] md:px-2.5 md:py-1 md:text-xs"
                onClick={() => setWeekOverride(showFullWeek ? false : true)}
              >
                {showFullWeek ? (
                  <>
                    <ChevronUp size={14} strokeWidth={2} /> Ocultar grade
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} strokeWidth={2} /> Grade semanal
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
                        className={`min-h-36 min-w-0 md:min-h-40 ${
                          isToday ? "bg-[var(--surface)]" : "bg-[var(--mist)]"
                        }`}
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
                                className="rounded-[var(--radius-tag)] px-2.5 py-1.5 text-sm font-medium leading-snug break-words hyphens-auto tabular-nums md:text-xs lg:text-sm border border-black/[0.05] shadow-xs"
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
                  {todayBlocks.map((b, idx) => {
                    const style = blockStyle(b, { pill: true });
                    return (
                      <div key={b.id} className="inline-flex items-center gap-2">
                        {idx > 0 && (
                          <ChevronRight
                            size={14}
                            strokeWidth={2.5}
                            className="shrink-0 text-[color-mix(in_srgb,var(--ink)_35%,transparent)]"
                            aria-hidden="true"
                          />
                        )}
                        <div
                          className="rounded-full px-3 py-1 text-sm font-medium tabular-nums shadow-xs"
                          style={style.style}
                        >
                          {b.label}
                        </div>
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
              <div className="flex items-center gap-1.5">
                {flow.cycleCompleted && (
                  <button
                    type="button"
                    onClick={resetCycleToday}
                    title="Reiniciar ciclo de estudos"
                    aria-label="Reiniciar ciclo de estudos"
                    className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--signal)_12%,transparent)] px-2.5 text-xs font-semibold text-[var(--signal)] transition hover:bg-[color-mix(in_srgb,var(--signal)_20%,transparent)] active:scale-95"
                  >
                    <RotateCcw size={13} strokeWidth={2.5} />
                    Reiniciar ciclo
                  </button>
                )}
                <Link
                  href="/materias"
                  title="Gerenciar matérias"
                  aria-label="Gerenciar matérias"
                  className="inline-flex size-9 items-center justify-center rounded-full text-[color-mix(in_srgb,var(--ink)_50%,transparent)] transition hover:bg-[var(--mist)] hover:text-[var(--signal)] md:size-8"
                >
                  <BookMarked size={18} strokeWidth={1.75} />
                </Link>
              </div>
            </div>

            {(exclusiveSoloToday || exclusiveCycleToday) &&
            exclusiveTodayList.length > 0 ? (
              <div className="border-b border-[color-mix(in_srgb,var(--signal)_22%,var(--line))] bg-[color-mix(in_srgb,var(--signal)_10%,var(--surface))] px-3.5 py-3 md:px-5">
                <p className="text-sm font-semibold text-[var(--ink)] md:text-[15px]">
                  Hoje o foco é{" "}
                  <span className="text-[var(--signal)]">
                    {formatSubjectFocusList(
                      exclusiveTodayList.map((s) => s.name),
                    )}
                  </span>
                </p>
              </div>
            ) : null}

            <div className="sticky top-[calc(3rem+env(safe-area-inset-top))] z-10 bg-[var(--surface)]/95 shadow-[0_10px_18px_-14px_color-mix(in_srgb,var(--ink)_45%,transparent)] backdrop-blur-md empty:hidden lg:static lg:bg-transparent lg:shadow-none lg:backdrop-blur-none">
              <StudySessionBar />
            </div>

            <div className="space-y-2.5 p-2.5 lg:hidden">
              {visibleSubjects.map((s) => {
                const free = subjectTreatAsFree(s, day, data.subjects);
                const libreInCycle = Boolean(s.is_free) && !free;
                const rot = normalizeRotation(s.rotation);
                const rotItem = rot ? rot.items[rot.index] : null;
                const displayStatus = exclusiveCycleToday
                  ? (s.exclusive_status ?? "prox")
                  : s.status;
                const isCurrentSession =
                  flow.sessionActive && s.id === flow.currentSubjectId;
                const statusUi = free
                  ? null
                  : isCurrentSession
                    ? {
                        label:
                          flow.phase === "paused" ? "Pausada" : "Em estudo",
                        chipClass:
                          "bg-[var(--signal)] text-white ring-1 ring-[var(--signal)] font-semibold shadow-xs",
                        rowClass:
                          "bg-[var(--surface)] border border-[color-mix(in_srgb,var(--signal)_35%,var(--line))] shadow-[0_2px_10px_-2px_color-mix(in_srgb,var(--signal)_16%,transparent)] border-l-[4px] border-l-[var(--signal)]",
                      }
                    : cycleStatusPresentation(
                        displayStatus,
                        s.id === queueHeadId,
                      );
                return (
                  <div
                    key={s.id}
                    className={`rounded-[14px] px-3 py-2.5 ${
                      free
                        ? freeRowClass()
                        : (statusUi?.rowClass ?? "")
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1.5">
                        <span className="inline-flex min-w-0 items-center gap-2.5">
                          <SubjectIcon name={s.name} icon={s.icon} size={32} />
                          <p className="min-w-0 text-base font-semibold leading-snug">
                            {s.name}
                          </p>
                        </span>
                        {(s.weight ?? 1) > 1 && (
                          <span
                            className="rounded-full border border-[color-mix(in_srgb,var(--signal)_35%,transparent)] bg-[color-mix(in_srgb,var(--signal)_12%,transparent)] px-2 py-0.5 text-[11px] font-semibold text-[var(--signal)]"
                            title={`Ciclo ponderado: ${Math.min(s.cycle_done ?? 0, s.weight ?? 1)} de ${s.weight} concluídos`}
                          >
                            {Math.min(s.cycle_done ?? 0, s.weight ?? 1)}/{s.weight}
                          </span>
                        )}
                        {libreInCycle && (
                          <span className="rounded-full bg-[var(--signal-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--signal)]">
                            Livre
                          </span>
                        )}
                        {rotItem && (
                          <span className="rounded-full bg-[var(--signal-soft)] px-2.5 py-1 text-xs font-medium text-[var(--signal)]">
                            {rotItem.name}
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
                    </div>
                    <AutoGrowTextarea
                      className="mt-2.5 w-full rounded-[10px] border border-[color-mix(in_srgb,var(--ink)_8%,transparent)] bg-[color-mix(in_srgb,var(--surface)_55%,transparent)] px-3 py-2.5 text-base leading-snug text-[color-mix(in_srgb,var(--ink)_84%,transparent)] placeholder:text-[color-mix(in_srgb,var(--ink)_38%,transparent)] focus:border-[var(--signal)] focus:bg-[var(--surface)] focus:text-[var(--ink)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--signal)_16%,transparent)]"
                      value={rotItem ? rotItem.notes : s.notes}
                      placeholder="Anotações…"
                      minPx={22}
                      maxPx={120}
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
                    <SubjectResources
                      recursos={rotItem ? rotItem.recursos : s.recursos}
                      onChange={(recursos) =>
                        rot && rotItem
                          ? upsertSubject({
                              ...s,
                              rotation: rotationWithItemRecursos(
                                rot,
                                rotItem.id,
                                recursos,
                              ),
                            })
                          : upsertSubject({ ...s, recursos })
                      }
                    />
                  </div>
                );
              })}
              {subjects.length === 0 && (
                <p className="px-2 py-8 text-center text-sm opacity-55">
                  Nenhuma matéria para hoje —{" "}
                  <Link
                    href="/materias"
                    className="text-[var(--signal)]"
                  >
                    gerenciar
                  </Link>
                </p>
              )}
              {hasHidden && (
                <button
                  onClick={() => setShowFullCycle(!showFullCycle)}
                  className="mt-1 inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] px-3 py-1.5 text-xs font-medium text-[color-mix(in_srgb,var(--ink)_70%,transparent)] transition hover:bg-[color-mix(in_srgb,var(--ink)_12%,transparent)] hover:text-[var(--ink)]"
                >
                  {showFullCycle ? (
                    <>
                      <ChevronUp size={13} strokeWidth={2} />
                      Ver menos
                    </>
                  ) : (
                    <>
                      <ChevronDown size={13} strokeWidth={2} />
                      Ver todas ({subjects.length})
                    </>
                  )}
                </button>
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
                  {visibleSubjects.map((s, i) => {
                    const free = subjectTreatAsFree(s, day, data.subjects);
                    const libreInCycle = Boolean(s.is_free) && !free;
                    const rot = normalizeRotation(s.rotation);
                    const rotItem = rot ? rot.items[rot.index] : null;
                    const displayStatus = exclusiveCycleToday
                      ? (s.exclusive_status ?? "prox")
                      : s.status;
                    const isCurrentSession =
                      flow.sessionActive && s.id === flow.currentSubjectId;
                    const statusUi = free
                      ? null
                      : isCurrentSession
                        ? {
                            label:
                              flow.phase === "paused" ? "Pausada" : "Em estudo",
                            chipClass:
                              "bg-[var(--signal)] text-white ring-1 ring-[var(--signal)] font-semibold shadow-xs",
                            rowClass:
                              "bg-[var(--surface)] border border-[color-mix(in_srgb,var(--signal)_35%,var(--line))] shadow-[0_2px_10px_-2px_color-mix(in_srgb,var(--signal)_16%,transparent)] border-l-[4px] border-l-[var(--signal)]",
                          }
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
                          className={`break-words px-4 py-3.5 align-middle text-base font-medium leading-snug ${rowBorder}`}
                        >
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                            <span className="inline-flex min-w-0 items-center gap-3">
                              <SubjectIcon name={s.name} icon={s.icon} size={32} />
                              <span className="min-w-0">{s.name}</span>
                            </span>
                            {(s.weight ?? 1) > 1 && (
                              <span
                                className="rounded-full border border-[color-mix(in_srgb,var(--signal)_35%,transparent)] bg-[color-mix(in_srgb,var(--signal)_12%,transparent)] px-2 py-0.5 text-[11px] font-semibold text-[var(--signal)]"
                                title={`Ciclo ponderado: ${Math.min(s.cycle_done ?? 0, s.weight ?? 1)} de ${s.weight} concluídos`}
                              >
                                {Math.min(s.cycle_done ?? 0, s.weight ?? 1)}/{s.weight}
                              </span>
                            )}
                            {libreInCycle && (
                              <span className="rounded-full bg-[var(--signal-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--signal)]">
                                Livre
                              </span>
                            )}
                            {rotItem && (
                              <span className="rounded-full bg-[var(--signal-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--signal)]">
                                {rotItem.name}
                              </span>
                            )}
                            <SessionSubjectClock subjectId={s.id} />
                          </div>
                        </td>
                        <td
                          className={`py-3.5 px-2 align-middle ${rowBorder}`}
                        >
                          {free ? (
                            <span className="text-xs text-[color-mix(in_srgb,var(--ink)_35%,transparent)]">
                              —
                            </span>
                          ) : statusUi ? (
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusUi.chipClass}`}
                            >
                              {statusUi.label}
                            </span>
                          ) : null}
                        </td>
                        <td className={`px-4 py-3.5 align-middle ${rowBorder}`}>
                          <div className="flex items-start">
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
                          <SubjectResources
                            compact
                            recursos={rotItem ? rotItem.recursos : s.recursos}
                            onChange={(recursos) =>
                              rot && rotItem
                                ? upsertSubject({
                                    ...s,
                                    rotation: rotationWithItemRecursos(
                                      rot,
                                      rotItem.id,
                                      recursos,
                                    ),
                                  })
                                : upsertSubject({ ...s, recursos })
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {subjects.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-5 py-8 text-sm opacity-55">
                        Nenhuma matéria para hoje —{" "}
                        <Link
                          href="/materias"
                          className="text-[var(--signal)]"
                        >
                          gerenciar
                        </Link>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {hasHidden && (
                <div className="px-5 pb-3 pt-1">
                  <button
                    onClick={() => setShowFullCycle(!showFullCycle)}
                    className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] px-2.5 py-1 text-xs font-medium text-[color-mix(in_srgb,var(--ink)_70%,transparent)] transition hover:bg-[color-mix(in_srgb,var(--ink)_12%,transparent)] hover:text-[var(--ink)]"
                  >
                    {showFullCycle ? (
                      <>
                        <ChevronUp size={13} strokeWidth={2} />
                        Ver menos
                      </>
                    ) : (
                      <>
                        <ChevronDown size={13} strokeWidth={2} />
                        Ver todas ({subjects.length})
                      </>
                    )}
                  </button>
                </div>
              )}
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

        <aside className="hidden space-y-3 lg:sticky lg:top-[4.5rem] lg:block lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto lg:self-start scrollbar-subtle">
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
