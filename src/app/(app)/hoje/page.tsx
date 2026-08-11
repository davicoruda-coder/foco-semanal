"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, Settings, SlidersHorizontal, Target } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { DAYS, STATUS_LABEL, type SubjectStatus } from "@/lib/types";
import { blockStyle, statusClass, statusRowClass, todayIndex } from "@/lib/utils";
import { ReminderWatcher } from "@/components/ReminderWatcher";
import { ReminderBoard } from "@/components/ReminderBoard";
import { SessionClock } from "@/components/SessionClock";

export default function HojePage() {
  const { data, upsertSubject, setSubjectStatus } = useApp();
  const [showWeek, setShowWeek] = useState(false);
  const day = todayIndex();

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

  const visibleDays = showWeek
    ? DAYS.map((name, i) => ({ name, i }))
    : [{ name: DAYS[day], i: day }];

  return (
    <div className="mx-auto max-w-6xl">
      <ReminderWatcher />

      <header className="mb-5">
        <div className="flex items-center gap-3">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white md:h-11 md:w-11"
            style={{
              background:
                "linear-gradient(135deg, var(--signal), var(--accent-2))",
              boxShadow: "var(--shadow-md)",
            }}
            aria-hidden
          >
            <Target size={22} strokeWidth={2.25} />
          </span>
          <p className="min-w-0 flex-1 font-display text-4xl font-semibold tracking-tight md:text-5xl">
            Foco Diário
          </p>
          <Link
            href="/configuracoes"
            title="Configurações"
            aria-label="Configurações"
            className="shrink-0 rounded-full p-2 text-[color-mix(in_srgb,var(--ink)_45%,transparent)] transition hover:bg-[var(--mist)] hover:text-[var(--signal)] md:hidden"
          >
            <Settings size={22} strokeWidth={1.75} />
          </Link>
        </div>
      </header>

      <section className="surface mb-6 overflow-hidden p-0">
        <div
          className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-white md:px-5"
          style={{
            background:
              "linear-gradient(120deg, var(--signal), color-mix(in srgb, var(--signal) 55%, var(--accent-2)))",
          }}
        >
          <p className="font-display text-base font-semibold tracking-tight md:text-lg">
            {showWeek ? "Semana" : `${DAYS[day]} · hoje`}
          </p>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-[var(--radius-tag)] bg-white/15 p-1.5 transition hover:bg-white/25"
            onClick={() => setShowWeek((v) => !v)}
            title={showWeek ? "Mostrar só hoje" : "Mostrar semana"}
            aria-label={showWeek ? "Mostrar só hoje" : "Mostrar semana"}
          >
            <CalendarDays size={16} strokeWidth={1.75} />
          </button>
        </div>

        <div className="grid lg:grid-cols-[1fr_220px]">
          <div className={showWeek ? "overflow-x-auto" : ""}>
            {!showWeek ? (
              <div className="bg-[var(--signal-soft)]/60 p-4 md:p-5">
                <div className="flex flex-wrap gap-2">
                  {todayBlocks.length === 0 && (
                    <p className="text-sm opacity-55">Nenhum bloco hoje.</p>
                  )}
                  {todayBlocks.map((b) => {
                    const style = blockStyle(b);
                    return (
                    <div
                      key={b.id}
                      className="rounded-[var(--radius-tag)] px-3 py-2 text-sm font-medium"
                      style={style.style}
                    >
                      {b.label}
                    </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                <div className="grid min-w-[720px] grid-cols-7 divide-x divide-[var(--line)]">
                  {visibleDays.map(({ name, i }) => {
                    const blocks = data.week_blocks
                      .filter((b) => b.day === i)
                      .sort((a, b) => a.sort_order - b.sort_order);
                    const isToday = i === day;
                    return (
                      <div
                        key={name}
                        className={`min-h-44 ${isToday ? "bg-[var(--signal-soft)]/50" : "bg-[var(--surface)]/40"}`}
                      >
                        <div
                          className={`border-b border-[var(--line)] px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider ${
                            isToday ? "text-[var(--signal)]" : "opacity-55"
                          }`}
                        >
                          {name.slice(0, 3)}
                          {isToday ? " · hoje" : ""}
                        </div>
                        <div className="space-y-1.5 p-2">
                          {blocks.length === 0 && (
                            <p className="px-1 text-[11px] opacity-40">—</p>
                          )}
                          {blocks.map((b) => {
                            const style = blockStyle(b);
                            return (
                            <div
                              key={b.id}
                              className="rounded-[var(--radius-tag)] px-2 py-1.5 text-xs font-medium leading-snug"
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
                <div className="border-t border-[var(--line)] px-4 py-2">
                  <Link
                    href="/semana"
                    className="text-xs font-medium text-[var(--signal)]"
                  >
                    Editar grade →
                  </Link>
                </div>
              </div>
            )}
          </div>

          <aside className="border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--mist)_70%,var(--surface))] p-4 lg:border-l lg:border-t-0">
            <ReminderBoard compact />
          </aside>
        </div>
      </section>

      <div className="mb-6">
        <SessionClock />
      </div>

      <section className="surface mt-6 overflow-hidden p-0">
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

        <div>
          <table className="w-full table-fixed border-separate border-spacing-0 text-left">
            <colgroup>
              <col className="w-[30%]" />
              <col className="w-[26%] sm:w-40" />
              <col />
            </colgroup>
            <thead>
              <tr className="bg-[var(--mist)] text-xs uppercase tracking-wider opacity-60">
                <th className="border-b border-[var(--line)] px-3 py-3 font-medium md:px-5">
                  Matéria
                </th>
                <th className="border-b border-[var(--line)] px-2 py-3 font-medium md:px-3">
                  Conclusão
                </th>
                <th className="border-b border-[var(--line)] px-3 py-3 font-medium md:px-5">
                  Obs.
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
                    className={`break-words px-3 py-3 align-top font-medium md:px-5 ${
                      i < subjects.length - 1
                        ? "border-b-2 border-[var(--surface)]"
                        : ""
                    }`}
                  >
                    {s.name}
                  </td>
                  <td
                    className={`px-2 py-3 align-top md:px-3 ${
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
                    className={`px-3 py-3 align-top md:px-5 ${
                      i < subjects.length - 1
                        ? "border-b-2 border-[var(--surface)]"
                        : ""
                    }`}
                  >
                    <textarea
                      className="min-h-14 w-full resize-y break-words rounded-[var(--radius-tag)] border border-transparent bg-transparent px-2 py-1 text-sm outline-none focus:border-[var(--line)] focus:bg-[var(--surface)]"
                      value={s.notes}
                      placeholder="Observações…"
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
    </div>
  );
}
