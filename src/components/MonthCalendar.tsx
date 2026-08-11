"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { brazilHolidays, dateKey } from "@/lib/holidays";

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function MonthCalendarDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  useEffect(() => {
    if (open) {
      const now = new Date();
      setYear(now.getFullYear());
      setMonth(now.getMonth());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const holidays = useMemo(() => brazilHolidays(year), [year]);

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    // Semana começando na segunda (como o resto do app)
    const lead = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const list: { date: Date | null; holiday?: string }[] = [];
    for (let i = 0; i < lead; i++) list.push({ date: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      list.push({ date, holiday: holidays.get(dateKey(date)) });
    }
    return list;
  }, [year, month, holidays]);

  const monthHolidays = useMemo(
    () =>
      cells.filter(
        (c): c is { date: Date; holiday: string } =>
          Boolean(c.date && c.holiday),
      ),
    [cells],
  );

  if (!open) return null;

  const todayKey = dateKey(today);

  function shift(delta: number) {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal
      aria-label="Calendário"
      onClick={onClose}
    >
      <div
        className="surface w-full max-w-md overflow-hidden p-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-3">
          <button
            type="button"
            title="Mês anterior"
            aria-label="Mês anterior"
            className="rounded-full p-1.5 transition hover:bg-[var(--mist)]"
            onClick={() => shift(-1)}
          >
            <ChevronLeft size={18} strokeWidth={2} />
          </button>
          <p className="font-display text-base font-semibold tracking-tight">
            {MONTHS[month]} {year}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Próximo mês"
              aria-label="Próximo mês"
              className="rounded-full p-1.5 transition hover:bg-[var(--mist)]"
              onClick={() => shift(1)}
            >
              <ChevronRight size={18} strokeWidth={2} />
            </button>
            <button
              type="button"
              title="Fechar"
              aria-label="Fechar"
              className="rounded-full p-1.5 transition hover:bg-[var(--mist)]"
              onClick={onClose}
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wider opacity-50">
            {WEEKDAYS.map((d) => (
              <span key={d} className="py-1">
                {d}
              </span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((c, i) => {
              if (!c.date) return <span key={`empty-${i}`} />;
              const isToday = dateKey(c.date) === todayKey;
              const isHoliday = Boolean(c.holiday);
              return (
                <div
                  key={dateKey(c.date)}
                  title={c.holiday}
                  className={`relative grid h-10 place-items-center rounded-[var(--radius-tag)] text-sm transition ${
                    isToday
                      ? "bg-[var(--signal)] font-semibold text-white"
                      : isHoliday
                        ? "bg-[color-mix(in_srgb,var(--warn)_18%,var(--surface))] font-medium text-[var(--warn)]"
                        : "hover:bg-[var(--mist)]"
                  }`}
                >
                  {c.date.getDate()}
                  {isHoliday && !isToday && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[var(--warn)]" />
                  )}
                </div>
              );
            })}
          </div>

          {monthHolidays.length > 0 && (
            <div className="mt-3 space-y-1 border-t border-[var(--line)] pt-3">
              {monthHolidays.map((h) => (
                <p
                  key={dateKey(h.date)}
                  className="flex items-baseline gap-2 text-xs"
                >
                  <span className="font-mono-num font-semibold text-[var(--warn)]">
                    {String(h.date.getDate()).padStart(2, "0")}
                  </span>
                  <span className="opacity-75">{h.holiday}</span>
                </p>
              ))}
            </div>
          )}
          {monthHolidays.length === 0 && (
            <p className="mt-3 border-t border-[var(--line)] pt-3 text-xs opacity-50">
              Sem feriados nacionais neste mês.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
