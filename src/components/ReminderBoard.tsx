"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  Circle,
  MoreHorizontal,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ensureNotificationPermission } from "@/lib/audio";
import { plainTextFromHtml } from "@/lib/note-html";
import type { Reminder } from "@/lib/types";
import { sanitizeCssColor } from "@/lib/utils";

/** Altura mínima do campo; a nota cresce com o texto (sem barra de rolagem). */
const NOTE_TEXT_MIN_PX = { compact: 40, full: 60 } as const;

/** 0 = tamanho atual (máximo); 1–2 = um pouco menores. Valores em px p/ transição suave. */
const NOTE_FONT_PX = {
  compact: [15, 14, 13],
  full: [16, 14, 12],
} as const;

function clampFontSize(value: number | undefined): 0 | 1 | 2 {
  if (value === 1 || value === 2) return value;
  return 0;
}

const NOTE_COLORS = [
  "#FBBF24", // Âmbar dourado
  "#34D399", // Esmeralda fresco
  "#38BDF8", // Azul celeste
  "#FB7185", // Rosa coral
  "#FB923C", // Laranja tangerina
  "#A78BFA", // Violeta signal
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
  const textRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [alarmOpen, setAlarmOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [when, setWhen] = useState(
    reminder.has_alarm ? toLocalInput(reminder.notify_at) : "",
  );
  const currentColor = sanitizeCssColor(reminder.color, "#FBBF24");
  const textMin = compact ? NOTE_TEXT_MIN_PX.compact : NOTE_TEXT_MIN_PX.full;
  const fontSize = clampFontSize(reminder.font_size);
  const fontPx = (compact ? NOTE_FONT_PX.compact : NOTE_FONT_PX.full)[fontSize];

  useEffect(() => {
    if (!menuOpen) return;
    function handleDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setColorOpen(false);
        setAlarmOpen(false);
      }
    }
    document.addEventListener("mousedown", handleDocClick);
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, [menuOpen]);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    const from = el.offsetHeight || textMin;
    el.style.transition = "none";
    el.style.overflowY = "hidden";
    el.style.height = "auto";
    const next = Math.max(el.scrollHeight, textMin);
    el.style.height = `${from}px`;
    void el.offsetHeight;
    el.style.transition = "font-size 220ms ease";
    el.style.height = `${next}px`;
  }, [reminder.title, textMin, fontSize]);

  function bumpFont(delta: -1 | 1) {
    const next = clampFontSize(fontSize + delta);
    if (next === fontSize) return;
    upsertReminder({ ...reminder, font_size: next });
  }

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

  const touchBtn =
    "inline-flex h-11 min-h-11 w-11 min-w-11 items-center justify-center rounded-lg opacity-70 transition hover:bg-[var(--ink)]/15 hover:opacity-100";
  const desktopBtn =
    "inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded p-0 opacity-55 transition hover:bg-[var(--ink)]/15 hover:opacity-100";

  function ActionButtons({ touch }: { touch?: boolean }) {
    const btn = touch ? touchBtn : desktopBtn;
    const icon = touch ? 20 : 13;
    const fontLabel = touch
      ? "inline-flex h-5 w-5 items-center justify-center text-[13px] font-semibold leading-none"
      : "inline-flex h-[13px] w-[15px] items-center justify-center text-[11px] font-semibold leading-none";
    return (
      <>
        <button
          type="button"
          className={`${btn} disabled:opacity-30`}
          title="Diminuir fonte"
          aria-label="Diminuir fonte"
          disabled={fontSize >= 2}
          onClick={() => bumpFont(1)}
        >
          <span className={fontLabel}>A−</span>
        </button>
        <button
          type="button"
          className={`${btn} disabled:opacity-30`}
          title="Aumentar fonte"
          aria-label="Aumentar fonte"
          disabled={fontSize <= 0}
          onClick={() => bumpFont(-1)}
        >
          <span className={fontLabel}>A+</span>
        </button>
        <button
          type="button"
          className={btn}
          title="Trocar cor"
          aria-label="Trocar cor"
          onClick={openColor}
        >
          <Circle
            size={icon}
            strokeWidth={1.75}
            fill={currentColor}
            className="shrink-0"
          />
        </button>
        <button
          type="button"
          className={btn}
          title={reminder.has_alarm ? "Editar alarme" : "Adicionar alarme"}
          aria-label={
            reminder.has_alarm ? "Editar alarme" : "Adicionar alarme"
          }
          onClick={openAlarm}
        >
          {reminder.has_alarm ? (
            <Bell size={icon} strokeWidth={1.75} />
          ) : (
            <BellOff size={icon} strokeWidth={1.75} />
          )}
        </button>
        <button
          type="button"
          className={`${btn} hover:text-[var(--warn)]`}
          title="Excluir"
          aria-label="Excluir"
          onClick={() => onAskDelete(reminder)}
        >
          <Trash2 size={icon} strokeWidth={1.75} />
        </button>
      </>
    );
  }

  // Notas de estudo: cor misturada no mist — suave ("Mesa do Ciclo"), sem post-it gritante, legível em claro/escuro.
  const colorWeight = compact ? "18%" : "34%";
  const cardBg = `color-mix(in srgb, ${currentColor} ${colorWeight}, var(--mist))`;
  const cardInk = "var(--ink)";
  const cardBorder = `1px solid color-mix(in srgb, ${currentColor} ${compact ? "20%" : "28%"}, var(--line))`;

  return (
    <article
      className={`note-enter relative flex flex-col rounded-[var(--radius-tag)] shadow-sm ${
        compact ? "min-h-0 p-2.5 pb-2" : "min-h-[128px] p-3"
      }`}
      style={{
        background: cardBg,
        color: cardInk,
        border: cardBorder,
      }}
    >
      <textarea
        ref={textRef}
        className={`w-full resize-none overflow-hidden bg-transparent font-normal outline-none placeholder:opacity-40 ${
          compact ? "leading-normal pe-6" : "leading-relaxed"
        }`}
        style={{
          minHeight: textMin,
          fontSize: fontPx,
          transition: "font-size 220ms ease",
        }}
        placeholder="Escreva…"
        value={noteText(reminder.title)}
        rows={compact ? 1 : 2}
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

      {/* Modo compacto: botão discreto e menus flutuantes (sem layout shift) */}
      {compact ? (
        <>
          <button
            type="button"
            className={`${touchBtn} absolute bottom-1 right-1 lg:h-[20px] lg:min-h-0 lg:w-[20px] lg:min-w-0 lg:rounded lg:p-0 ${
              menuOpen ? "bg-[var(--ink)]/15 opacity-100" : ""
            }`}
            title={menuOpen ? "Fechar opções" : "Opções do lembrete"}
            aria-label={menuOpen ? "Fechar opções" : "Opções do lembrete"}
            aria-expanded={menuOpen}
            onClick={toggleMenu}
          >
            <MoreHorizontal
              size={18}
              strokeWidth={1.75}
              className="lg:h-[13px] lg:w-[13px]"
            />
          </button>

          {menuOpen && (
            <div
              ref={menuRef}
              className="absolute bottom-1 right-1 z-20 flex items-center gap-0.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-0.5 shadow-[var(--shadow-md)] backdrop-blur-md"
              style={{ color: "var(--ink)" }}
            >
              <div className="flex items-center gap-0.5 lg:hidden">
                <ActionButtons touch />
              </div>
              <div className="hidden items-center gap-0.5 lg:flex">
                <ActionButtons />
              </div>
              <button
                type="button"
                className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded p-0 opacity-50 transition hover:bg-[var(--mist)] hover:opacity-100"
                title="Fechar opções"
                aria-label="Fechar opções"
                onClick={() => {
                  setMenuOpen(false);
                  setColorOpen(false);
                  setAlarmOpen(false);
                }}
              >
                <X size={12} strokeWidth={2} />
              </button>
            </div>
          )}

          {colorOpen && (
            <div
              ref={menuRef}
              className="absolute bottom-8 right-1 z-30 flex flex-wrap items-center gap-1.5 rounded-[var(--radius-tag)] border border-[var(--line)] bg-[var(--surface)] p-2 shadow-[var(--shadow-lg)]"
            >
              {NOTE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`h-7 w-7 rounded-full border-2 transition hover:scale-110 sm:h-6 sm:w-6 ${
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

          {alarmOpen && (
            <div
              ref={menuRef}
              className="absolute bottom-8 right-1 z-30 w-64 space-y-2 rounded-[var(--radius-tag)] border border-[var(--line)] bg-[var(--surface)] p-2.5 shadow-[var(--shadow-lg)]"
              style={{ color: "var(--ink)" }}
            >
              <input
                type="datetime-local"
                className="input px-2 py-1.5 text-xs w-full"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
              />
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  className="rounded-md px-2.5 py-1 text-xs font-medium bg-[var(--signal)] text-white"
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
                    className="rounded-md border border-[var(--line)] bg-[var(--mist)] px-2 py-1 text-xs text-[var(--ink)] hover:bg-[var(--line)]/50"
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
                  className="rounded-md border border-[var(--line)] bg-[var(--mist)] px-2 py-1 text-xs text-[var(--ink)] hover:bg-[var(--line)]/50"
                  onClick={() => setAlarmOpen(false)}
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Modo normal (página /lembretes) */
        <>
          {alarmOpen && (
            <div className="mt-1 space-y-2 rounded-[var(--radius-tag)] border border-[var(--line)] bg-[var(--surface)] p-2 shadow-[var(--shadow-sm)]">
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
                    className="rounded-md border border-[var(--line)] bg-[var(--mist)] px-3 py-2 text-sm text-[var(--ink)] hover:bg-[var(--line)]/50 sm:px-2 sm:py-1 sm:text-xs"
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
                  className="rounded-md border border-[var(--line)] bg-[var(--mist)] px-3 py-2 text-sm text-[var(--ink)] hover:bg-[var(--line)]/50 sm:px-2 sm:py-1 sm:text-xs"
                  onClick={() => setAlarmOpen(false)}
                >
                  Fechar
                </button>
              </div>
            </div>
          )}

          {colorOpen && (
            <div className="mt-1 flex flex-wrap items-center gap-2 rounded-[var(--radius-tag)] border border-[var(--line)] bg-[var(--surface)] p-2 shadow-[var(--shadow-sm)]">
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

          <div className="mt-auto flex items-center justify-end gap-1 pt-1">
            {menuOpen ? (
              <>
                <div className="flex items-center gap-1 lg:hidden">
                  <ActionButtons touch />
                </div>
                <div className="hidden items-center gap-1 lg:flex">
                  <ActionButtons />
                </div>
              </>
            ) : null}
            <button
              type="button"
              className={`${touchBtn} lg:h-[22px] lg:min-h-0 lg:w-[22px] lg:min-w-0 lg:rounded lg:p-0 ${
                menuOpen ? "bg-[var(--ink)]/15 opacity-100" : ""
              }`}
              title={menuOpen ? "Fechar opções" : "Opções do lembrete"}
              aria-label={menuOpen ? "Fechar opções" : "Opções do lembrete"}
              aria-expanded={menuOpen}
              onClick={toggleMenu}
            >
              <MoreHorizontal
                size={22}
                strokeWidth={1.75}
                className="lg:h-[13px] lg:w-[13px]"
              />
            </button>
          </div>
        </>
      )}
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

      {list.length === 0 && !pickingColor ? (
        <p className={`text-xs opacity-55 ${compact ? "" : "mt-4"}`}>
          Nenhuma nota ainda.
        </p>
      ) : (
        <div
          className={
            compact
              ? "grid max-h-[22rem] grid-cols-1 gap-2 overflow-y-auto pe-1 scrollbar-subtle"
              : "mt-4 grid gap-2 sm:grid-cols-3 md:grid-cols-4"
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
