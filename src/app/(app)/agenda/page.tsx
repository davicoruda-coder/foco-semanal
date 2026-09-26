"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Pencil,
} from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { DAYS } from "@/lib/types";
import { blockStyle, todayIndex } from "@/lib/utils";
import { MonthCalendarDialog } from "@/components/MonthCalendar";

/** Com muitos blocos no dia, encolhe para “só hoje”. */
const COMPACT_WEEK_THRESHOLD = 6;

export default function AgendaPage() {
  const { data } = useApp();
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

  const todayBlocks = useMemo(
    () =>
      data.week_blocks
        .filter((b) => b.day === day)
        .sort((a, b) => a.sort_order - b.sort_order),
    [data.week_blocks, day],
  );

  const autoCompact =
    todayBlocks.length >= COMPACT_WEEK_THRESHOLD || narrow;
  const showFullWeek = weekOverride ?? !autoCompact;
  const showWeekToggle = autoCompact || weekOverride !== null;

  const weekDays = DAYS.map((name, i) => ({ name, i }));

  return (
    <div className="space-y-4 sm:space-y-5">
      <MonthCalendarDialog
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
        <h1 className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-[var(--ink)]">
          Agenda
        </h1>
        <Link
          href="/semana"
          title="Editar grade semanal (adicionar, mover ou renomear matérias)"
          aria-label="Editar grade semanal"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--ink)] shadow-xs transition hover:border-[var(--signal)] hover:text-[var(--signal)] active:scale-95 sm:min-h-10 sm:px-3.5 sm:text-sm"
        >
          <Pencil size={13} strokeWidth={2} />
          <span>Editar grade</span>
        </Link>
      </div>

      <section className="surface overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] bg-[var(--mist)] px-3.5 py-2.5 md:px-5 md:py-3">
          <button
            type="button"
            title="Abrir calendário do mês"
            aria-label="Abrir calendário do mês"
            className="font-display inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-tag)] text-[15px] font-semibold tracking-tight text-[var(--ink)] transition hover:text-[var(--signal)] md:min-h-0 md:text-lg"
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
                showFullWeek
                  ? narrow
                    ? "Mostrar hoje"
                    : "Mostrar só hoje"
                  : "Mostrar semana toda"
              }
              aria-label={
                showFullWeek
                  ? narrow
                    ? "Mostrar hoje"
                    : "Mostrar só hoje"
                  : "Mostrar semana toda"
              }
              className="inline-flex min-h-11 items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] px-3.5 py-2 text-sm font-medium text-[color-mix(in_srgb,var(--ink)_70%,transparent)] transition hover:bg-[color-mix(in_srgb,var(--ink)_12%,transparent)] hover:text-[var(--ink)] md:min-h-0 md:rounded-[var(--radius-tag)] md:px-2 md:py-1 md:text-xs"
              onClick={() => setWeekOverride(!showFullWeek)}
            >
              {showFullWeek ? (
                <>
                  <ChevronUp size={14} strokeWidth={2} />
                  <span className="md:hidden">Hoje</span>
                  <span className="hidden md:inline">Só hoje</span>
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
                    className={`min-h-[min(58vh,28rem)] min-w-0 transition-colors md:min-h-44 ${
                      isToday
                        ? "bg-[color-mix(in_srgb,var(--signal)_4%,var(--surface))]"
                        : "bg-[var(--mist)]/75"
                    }`}
                  >
                    <div
                      className={`border-b px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wider transition-colors md:px-2 md:py-2 ${
                        isToday
                          ? "relative z-[1] border-b-2 border-b-[var(--signal)] bg-[color-mix(in_srgb,var(--signal)_12%,var(--surface))] font-bold text-[var(--signal)] shadow-xs"
                          : "border-[var(--line)] bg-[var(--mist)] text-[color-mix(in_srgb,var(--ink)_68%,transparent)]"
                      }`}
                    >
                      <span className="inline-flex items-center justify-center gap-1.5">
                        {name.slice(0, 3)}
                        {isToday && (
                          <span
                            className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--signal)]"
                            title="Hoje"
                          />
                        )}
                      </span>
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
                            className={`rounded-[var(--radius-tag)] px-2 py-2 text-sm font-medium leading-snug break-words hyphens-auto tabular-nums shadow-xs transition-colors md:px-2 md:py-1.5 md:text-xs lg:text-sm ${style.className}`}
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
          <div className="bg-[var(--surface)] px-3.5 py-3 md:px-5">
            <div className="flex flex-col gap-2">
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
                    className={`rounded-[var(--radius-tag)] px-3 py-2.5 text-sm font-medium leading-snug break-words tabular-nums shadow-xs transition-colors ${style.className}`}
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
    </div>
  );
}
