"use client";

import { useState } from "react";
import {
  Bell,
  BellOff,
  Circle,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ensureNotificationPermission } from "@/lib/audio";
import { plainTextFromHtml } from "@/lib/note-html";
import type { Reminder } from "@/lib/types";
import { sanitizeCssColor } from "@/lib/utils";

const NOTE_COLORS = [
  "#FDE68A",
  "#A7F3D0",
  "#FBCFE8",
  "#BFDBFE",
  "#FECACA",
  "#DDD6FE",
];

function toLocalInput(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(+d)) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function noteText(value: string) {
  return plainTextFromHtml(value);
}

function NoteCard({
  reminder,
  onAskDelete,
  compact,
}: {
  reminder: Reminder;
  onAskDelete: (r: Reminder) => void;
  compact?: boolean;
}) {
  const { upsertReminder } = useApp();
  const [alarmOpen, setAlarmOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [when, setWhen] = useState(
    reminder.has_alarm ? toLocalInput(reminder.notify_at) : "",
  );
  const currentColor = sanitizeCssColor(reminder.color, "#FDE68A");

  function openColor() {
    setAlarmOpen(false);
    setColorOpen((v) => !v);
  }

  function openAlarm() {
    setColorOpen(false);
    setWhen(reminder.has_alarm ? toLocalInput(reminder.notify_at) : "");
    setAlarmOpen((v) => !v);
  }

  function toggleMenu() {
    setMenuOpen((open) => {
      if (open) {
        setColorOpen(false);
        setAlarmOpen(false);
      }
      return !open;
    });
  }

  const actionBtn =
    "inline-flex h-11 min-h-11 w-11 min-w-11 items-center justify-center rounded-lg opacity-70 transition hover:bg-white/50 hover:opacity-100";

  function ActionButtons() {
    return (
      <>
        <button
          type="button"
          className={actionBtn}
          title="Trocar cor"
          aria-label="Trocar cor"
          onClick={openColor}
        >
          <Circle
            size={20}
            strokeWidth={1.75}
            fill={currentColor}
            className="shrink-0"
          />
        </button>
        <button
          type="button"
          className={actionBtn}
          title={reminder.has_alarm ? "Editar alarme" : "Adicionar alarme"}
          aria-label={
            reminder.has_alarm ? "Editar alarme" : "Adicionar alarme"
          }
          onClick={openAlarm}
        >
          {reminder.has_alarm ? (
            <Bell size={20} strokeWidth={1.75} />
          ) : (
            <BellOff size={20} strokeWidth={1.75} />
          )}
        </button>
        <button
          type="button"
          className={`${actionBtn} hover:text-[var(--warn)]`}
          title="Excluir"
          aria-label="Excluir"
          onClick={() => onAskDelete(reminder)}
        >
          <Trash2 size={20} strokeWidth={1.75} />
        </button>
      </>
    );
  }

  return (
    <article
      className="note-enter relative flex min-h-[128px] flex-col rounded-[var(--radius-tag)] p-3 shadow-sm"
      style={{
        background: currentColor,
        color: "#292524",
      }}
    >
      <textarea
        className={`w-full flex-1 resize-none bg-transparent font-normal leading-relaxed outline-none placeholder:opacity-40 ${
          compact
            ? "min-h-[72px] text-lg"
            : "min-h-[60px] text-base"
        }`}
        placeholder="Escreva…"
        value={noteText(reminder.title)}
        rows={3}
        onChange={(e) =>
          upsertReminder({ ...reminder, title: e.target.value })
        }
      />

      {reminder.has_alarm && !alarmOpen && (
        <p className="font-mono-num text-xs opacity-70">
          ⏰{" "}
          {new Date(reminder.notify_at).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}

      {alarmOpen && (
        <div className="mt-1 space-y-2 rounded-[var(--radius-tag)] bg-white/70 p-2">
          <input
            type="datetime-local"
            className="input px-2 py-2 text-sm sm:px-1.5 sm:py-1 sm:text-xs"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
          />
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              className="rounded-md px-3 py-2 text-sm font-medium bg-[var(--signal)] text-white sm:px-2 sm:py-1 sm:text-xs"
              onClick={() => {
                if (!when) return;
                void ensureNotificationPermission();
                upsertReminder({
                  ...reminder,
                  has_alarm: true,
                  notify_at: new Date(when).toISOString(),
                  remind_minutes_before: 0,
                });
                setAlarmOpen(false);
              }}
            >
              Salvar
            </button>
            {reminder.has_alarm && (
              <button
                type="button"
                className="rounded-md bg-white/80 px-3 py-2 text-sm sm:px-2 sm:py-1 sm:text-xs"
                onClick={() => {
                  upsertReminder({ ...reminder, has_alarm: false });
                  setWhen("");
                  setAlarmOpen(false);
                }}
              >
                Sem alarme
              </button>
            )}
            <button
              type="button"
              className="rounded-md bg-white/80 px-3 py-2 text-sm sm:px-2 sm:py-1 sm:text-xs"
              onClick={() => setAlarmOpen(false)}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {colorOpen && (
        <div className="mt-1 flex flex-wrap items-center gap-2 rounded-[var(--radius-tag)] bg-white/70 p-2">
          {NOTE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`h-9 w-9 rounded-full border-2 transition sm:h-7 sm:w-7 ${
                currentColor.toLowerCase() === c.toLowerCase()
                  ? "border-[var(--ink)] scale-110"
                  : "border-transparent"
              }`}
              style={{ background: c }}
              title="Trocar cor"
              aria-label={`Cor ${c}`}
              onClick={() => {
                upsertReminder({ ...reminder, color: c });
                setColorOpen(false);
              }}
            />
          ))}
        </div>
      )}

      {/* Celular: um “⋯” abre cor / alarme / excluir */}
      <div className="mt-auto flex items-center justify-end gap-1 pt-1 lg:hidden">
        {menuOpen ? <ActionButtons /> : null}
        <button
          type="button"
          className={`${actionBtn} ${menuOpen ? "bg-white/50 opacity-100" : ""}`}
          title={menuOpen ? "Fechar opções" : "Opções do lembrete"}
          aria-label={menuOpen ? "Fechar opções" : "Opções do lembrete"}
          aria-expanded={menuOpen}
          onClick={toggleMenu}
        >
          <MoreHorizontal size={22} strokeWidth={1.75} />
        </button>
      </div>

      {/* PC: ícones sempre visíveis */}
      <div className="mt-auto hidden items-center justify-end gap-1 pt-1 lg:flex">
        <ActionButtons />
      </div>
    </article>
  );
}

export function ReminderBoard({ compact }: { compact?: boolean }) {
  const { data, upsertReminder, deleteReminder } = useApp();
  const [pendingDelete, setPendingDelete] = useState<Reminder | null>(null);
  const [pickingColor, setPickingColor] = useState(false);
  const [draftColor, setDraftColor] = useState(NOTE_COLORS[0]);

  const list = [...data.reminders]
    .filter((r) => !r.done_at)
    .sort((a, b) => {
      if (a.has_alarm !== b.has_alarm) return a.has_alarm ? -1 : 1;
      if (a.has_alarm && b.has_alarm) {
        return +new Date(a.notify_at) - +new Date(b.notify_at);
      }
      return a.id.localeCompare(b.id);
    });

  function createNote() {
    upsertReminder({
      title: "",
      has_alarm: false,
      color: draftColor,
    });
    setPickingColor(false);
  }

  const deleteLabel = pendingDelete
    ? noteText(pendingDelete.title).trim() || "esta nota"
    : "";

  return (
    <div className={compact ? "" : "mx-auto max-w-3xl"}>
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Excluir lembrete?"
        message={
          pendingDelete ? `Deseja mesmo excluir "${deleteLabel}"?` : ""
        }
        confirmLabel="Sim, excluir"
        cancelLabel="Cancelar"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteReminder(pendingDelete.id);
          setPendingDelete(null);
        }}
      />

      <div className="mb-2 flex items-center justify-between gap-2">
        <h2
          className={
            compact
              ? "text-xs font-semibold uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--ink)_55%,transparent)]"
              : "font-display pb-0.5 text-2xl font-semibold leading-normal tracking-tight md:text-3xl"
          }
        >
          Lembretes
        </h2>
        <button
          type="button"
          className={
            compact
              ? "inline-flex items-center gap-1 rounded-[var(--radius-tag)] bg-[var(--surface)]/70 px-2 py-1 text-xs font-medium text-[var(--signal)]"
              : "btn btn-primary"
          }
          onClick={() => setPickingColor((v) => !v)}
        >
          <Plus size={14} strokeWidth={2} />
          {compact ? "Nota" : "Nova nota"}
        </button>
      </div>

      {pickingColor && (
        <div className="panel-in mb-2 rounded-[var(--radius-tag)] border border-[var(--line)] bg-[var(--surface)]/80 p-2">
          <p className="mb-1.5 text-[11px] opacity-60">Escolha a cor</p>
          <div className="flex flex-wrap items-center gap-2">
            {NOTE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`h-9 w-9 rounded-full border-2 transition sm:h-7 sm:w-7 ${
                  draftColor === c
                    ? "border-[var(--ink)] scale-110"
                    : "border-transparent"
                }`}
                style={{ background: c }}
                aria-label={`Cor ${c}`}
                onClick={() => setDraftColor(c)}
              />
            ))}
            <button
              type="button"
              className="ml-auto rounded bg-[var(--signal)] px-3 py-2 text-xs font-medium text-white sm:px-2 sm:py-1 sm:text-[11px]"
              onClick={createNote}
            >
              Criar
            </button>
            <button
              type="button"
              className="rounded px-3 py-2 text-xs opacity-60 sm:px-2 sm:py-1 sm:text-[11px]"
              onClick={() => setPickingColor(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {!compact && (
        <p className="mb-6 opacity-65">
          Bolinha pra trocar a cor · sino pra alarme · lixeira pra excluir.
        </p>
      )}

      {list.length === 0 && !pickingColor ? (
        <p className="text-xs opacity-55">Nenhuma nota ainda.</p>
      ) : (
        <div
          className={
            compact
              ? "grid grid-cols-1 gap-2"
              : "grid gap-2 sm:grid-cols-3 md:grid-cols-4"
          }
        >
          {list.map((r) => (
            <NoteCard
              key={r.id}
              reminder={r}
              compact={compact}
              onAskDelete={setPendingDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
