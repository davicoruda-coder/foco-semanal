"use client";

import Link from "next/link";
import { useMemo } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { STATUS_LABEL } from "@/lib/types";
import {
  freeRowClass,
  statusClass,
  statusRowClass,
  subjectShowsOnDay,
  todayIndex,
} from "@/lib/utils";
import { ReminderWatcher } from "@/components/ReminderWatcher";
import { SessionClock } from "@/components/SessionClock";
import { FocusTodayCard } from "@/components/FocusTodayCard";
import { AutoGrowTextarea } from "@/components/AutoGrowTextarea";
import { StudySessionBar } from "@/components/StudySessionChrome";
import { SessionSubjectClock } from "@/components/SessionSubjectClock";

export default function EstudoPage() {
  const { data, upsertSubject } = useApp();
  const day = todayIndex();

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

  return (
    <div>
      <ReminderWatcher />

      <div className="grid items-start gap-3 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-3 sm:space-y-5">
          <section className="surface overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-3.5 py-2.5 md:px-5 md:py-3">
              <h1 className="font-display text-[15px] font-semibold tracking-tight md:text-lg">
                Ciclo de Estudos
              </h1>
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

          <div className="surface overflow-hidden lg:hidden">
            <SessionClock variant="livre" compact />
            <div className="border-t border-[var(--line)]">
              <FocusTodayCard compact embedded />
            </div>
          </div>
        </div>

        <aside className="hidden space-y-4 lg:sticky lg:top-[4.5rem] lg:block lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto lg:self-start">
          <SessionClock layout="stack" variant="livre" />
          <FocusTodayCard />
        </aside>
      </div>
    </div>
  );
}
