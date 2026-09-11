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
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          Agenda
        </h1>
        <Link
          href="/semana"
          title="Editar semana"
          aria-label="Editar semana"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-[var(--radius-btn)] px-3 text-sm font-medium text-[color-mix(in_srgb,var(--ink)_70%,transparent)] transition hover:bg-[var(--mist)] hover:text-[var(--ink)]"
        >
          <Pencil size={16} strokeWidth={1.75} />
          <span className="hidden sm:inline">Editar semana</span>
        </Link>
      </div>

      <section className="surface overflow-hidden p-0">
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

      <p className="px-0.5 text-sm opacity-60">
        Para criar ou reordenar blocos, use{" "}
        <Link href="/semana" className="text-[var(--signal)]">
          Editar semana
        </Link>
        .
      </p>
    </div>
  );
}
