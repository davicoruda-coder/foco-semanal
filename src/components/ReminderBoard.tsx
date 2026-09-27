"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  Circle,
  MoreHorizontal,
  Plus,
  StickyNote,
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
const NOTE_TEXT_MIN_PX = { compact: 40, full: 44 } as const;

/** 0 = tamanho atual (máximo); 1–2 = um pouco menores. Valores em px p/ transição suave. */
const NOTE_FONT_PX = {
  compact: [15, 14, 13],
  full: [16, 14, 12],
} as const;

function clampFontSize(value: number | undefined): 0 | 1 | 2 {
  if (value === 1 || value === 2) return value;
  return 0;
}

export const NOTE_COLORS = [
  "#38BDF8", // Azul celeste
  "#34D399", // Esmeralda fresco
  "#FBBF24", // Âmbar dourado
  "#A78BFA", // Violeta signal
  "#FB7185", // Rosa coral
  "#FB923C", // Laranja tangerina
];

export interface NoteColorEntry {
  dot: string;
  lightBg: string;
  lightBorder: string;
  lightAccent: string;
  darkBg: string;
  darkBorder: string;
  darkAccent: string;
}

export const NOTE_COLOR_PALETTE: Record<string, NoteColorEntry> = {
  // Âmbar dourado (quente, nota clássica)
  "#FBBF24": {
    dot: "#F59E0B",
    lightBg: "color-mix(in srgb, #FEF3C7 62%, var(--surface))",
    lightBorder: "color-mix(in srgb, #D97706 24%, var(--line))",
    lightAccent: "#D97706",
    darkBg: "color-mix(in srgb, #D97706 18%, #15161e)",
    darkBorder: "color-mix(in srgb, #FBBF24 24%, transparent)",
    darkAccent: "#FBBF24",
  },
  // Esmeralda / Menta (fresco, listas e tarefas)
  "#34D399": {
    dot: "#10B981",
    lightBg: "color-mix(in srgb, #CCFBF1 62%, var(--surface))",
    lightBorder: "color-mix(in srgb, #0D9488 24%, var(--line))",
    lightAccent: "#0D9488",
    darkBg: "color-mix(in srgb, #0D9488 18%, #15161e)",
    darkBorder: "color-mix(in srgb, #34D399 24%, transparent)",
    darkAccent: "#34D399",
  },
  // Azul celeste (foco, estudos e matérias)
  "#38BDF8": {
    dot: "#0EA5E9",
    lightBg: "color-mix(in srgb, #DBEAFE 62%, var(--surface))",
    lightBorder: "color-mix(in srgb, #2563EB 24%, var(--line))",
    lightAccent: "#2563EB",
    darkBg: "color-mix(in srgb, #2563EB 18%, #15161e)",
    darkBorder: "color-mix(in srgb, #38BDF8 24%, transparent)",
    darkAccent: "#38BDF8",
  },
  // Rosa coral (suave, afazeres e pessoal)
  "#FB7185": {
    dot: "#F43F5E",
    lightBg: "color-mix(in srgb, #FBCFE8 62%, var(--surface))",
    lightBorder: "color-mix(in srgb, #DB2777 24%, var(--line))",
    lightAccent: "#DB2777",
    darkBg: "color-mix(in srgb, #DB2777 18%, #15161e)",
    darkBorder: "color-mix(in srgb, #FB7185 24%, transparent)",
    darkAccent: "#FB7185",
  },
  // Laranja tangerina (atenção, prazos e lembretes)
  "#FB923C": {
    dot: "#F97316",
    lightBg: "color-mix(in srgb, #FFEDD5 62%, var(--surface))",
    lightBorder: "color-mix(in srgb, #EA580C 24%, var(--line))",
    lightAccent: "#EA580C",
    darkBg: "color-mix(in srgb, #EA580C 18%, #15161e)",
    darkBorder: "color-mix(in srgb, #FB923C 24%, transparent)",
    darkAccent: "#FB923C",
  },
  // Violeta signal (revisão e temas da marca)
  "#A78BFA": {
    dot: "#8B5CF6",
    lightBg: "color-mix(in srgb, #EDE9FE 62%, var(--surface))",
    lightBorder: "color-mix(in srgb, #7C3AED 24%, var(--line))",
    lightAccent: "#7C3AED",
    darkBg: "color-mix(in srgb, #7C3AED 18%, #15161e)",
    darkBorder: "color-mix(in srgb, #A78BFA 24%, transparent)",
    darkAccent: "#A78BFA",
  },
};

function getNotePalette(color: string): NoteColorEntry {
  const upper = (color || "").toUpperCase();
  if (NOTE_COLOR_PALETTE[upper]) return NOTE_COLOR_PALETTE[upper];
  const safe = sanitizeCssColor(color, "#FBBF24");
  return {
    dot: safe,
    lightBg: `color-mix(in srgb, ${safe} 16%, var(--surface))`,
    lightBorder: `color-mix(in srgb, ${safe} 24%, var(--line))`,
    lightAccent: safe,
    darkBg: `color-mix(in srgb, ${safe} 18%, #15161e)`,
    darkBorder: `color-mix(in srgb, ${safe} 24%, transparent)`,
    darkAccent: safe,
  };
}

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

  // Notas de estudo: fundo com a cor escolhida de forma suave e balanceada, com suporte a modo claro e escuro.
  const palette = getNotePalette(currentColor);

  return (
    <article
      className={`note-card note-enter relative flex flex-col rounded-[var(--radius-tag)] shadow-xs transition-colors ${
        compact ? "min-h-0 p-2.5 pb-2" : "min-h-[76px] p-3 sm:min-h-[110px] sm:p-3.5"
      }`}
      style={{
        "--note-light-bg": palette.lightBg,
        "--note-light-border": palette.lightBorder,
        "--note-light-acc": palette.lightAccent,
        "--note-dark-bg": palette.darkBg,
        "--note-dark-border": palette.darkBorder,
        "--note-dark-acc": palette.darkAccent,
        background: "var(--note-light-bg)",
        color: "var(--ink)",
        border: "1px solid var(--note-light-border)",
        borderLeft: "3.5px solid var(--note-light-acc)",
      } as React.CSSProperties}
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
    <div className={compact ? "" : "mx-auto w-full max-w-4xl flex-1 flex flex-col"}>
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

      <div
        className={
          compact
            ? "mb-2 flex items-center justify-between gap-2"
            : "mb-3.5 flex items-center justify-between gap-3 sm:mb-5"
        }
      >
        <div className="flex items-center gap-2">
          <h2
            className={
              compact
                ? "text-xs font-semibold uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--ink)_55%,transparent)]"
                : "font-display text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl"
            }
          >
            Lembretes
          </h2>
          {!compact && list.length > 0 && (
            <span className="rounded-full bg-[var(--mist)] px-2 py-0.5 text-[11px] font-semibold text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
              {list.length}
            </span>
          )}
        </div>
        <button
          type="button"
          className={
            compact
              ? "inline-flex items-center gap-1 rounded-[var(--radius-tag)] bg-[var(--surface)]/70 px-2 py-1 text-xs font-medium text-[var(--signal)] hover:bg-[var(--surface)]"
              : "inline-flex items-center gap-1.5 rounded-xl bg-[var(--signal)] px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:opacity-95 active:scale-95 sm:px-4 sm:py-2 sm:text-sm"
          }
          onClick={() => setPickingColor((v) => !v)}
        >
          <Plus size={compact ? 14 : 16} strokeWidth={2.25} />
          {compact ? "Nota" : "Nova nota"}
        </button>
      </div>

      {pickingColor && (
        <div className="panel-in mb-3 rounded-[var(--radius-tag)] border border-[var(--line)] bg-[var(--surface)]/90 p-2.5 sm:p-3 shadow-xs">
          <p className="mb-2 text-xs font-medium text-[var(--ink)] opacity-70">
            Escolha a cor da nova nota
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {NOTE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`h-8 w-8 rounded-full border-2 transition active:scale-95 sm:h-7 sm:w-7 ${
                  draftColor === c
                    ? "border-[var(--ink)] scale-110 shadow-xs"
                    : "border-transparent"
                }`}
                style={{ background: c }}
                aria-label={`Cor ${c}`}
                onClick={() => setDraftColor(c)}
              />
            ))}
            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                className="rounded-lg px-2.5 py-1.5 text-xs text-[color-mix(in_srgb,var(--ink)_65%,transparent)] transition hover:bg-[var(--mist)] hover:text-[var(--ink)]"
                onClick={() => setPickingColor(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="rounded-lg bg-[var(--signal)] px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:opacity-90 active:scale-95"
                onClick={createNote}
              >
                Criar nota
              </button>
            </div>
          </div>
        </div>
      )}

      {list.length === 0 && !pickingColor ? (
        <div
          className={`flex flex-col items-center justify-center text-center ${
            compact ? "py-6" : "my-auto py-12"
          }`}
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--mist)] text-[color-mix(in_srgb,var(--ink)_40%,transparent)]">
            <StickyNote size={24} strokeWidth={1.5} />
          </div>
          <p className="text-sm font-semibold text-[var(--ink)]">
            Nenhuma nota ainda
          </p>
          <p className="mt-1 max-w-xs text-xs text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
            Guarde lembretes rápidos, anotações de estudo e recados do dia a dia.
          </p>
          {!compact && (
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[var(--signal)] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:opacity-95 active:scale-95"
              onClick={() => setPickingColor(true)}
            >
              <Plus size={15} strokeWidth={2.25} />
              Criar primeira nota
            </button>
          )}
        </div>
      ) : (
        <div
          className={
            compact
              ? "grid max-h-[22rem] grid-cols-1 gap-2 overflow-y-auto pe-1 scrollbar-subtle"
              : "mt-3 grid gap-2.5 sm:mt-5 sm:grid-cols-3 md:grid-cols-4"
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

      {!compact && (
        <button
          type="button"
          onClick={() => setPickingColor((v) => !v)}
          className="fixed bottom-24 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--signal)] text-white shadow-lg shadow-[var(--signal)]/35 transition-all hover:scale-105 active:scale-95 sm:hidden"
          aria-label="Criar nova nota"
          title="Nova nota"
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
