"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Clock,
  FileText,
  Minus,
  Pause,
  Pencil,
  Play,
  Plus,
  Repeat,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SubjectIcon } from "@/components/SubjectIcon";
import { SubjectIconPicker } from "@/components/SubjectIconPicker";
import { newId } from "@/lib/demo-store";
import {
  DAYS,
  STATUS_LABEL,
  type ProgressTracker,
  type Subject,
  type SubjectRotation,
  type SubjectStatus,
} from "@/lib/types";
import {
  freeRowClass,
  normalizeRotation,
  normalizeStudyDays,
  normalizeExclusiveDays,
  statusClass,
  statusRowClass,
  rotationWithItemNotes,
  rotationWithItemRecursos,
  PROGRESS_UNIT_LABELS,
  normalizeProgress,
  progressPercent,
} from "@/lib/utils";
import { SubjectResources } from "@/components/SubjectResources";

type DraftFreq = {
  mode: "all" | "days";
  days: number[];
};

function freqFromSubject(s: Pick<Subject, "study_days">): DraftFreq {
  const days = normalizeStudyDays(s.study_days);
  if (!days) return { mode: "all", days: [] };
  return { mode: "days", days };
}

function studyDaysFromFreq(freq: DraftFreq): number[] | null {
  if (freq.mode === "all") return null;
  return normalizeStudyDays(freq.days);
}

function StudyDaysPicker({
  value,
  onChange,
}: {
  value: DraftFreq;
  onChange: (next: DraftFreq) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="inline-flex items-center gap-0.5 rounded-full border border-[var(--line)] bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] p-0.5">
        <button
          type="button"
          className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
            value.mode === "all"
              ? "bg-[var(--signal)] text-white"
              : "text-[color-mix(in_srgb,var(--ink)_55%,transparent)] hover:text-[var(--ink)]"
          }`}
          onClick={() => onChange({ mode: "all", days: [] })}
        >
          Todos os dias
        </button>
        <button
          type="button"
          className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
            value.mode === "days"
              ? "bg-[var(--signal)] text-white"
              : "text-[color-mix(in_srgb,var(--ink)_55%,transparent)] hover:text-[var(--ink)]"
          }`}
          onClick={() =>
            onChange({
              mode: "days",
              days: value.days.length ? value.days : [],
            })
          }
        >
          Dias da semana
        </button>
      </div>
      {value.mode === "days" && (
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map((name, i) => {
            const on = value.days.includes(i);
            return (
              <button
                key={name}
                type="button"
                title={name}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition ring-1 ${
                  on
                    ? "bg-[var(--signal-soft)] text-[var(--signal)] ring-[color-mix(in_srgb,var(--signal)_35%,transparent)]"
                    : "text-[color-mix(in_srgb,var(--ink)_50%,transparent)] ring-[var(--line)] hover:text-[var(--ink)]"
                }`}
                onClick={() => {
                  const days = on
                    ? value.days.filter((d) => d !== i)
                    : [...value.days, i].sort((a, b) => a - b);
                  onChange({ mode: "days", days });
                }}
              >
                {name.slice(0, 3)}
              </button>
            );
          })}
        </div>
      )}
      {value.mode === "days" && value.days.length === 0 && (
        <p className="text-xs text-[var(--warn)]">
          Selecione pelo menos um dia (ou volte para todos os dias).
        </p>
      )}
    </div>
  );
}

function ExclusiveDaysPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (days: number[]) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {DAYS.map((name, i) => {
          const on = value.includes(i);
          return (
            <button
              key={name}
              type="button"
              title={name}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition ring-1 ${
                on
                  ? "bg-[var(--signal-soft)] text-[var(--signal)] ring-[color-mix(in_srgb,var(--signal)_35%,transparent)]"
                  : "text-[color-mix(in_srgb,var(--ink)_50%,transparent)] ring-[var(--line)] hover:text-[var(--ink)]"
              }`}
              onClick={() => {
                const days = on
                  ? value.filter((d) => d !== i)
                  : [...value, i].sort((a, b) => a - b);
                onChange(days);
              }}
            >
              {name.slice(0, 3)}
            </button>
          );
        })}
      </div>
      {value.length > 0 && (
        <p className="text-xs opacity-55">
          1 matéria: só anotações. 2+ no mesmo dia: mini-ciclo entre elas.
        </p>
      )}
    </div>
  );
}

function parseMinutes(raw: string, fallback = 25) {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, 999);
}

/**
 * Editor de progresso de módulo/curso.
 * Pode ser usado tanto para uma matéria quanto para um item de rodízio.
 */
function ProgressEditor({
  progress,
  onSave,
  compact,
}: {
  progress?: ProgressTracker;
  onSave: (p: ProgressTracker | undefined) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(Boolean(progress));
  const [customLabel, setCustomLabel] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        className={`btn text-sm ${compact ? "text-xs py-1" : ""}`}
        onClick={() => setOpen(true)}
      >
        <BarChart3 size={compact ? 13 : 15} strokeWidth={1.75} /> Ativar progresso do módulo
      </button>
    );
  }

  const p: ProgressTracker = progress ?? {
    unit_label: "Vídeo",
    total: 1,
    current: 0,
    auto_detect: false,
    auto_prefix: "",
  };
  const pct = progressPercent(p);
  const isCustomLabel = !PROGRESS_UNIT_LABELS.includes(p.unit_label as typeof PROGRESS_UNIT_LABELS[number]);

  function update(patch: Partial<ProgressTracker>) {
    const next = normalizeProgress({ ...p, ...patch });
    onSave(next);
  }

  return (
    <div className={`w-full rounded-[var(--radius-tag)] border border-[var(--line)] bg-[var(--mist)]/50 p-3 transition-all ${
      compact ? "p-2.5" : ""
    }`}>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--ink)] opacity-75">
          <BarChart3 size={13} strokeWidth={2} className="text-[var(--signal)]" />
          <span>Progresso do módulo</span>
        </span>
        <button
          type="button"
          className="rounded-full p-1.5 text-[color-mix(in_srgb,var(--ink)_45%,transparent)] transition hover:bg-[var(--surface)] hover:text-[var(--warn)] shrink-0"
          title="Desativar progresso"
          aria-label="Desativar progresso"
          onClick={() => {
            onSave(undefined);
            setOpen(false);
          }}
        >
          <X size={15} strokeWidth={2} />
        </button>
      </div>

      {/* Tipo de unidade */}
      <div className="mt-2.5 space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-wider opacity-50">Tipo de unidade</p>
        <div className="flex flex-wrap gap-1">
          {PROGRESS_UNIT_LABELS.map((label) => (
            <button
              key={label}
              type="button"
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition ring-1 ${
                p.unit_label === label && !isCustomLabel
                  ? "bg-[var(--signal)] text-white ring-[var(--signal)] shadow-sm"
                  : "text-[color-mix(in_srgb,var(--ink)_55%,transparent)] ring-[var(--line)] hover:text-[var(--ink)]"
              }`}
              onClick={() => update({ unit_label: label })}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition ring-1 ${
              isCustomLabel
                ? "bg-[var(--signal)] text-white ring-[var(--signal)] shadow-sm"
                : "text-[color-mix(in_srgb,var(--ink)_55%,transparent)] ring-[var(--line)] hover:text-[var(--ink)]"
            }`}
            onClick={() => {
              if (!isCustomLabel) update({ unit_label: customLabel || "Item" });
            }}
          >
            Outro
          </button>
        </div>
        {isCustomLabel && (
          <input
            className="input text-sm py-1.5 max-w-[180px]"
            placeholder="Nome da unidade"
            value={p.unit_label}
            onChange={(e) => update({ unit_label: e.target.value || "Item" })}
          />
        )}
      </div>

      {/* Total e Atual */}
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[11px] font-medium uppercase tracking-wider opacity-50">Total</span>
          <input
            className="input w-20 py-1.5 text-center font-mono-num"
            type="number"
            min={1}
            max={99999}
            inputMode="numeric"
            value={p.total}
            onChange={(e) => {
              const v = Number.parseInt(e.target.value, 10);
              if (Number.isFinite(v) && v >= 1) update({ total: Math.min(v, 99999) });
            }}
          />
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wider opacity-50">Atual</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="btn p-1.5"
              disabled={p.current <= 0}
              onClick={() => update({ current: p.current - 1 })}
              aria-label="Diminuir progresso"
            >
              <Minus size={14} strokeWidth={2} />
            </button>
            <input
              className="input w-20 py-1.5 text-center font-mono-num"
              type="number"
              min={0}
              max={p.total}
              inputMode="numeric"
              value={p.current}
              onChange={(e) => {
                const v = Number.parseInt(e.target.value, 10);
                if (Number.isFinite(v)) update({ current: Math.max(0, Math.min(v, p.total)) });
              }}
            />
            <button
              type="button"
              className="btn p-1.5"
              disabled={p.current >= p.total}
              onClick={() => update({ current: p.current + 1 })}
              aria-label="Aumentar progresso"
            >
              <Plus size={14} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="mt-3">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs text-[color-mix(in_srgb,var(--ink)_65%,transparent)]">
            {p.current}/{p.total} {p.unit_label.toLowerCase()}{p.total !== 1 ? "s" : ""}
          </span>
          <span className={`text-xs font-semibold ${
            pct >= 100
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-[var(--signal)]"
          }`}>
            {pct}%
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--ink)_10%,transparent)]">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              pct >= 100
                ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                : "bg-gradient-to-r from-[var(--signal)] to-[color-mix(in_srgb,var(--signal)_70%,#6dd5ed)]"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {pct >= 100 && (
          <p className="mt-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            🎉 Módulo concluído!
          </p>
        )}
      </div>

      {/* Auto-detect toggle */}
      <div className="mt-3 space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="accent-[var(--signal)] w-4 h-4"
            checked={p.auto_detect}
            onChange={(e) => update({ auto_detect: e.target.checked })}
          />
          <span className="text-xs font-medium text-[color-mix(in_srgb,var(--ink)_75%,transparent)]">
            Detectar pelas anotações
          </span>
        </label>
        {p.auto_detect && (
          <div className="flex items-center gap-2">
            <span className="text-xs opacity-55">Prefixo:</span>
            <input
              className="input w-24 py-1 text-sm text-center font-mono-num"
              placeholder="ex: v"
              value={p.auto_prefix}
              onChange={(e) => update({ auto_prefix: e.target.value })}
            />
            <span className="text-[11px] opacity-45 leading-snug">
              Ex: “{p.auto_prefix || "v"}15” → {p.unit_label.toLowerCase()} 15
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Rodízio interno: disciplinas que se revezam dentro da matéria.
 * A "da vez" avança quando a matéria é concluída; cada item guarda
 * a própria anotação ("onde parei").
 */
function RotationEditor({
  subject,
  onSave,
}: {
  subject: Subject;
  onSave: (rotation: SubjectRotation | null) => void;
}) {
  const rot = normalizeRotation(subject.rotation);
  const [open, setOpen] = useState(Boolean(rot));
  const [newName, setNewName] = useState("");
  const [nameDrafts, setNameDrafts] = useState<Record<string, string>>({});
  const [confirmOff, setConfirmOff] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [isExpanded, setIsExpanded] = useState(() => !rot || rot.items.length === 0);
  const [pendingRemoveItem, setPendingRemoveItem] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const currentItem = rot ? (rot.items[rot.index] ?? rot.items[0]) : null;

  function addItem() {
    const name = newName.trim();
    if (!name) return;
    const base = rot ?? { items: [], index: 0 };
    onSave({
      items: [...base.items, { id: newId("rot"), name, notes: "" }],
      index: base.index,
    });
    setNewName("");
  }

  function removeItem(id: string) {
    if (editingNoteId === id) setEditingNoteId(null);
    if (!rot) return;
    const idx = rot.items.findIndex((it) => it.id === id);
    const items = rot.items.filter((it) => it.id !== id);
    if (items.length === 0) {
      onSave(null);
      return;
    }
    let index = rot.index;
    if (idx >= 0 && idx < rot.index) index -= 1;
    onSave({ items, index: Math.min(Math.max(0, index), items.length - 1) });
  }

  function move(id: string, dir: -1 | 1) {
    if (!rot) return;
    const idx = rot.items.findIndex((it) => it.id === id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= rot.items.length) return;
    const items = [...rot.items];
    [items[idx], items[swap]] = [items[swap], items[idx]];
    // A "da vez" segue o item, não a posição.
    const currentId = rot.items[rot.index]?.id;
    const index = Math.max(
      0,
      items.findIndex((it) => it.id === currentId),
    );
    onSave({ items, index });
  }

  function setCurrent(id: string) {
    if (!rot) return;
    const index = rot.items.findIndex((it) => it.id === id);
    if (index < 0 || index === rot.index) return;
    onSave({ ...rot, index });
  }

  function renameItem(id: string) {
    if (!rot) return;
    const draft = (nameDrafts[id] ?? "").trim();
    setNameDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (!draft) return;
    onSave({
      ...rot,
      items: rot.items.map((it) =>
        it.id === id ? { ...it, name: draft } : it,
      ),
    });
  }

  function saveNote(id: string) {
    if (!rot) return;
    const draftName = (nameDrafts[id] ?? "").trim();
    const updatedRot = {
      ...rot,
      items: rot.items.map((it) => {
        if (it.id !== id) return it;
        return {
          ...it,
          name: draftName || it.name,
          notes: noteDraft.trim(),
        };
      }),
    };
    if (draftName) {
      setNameDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
    onSave(updatedRot);
    setEditingNoteId(null);
  }

  if (!open) {
    return (
      <button
        type="button"
        className="btn text-sm"
        onClick={() => {
          setOpen(true);
          setIsExpanded(true);
        }}
      >
        <Repeat size={15} strokeWidth={1.75} /> Ativar rodízio de disciplinas
      </button>
    );
  }

  return (
    <div className="mt-1 w-full rounded-[var(--radius-tag)] border border-[var(--line)] bg-[var(--mist)]/50 p-3 transition-all">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-left group py-0.5"
          aria-expanded={isExpanded}
          aria-controls={`rotation-content-${subject.id}`}
        >
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--ink)] opacity-75 group-hover:opacity-100 transition">
            <Repeat size={13} strokeWidth={2} className="text-[var(--signal)]" />
            <span>Rodízio de disciplinas</span>
          </span>

          {rot && rot.items.length > 0 && (
            <span className="rounded-full bg-[color-mix(in_srgb,var(--signal)_15%,transparent)] px-2 py-0.5 text-[11px] font-medium text-[var(--signal)] shrink-0">
              {rot.items.length} {rot.items.length === 1 ? "disciplina" : "disciplinas"}
            </span>
          )}

          {!isExpanded && currentItem && (
            <span className="inline-flex items-center gap-1.5 text-xs text-[color-mix(in_srgb,var(--ink)_65%,transparent)] truncate max-w-[200px] sm:max-w-xs">
              <span className="size-1.5 rounded-full bg-[var(--signal)] shrink-0" />
              <span className="truncate">
                Da vez: <strong className="font-medium text-[var(--ink)]">{currentItem.name}</strong>
              </span>
            </span>
          )}

          <span className="ml-auto inline-flex items-center gap-1 text-xs text-[color-mix(in_srgb,var(--ink)_50%,transparent)] group-hover:text-[var(--ink)] transition shrink-0">
            <span className="hidden sm:inline text-[11px]">
              {isExpanded ? "Recolher" : "Expandir"}
            </span>
            {isExpanded ? (
              <ChevronUp size={15} strokeWidth={2} />
            ) : (
              <ChevronDown size={15} strokeWidth={2} />
            )}
          </span>
        </button>

        {confirmOff ? null : (
          <button
            type="button"
            className="rounded-full p-1.5 text-[color-mix(in_srgb,var(--ink)_45%,transparent)] transition hover:bg-[var(--surface)] hover:text-[var(--warn)] shrink-0"
            title="Desativar rodízio"
            aria-label="Desativar rodízio"
            onClick={() => {
              if (rot) setConfirmOff(true);
              else setOpen(false);
            }}
          >
            <X size={15} strokeWidth={2} />
          </button>
        )}
      </div>

      {confirmOff ? (
        <div
          className="mt-2 rounded-[var(--radius-tag)] border border-[color-mix(in_srgb,var(--warn)_35%,var(--line))] bg-[color-mix(in_srgb,var(--warn)_8%,var(--surface))] p-3"
          role="alertdialog"
        >
          <p className="text-sm font-semibold text-[var(--warn)]">
            Desativar rodízio?
          </p>
          <p className="mt-1 text-xs leading-snug text-[color-mix(in_srgb,var(--ink)_65%,transparent)]">
            As disciplinas e as anotações de cada uma serão removidas. Não pode
            ser desfeito.
          </p>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="btn"
              onClick={() => setConfirmOff(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn border-[var(--warn)] bg-[color-mix(in_srgb,var(--warn)_12%,var(--surface))] text-[var(--warn)]"
              onClick={() => {
                setConfirmOff(false);
                setOpen(false);
                onSave(null);
              }}
            >
              Sim, desativar
            </button>
          </div>
        </div>
      ) : null}

      {isExpanded && (
        <div id={`rotation-content-${subject.id}`} className="mt-2.5 pt-2 border-t border-[color-mix(in_srgb,var(--line)_60%,transparent)]">
          <p className="text-xs leading-snug opacity-55">
            A cada conclusão desta matéria, a disciplina “da vez” passa para a
            próxima da lista. Cada uma guarda a própria anotação. Toque na bolinha
            para escolher a da vez.
          </p>

          <ul className="mt-2.5 space-y-1.5">
        {(rot?.items ?? []).map((it, i) => {
          const current = rot != null && i === rot.index;
          return (
            <li key={it.id} className="flex items-center gap-2">
              <button
                type="button"
                title={current ? "Da vez" : "Definir como a da vez"}
                aria-label={
                  current
                    ? `${it.name} é a da vez`
                    : `Definir ${it.name} como a da vez`
                }
                onClick={() => setCurrent(it.id)}
                className={`grid size-5 shrink-0 place-items-center rounded-full ring-1 transition ${
                  current
                    ? "bg-[var(--signal)] ring-[var(--signal)]"
                    : "bg-[var(--surface)] ring-[var(--line)] hover:ring-[var(--signal)]"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    current ? "bg-white" : "bg-transparent"
                  }`}
                />
              </button>
              <div className="min-w-0 flex-1">
                <input
                  className="input w-full py-1.5 text-sm"
                  value={nameDrafts[it.id] ?? it.name}
                  onChange={(e) =>
                    setNameDrafts((prev) => ({
                      ...prev,
                      [it.id]: e.target.value,
                    }))
                  }
                  onBlur={() => renameItem(it.id)}
                />
                {editingNoteId === it.id ? (
                  <div className="mt-1.5 rounded-[var(--radius-tag)] border border-[color-mix(in_srgb,var(--signal)_40%,var(--line))] bg-[var(--surface)] p-2 shadow-sm">
                    <textarea
                      ref={(el) => {
                        if (el) {
                          el.focus();
                          el.selectionStart = el.selectionEnd = el.value.length;
                        }
                      }}
                      className="w-full resize-none bg-transparent text-xs text-[var(--ink)] placeholder:text-[color-mix(in_srgb,var(--ink)_35%,transparent)] outline-none min-h-[48px] leading-relaxed"
                      placeholder="Anotações desta disciplina (ex.: Pg1 - Q4283039)"
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                          e.preventDefault();
                          saveNote(it.id);
                        }
                        if (e.key === "Escape") {
                          setEditingNoteId(null);
                        }
                      }}
                    />
                    <div className="mt-1.5 flex items-center justify-between gap-2 border-t border-[var(--line)] pt-1.5">
                      <span className="text-[10px] text-[color-mix(in_srgb,var(--ink)_40%,transparent)]">
                        Ctrl+Enter para salvar
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          className="btn py-1 px-2 text-xs border-transparent bg-transparent hover:bg-[var(--mist)] text-[color-mix(in_srgb,var(--ink)_70%,transparent)]"
                          onClick={() => setEditingNoteId(null)}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className="btn py-1 px-2.5 text-xs bg-[var(--signal)] text-white hover:opacity-90"
                          onClick={() => saveNote(it.id)}
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {it.notes.trim() ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNoteId(it.id);
                          setNoteDraft(it.notes);
                        }}
                        className="group inline-flex items-center gap-1.5 rounded-[var(--radius-tag)] border border-[color-mix(in_srgb,var(--line)_80%,transparent)] bg-[color-mix(in_srgb,var(--surface)_75%,transparent)] px-2 py-0.5 text-xs text-[color-mix(in_srgb,var(--ink)_80%,transparent)] transition hover:border-[var(--signal)] hover:text-[var(--signal)] hover:bg-[var(--surface)] text-left"
                        title="Clique para editar anotações"
                      >
                        <FileText size={11} strokeWidth={2} className="shrink-0 text-[var(--signal)] opacity-85" />
                        <span className="truncate max-w-[240px] sm:max-w-[340px] text-[11px]">
                          {it.notes}
                        </span>
                        <Pencil size={10} className="shrink-0 opacity-40 transition group-hover:opacity-100" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNoteId(it.id);
                          setNoteDraft("");
                        }}
                        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-[color-mix(in_srgb,var(--ink)_45%,transparent)] transition hover:bg-[var(--surface)] hover:text-[var(--signal)]"
                        title="Adicionar anotação a esta disciplina"
                      >
                        <FileText size={11} strokeWidth={1.75} />
                        <span>+ anotação</span>
                      </button>
                    )}
                  </div>
                )}
                <div className="mt-1">
                  <SubjectResources
                    compact
                    recursos={it.recursos}
                    onChange={(recursos) => {
                      if (!rot) return;
                      onSave({
                        ...rot,
                        items: rot.items.map((item) =>
                          item.id === it.id ? { ...item, recursos } : item
                        ),
                      });
                    }}
                  />
                </div>
                <div className="mt-1.5">
                  <ProgressEditor
                    compact
                    progress={it.progress}
                    onSave={(progress) => {
                      if (!rot) return;
                      onSave({
                        ...rot,
                        items: rot.items.map((item) =>
                          item.id === it.id ? { ...item, progress } : item
                        ),
                      });
                    }}
                  />
                </div>
              </div>
              <button
                type="button"
                className="rounded-full p-1 text-[color-mix(in_srgb,var(--ink)_45%,transparent)] transition hover:bg-[var(--surface)] hover:text-[var(--ink)] disabled:opacity-30"
                title="Subir"
                aria-label={`Subir ${it.name}`}
                disabled={i === 0}
                onClick={() => move(it.id, -1)}
              >
                <ChevronUp size={15} strokeWidth={2} />
              </button>
              <button
                type="button"
                className="rounded-full p-1 text-[color-mix(in_srgb,var(--ink)_45%,transparent)] transition hover:bg-[var(--surface)] hover:text-[var(--ink)] disabled:opacity-30"
                title="Descer"
                aria-label={`Descer ${it.name}`}
                disabled={rot != null && i === rot.items.length - 1}
                onClick={() => move(it.id, 1)}
              >
                <ChevronDown size={15} strokeWidth={2} />
              </button>
              <button
                type="button"
                className="rounded-full p-1 text-[color-mix(in_srgb,var(--ink)_45%,transparent)] transition hover:bg-[var(--surface)] hover:text-[var(--warn)]"
                title="Remover disciplina"
                aria-label={`Remover ${it.name}`}
                onClick={() => setPendingRemoveItem({ id: it.id, name: it.name })}
              >
                <Trash2 size={14} strokeWidth={1.75} />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-2.5 flex items-center gap-2">
        <input
          className="input flex-1 py-1.5 text-sm"
          placeholder="Nova disciplina (ex.: RLM)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
        />
        <button
          type="button"
          className="btn whitespace-nowrap text-sm"
          onClick={addItem}
        >
          Adicionar
        </button>
      </div>
        </div>
      )}
      {/* Confirmação de remoção de disciplina do rodízio */}
      <ConfirmDialog
        open={pendingRemoveItem !== null}
        title="Remover disciplina do rodízio"
        message={`Deseja remover "${pendingRemoveItem?.name}" do rodízio? As anotações e progresso desta disciplina serão perdidos.`}
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        confirmVariant="danger"
        onConfirm={() => {
          if (!pendingRemoveItem) return;
          removeItem(pendingRemoveItem.id);
          setPendingRemoveItem(null);
        }}
        onCancel={() => setPendingRemoveItem(null)}
      />
    </div>
  );
}

export default function MateriasPage() {
  const { data, upsertSubject, setSubjectStatus, deleteSubject, setData } = useApp();
  const [name, setName] = useState("");
  const [newMinutes, setNewMinutes] = useState("25");
  const [newIsFree, setNewIsFree] = useState(false);
  const [newWeight, setNewWeight] = useState(1);
  const [newFreq, setNewFreq] = useState<DraftFreq>({ mode: "all", days: [] });
  const [showNewAdvanced, setShowNewAdvanced] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  /** Rascunho local: permite abrir “Dias da semana” antes de marcar algum dia. */
  const [freqDrafts, setFreqDrafts] = useState<Record<string, DraftFreq>>({});
  const [minutesDraft, setMinutesDraft] = useState<Record<string, string>>({});
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    if (!pendingDelete) return;
    document
      .getElementById(`delete-confirm-${pendingDelete.id}`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [pendingDelete]);

  const subjects = [...data.subjects].sort((a, b) => a.cycle_order - b.cycle_order);

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function expandAll() {
    const all: Record<string, boolean> = {};
    subjects.forEach((s) => {
      all[s.id] = true;
    });
    setExpandedIds(all);
  }

  function collapseAll() {
    setExpandedIds({});
  }

  const allExpanded = subjects.length > 0 && subjects.every((s) => expandedIds[s.id]);

  function move(id: string, dir: -1 | 1) {
    setData((prev) => {
      const list = [...prev.subjects].sort((a, b) => {
        const byOrder = a.cycle_order - b.cycle_order;
        if (byOrder !== 0) return byOrder;
        return a.name.localeCompare(b.name, "pt-BR");
      });
      const idx = list.findIndex((s) => s.id === id);
      const swap = idx + dir;
      if (idx < 0 || swap < 0 || swap >= list.length) return prev;

      // Troca posição na lista e reindexa 0…n-1 (funciona mesmo com cycle_order duplicado).
      const reordered = [...list];
      const tmp = reordered[idx];
      reordered[idx] = reordered[swap];
      reordered[swap] = tmp;
      const orderById = new Map(reordered.map((s, i) => [s.id, i]));

      return {
        ...prev,
        subjects: prev.subjects.map((s) => ({
          ...s,
          cycle_order: orderById.get(s.id) ?? s.cycle_order,
        })),
      };
    });
  }

  function freqForSubject(s: Subject): DraftFreq {
    return freqDrafts[s.id] ?? freqFromSubject(s);
  }

  function updateStudyDays(s: Subject, freq: DraftFreq) {
    setFreqDrafts((prev) => ({ ...prev, [s.id]: freq }));
    // Ainda sem dia marcado: só atualiza a UI; persiste ao escolher o 1º dia
    // ou ao voltar para “Todos os dias”.
    if (freq.mode === "days" && freq.days.length === 0) return;
    upsertSubject({ ...s, study_days: studyDaysFromFreq(freq) });
    if (freq.mode === "all") {
      setFreqDrafts((prev) => {
        const next = { ...prev };
        delete next[s.id];
        return next;
      });
    }
  }

  return (
    <div className="mx-auto max-w-3xl pb-16">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div>
          <h1 className="font-display pb-0.5 text-2xl font-semibold leading-normal tracking-tight md:text-3xl">
            Matérias
          </h1>
          <p className="text-xs text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
            {subjects.length} {subjects.length === 1 ? "matéria cadastrada" : "matérias cadastradas"} no ciclo
          </p>
        </div>

        {subjects.length > 0 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={allExpanded ? collapseAll : expandAll}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[color-mix(in_srgb,var(--ink)_75%,transparent)] transition hover:border-[color-mix(in_srgb,var(--signal)_40%,var(--line))] hover:text-[var(--ink)]"
            >
              <ChevronsUpDown size={14} strokeWidth={2} className="text-[var(--signal)]" />
              <span>{allExpanded ? "Recolher todas" : "Expandir todas"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Formulário de Adição */}
      <form
        className="surface mt-6 flex flex-col gap-3 p-4 transition-all"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          if (newFreq.mode === "days" && newFreq.days.length === 0) return;
          upsertSubject({
            name: name.trim(),
            status: "prox",
            active: true,
            study_days: studyDaysFromFreq(newFreq),
            study_minutes: parseMinutes(newMinutes, 25),
            is_free: newIsFree,
            weight: newWeight,
          });
          setName("");
          setNewMinutes("25");
          setNewIsFree(false);
          setNewWeight(1);
          setNewFreq({ mode: "all", days: [] });
          setShowNewAdvanced(false);
        }}
      >
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <input
            className="input flex-1"
            placeholder="Nova matéria (ex: Português, RLM...)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {!newIsFree && (
            <label className="flex shrink-0 items-center gap-1.5 text-sm">
              <input
                className="input w-20 py-2 text-center font-mono-num"
                type="number"
                min={1}
                max={999}
                inputMode="numeric"
                value={newMinutes}
                onChange={(e) => setNewMinutes(e.target.value)}
                onBlur={() =>
                  setNewMinutes(String(parseMinutes(newMinutes, 25)))
                }
              />
              <span className="text-xs opacity-60">min</span>
            </label>
          )}
          <button type="submit" className="btn btn-primary whitespace-nowrap">
            <Plus size={16} strokeWidth={2.5} /> Adicionar
          </button>
        </div>

        {/* Linha de controles rápidos / toggle de opções avançadas */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-0.5 rounded-full border border-[var(--line)] bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] p-0.5">
              <button
                type="button"
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  !newIsFree
                    ? "bg-[var(--signal)] text-white shadow-sm"
                    : "text-[color-mix(in_srgb,var(--ink)_55%,transparent)] hover:text-[var(--ink)]"
                }`}
                onClick={() => setNewIsFree(false)}
              >
                Com tempo
              </button>
              <button
                type="button"
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  newIsFree
                    ? "bg-[var(--signal)] text-white shadow-sm"
                    : "text-[color-mix(in_srgb,var(--ink)_55%,transparent)] hover:text-[var(--ink)]"
                }`}
                onClick={() => setNewIsFree(true)}
              >
                Livre
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowNewAdvanced((v) => !v)}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-[color-mix(in_srgb,var(--ink)_60%,transparent)] transition hover:bg-[var(--mist)] hover:text-[var(--ink)]"
            >
              <SlidersHorizontal size={12} strokeWidth={2} />
              <span>{showNewAdvanced ? "Ocultar opções" : "Mais opções (peso, dias)"}</span>
              <ChevronDown
                size={13}
                className={`transition-transform duration-200 ${showNewAdvanced ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Opções avançadas no cadastro */}
        {showNewAdvanced && (
          <div className="mt-2 space-y-3 rounded-[var(--radius-tag)] border border-[var(--line)] bg-[color-mix(in_srgb,var(--mist)_40%,var(--surface))] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-[color-mix(in_srgb,var(--ink)_70%,transparent)]">
                Peso no ciclo:
              </span>
              <div className="inline-flex items-center gap-0.5 rounded-full border border-[var(--line)] bg-[var(--surface)] p-0.5">
                {[1, 2, 3, 4].map((w) => (
                  <button
                    key={w}
                    type="button"
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                      newWeight === w
                        ? "bg-[var(--signal)] text-white shadow-sm"
                        : "text-[color-mix(in_srgb,var(--ink)_55%,transparent)] hover:text-[var(--ink)]"
                    }`}
                    onClick={() => setNewWeight(w)}
                  >
                    {w}x
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium text-[color-mix(in_srgb,var(--ink)_70%,transparent)]">
                Frequência de estudo:
              </p>
              <StudyDaysPicker value={newFreq} onChange={setNewFreq} />
            </div>
          </div>
        )}
      </form>

      {/* Lista de Matérias com Accordion */}
      <ul className="mt-6 space-y-3">
        {subjects.map((s, idx) => {
          const freq = freqForSubject(s);
          const free = Boolean(s.is_free);
          const isActive = s.active !== false;
          const isExpanded = Boolean(expandedIds[s.id]);
          const rot = normalizeRotation(s.rotation);
          const currentRotItem = rot ? rot.items[rot.index] ?? rot.items[0] : null;
          const exclusiveDays = normalizeExclusiveDays(s.exclusive_days) ?? [];
          const customStudyDays = normalizeStudyDays(s.study_days);

          return (
            <li
              key={s.id}
              className={`surface overflow-hidden rounded-[var(--radius)] transition-all ${
                !isActive
                  ? "border-[color-mix(in_srgb,var(--line)_80%,transparent)] bg-[color-mix(in_srgb,var(--mist)_35%,var(--surface))]"
                  : ""
              } ${free ? freeRowClass() : statusRowClass(s.status)}`}
            >
              {/* CABEÇALHO DO CARD (Sempre visível / Compacto) */}
              <div className="flex flex-col gap-2 p-3 sm:p-3.5">
                <div className="flex items-center justify-between gap-2.5">
                  {/* Lado Esquerdo: Posição, Ícone, Nome */}
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    {/* Botões rápidos de subir/descer (compactos) */}
                    <div className="flex flex-col items-center -my-1 shrink-0 text-[color-mix(in_srgb,var(--ink)_40%,transparent)]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          move(s.id, -1);
                        }}
                        disabled={!isActive || idx === 0}
                        aria-label={`Subir ${s.name}`}
                        title="Subir no ciclo"
                        className="rounded p-0.5 hover:bg-[var(--mist)] hover:text-[var(--ink)] disabled:opacity-20 transition"
                      >
                        <ChevronUp size={13} strokeWidth={2.5} />
                      </button>
                      <span className="text-[10px] font-mono-num font-semibold leading-none opacity-50">
                        {idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          move(s.id, 1);
                        }}
                        disabled={!isActive || idx === subjects.length - 1}
                        aria-label={`Descer ${s.name}`}
                        title="Descer no ciclo"
                        className="rounded p-0.5 hover:bg-[var(--mist)] hover:text-[var(--ink)] disabled:opacity-20 transition"
                      >
                        <ChevronDown size={13} strokeWidth={2.5} />
                      </button>
                    </div>

                    {/* Ícone da Matéria */}
                    <div className="shrink-0">
                      <SubjectIcon name={s.name || "?"} icon={s.icon} size={30} />
                    </div>

                    {/* Nome da Matéria */}
                    <div className="min-w-0 flex-1">
                      <input
                        className="input w-full font-semibold text-sm sm:text-base py-1 px-2.5 bg-transparent border-transparent hover:border-[var(--line)] focus:bg-[var(--surface)] focus:border-[var(--signal)] rounded-lg transition"
                        value={s.name}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => upsertSubject({ ...s, name: e.target.value })}
                        placeholder="Nome da matéria"
                      />
                    </div>
                  </div>

                  {/* Lado Direito: Status & Botão de Expandir Configurações */}
                  <div className="flex shrink-0 items-center gap-2">
                    {/* Status Badge */}
                    {!isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                        <Pause size={11} strokeWidth={2.5} /> Pausada
                      </span>
                    ) : free ? (
                      <span className="rounded-full bg-[var(--signal-soft)] border border-[color-mix(in_srgb,var(--signal)_30%,transparent)] px-2 py-0.5 text-[11px] font-semibold text-[var(--signal)]">
                        Livre
                      </span>
                    ) : (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${statusClass(
                          s.status
                        )}`}
                      >
                        {STATUS_LABEL[s.status]}
                      </span>
                    )}

                    {/* Botão com seta para expandir/recolher configurações */}
                    <button
                      type="button"
                      onClick={() => toggleExpanded(s.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                        isExpanded
                          ? "border-[var(--signal)] bg-[var(--signal-soft)] text-[var(--signal)]"
                          : "border-[var(--line)] bg-[var(--surface)] text-[color-mix(in_srgb,var(--ink)_75%,transparent)] hover:border-[color-mix(in_srgb,var(--signal)_40%,var(--line))] hover:text-[var(--ink)]"
                      }`}
                      aria-expanded={isExpanded}
                      title={isExpanded ? "Ocultar configurações" : "Abrir configurações"}
                    >
                      <span className="hidden sm:inline">
                        {isExpanded ? "Ocultar" : "Configurações"}
                      </span>
                      <ChevronDown
                        size={15}
                        strokeWidth={2.2}
                        className={`transition-transform duration-200 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Resumo de Badges / Metadados no Card Fechado */}
                <div
                  className="flex flex-wrap items-center gap-1.5 pl-8 sm:pl-9 text-xs text-[color-mix(in_srgb,var(--ink)_65%,transparent)] cursor-pointer"
                  onClick={() => toggleExpanded(s.id)}
                >
                  {!free && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-[color-mix(in_srgb,var(--ink)_5%,transparent)] px-2 py-0.5 font-medium">
                      <Clock size={11} className="opacity-60" />
                      <span>{s.study_minutes ?? 25} min</span>
                    </span>
                  )}

                  {(s.weight ?? 1) > 1 && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-[color-mix(in_srgb,var(--signal)_12%,transparent)] px-2 py-0.5 font-medium text-[var(--signal)]">
                      <span>{s.weight}x por ciclo</span>
                    </span>
                  )}

                  {customStudyDays && customStudyDays.length > 0 && (
                    <span className="rounded-md bg-[color-mix(in_srgb,var(--ink)_5%,transparent)] px-2 py-0.5 font-medium">
                      {customStudyDays.map((d) => DAYS[d]?.slice(0, 3)).join(", ")}
                    </span>
                  )}

                  {exclusiveDays.length > 0 && (
                    <span className="rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 font-medium text-amber-700 dark:text-amber-400">
                      Foco: {exclusiveDays.map((d) => DAYS[d]?.slice(0, 3)).join(", ")}
                    </span>
                  )}

                  {rot && rot.items.length > 0 && currentRotItem && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-[var(--signal-soft)] px-2 py-0.5 font-medium text-[var(--signal)]">
                      <Repeat size={11} strokeWidth={2} />
                      <span className="truncate max-w-[140px]">
                        {currentRotItem.name}
                      </span>
                    </span>
                  )}

                  {s.progress && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-600 dark:text-emerald-400">
                      <BarChart3 size={11} />
                      <span>{progressPercent(s.progress)}%</span>
                    </span>
                  )}

                  {/* Snippet da anotação (se houver e não for rodízio) */}
                  {!rot && s.notes && s.notes.trim() && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-[color-mix(in_srgb,var(--ink)_4%,transparent)] px-2 py-0.5 text-[11px] text-[color-mix(in_srgb,var(--ink)_70%,transparent)] max-w-full">
                      <FileText size={11} className="opacity-50 shrink-0" />
                      <span className="truncate max-w-[220px] sm:max-w-[340px]">
                        {s.notes.trim()}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {/* CORPO EXPANDIDO (Configurações detalhadas da matéria) */}
              {isExpanded && (
                <div className="border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--mist)_25%,var(--surface))] p-4 space-y-4 transition-all">
                  {/* Status & Modo de Estudo */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium uppercase tracking-wider opacity-50">
                        Modo:
                      </span>
                      <div className="inline-flex items-center gap-0.5 rounded-full border border-[var(--line)] bg-[var(--surface)] p-0.5">
                        <button
                          type="button"
                          className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                            !free
                              ? "bg-[var(--signal)] text-white shadow-sm"
                              : "text-[color-mix(in_srgb,var(--ink)_55%,transparent)] hover:text-[var(--ink)]"
                          }`}
                          onClick={() => {
                            if (!free) return;
                            upsertSubject({ ...s, is_free: false });
                          }}
                        >
                          Com tempo
                        </button>
                        <button
                          type="button"
                          className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                            free
                              ? "bg-[var(--signal)] text-white shadow-sm"
                              : "text-[color-mix(in_srgb,var(--ink)_55%,transparent)] hover:text-[var(--ink)]"
                          }`}
                          onClick={() => {
                            if (free) return;
                            upsertSubject({ ...s, is_free: true });
                          }}
                        >
                          Livre
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium uppercase tracking-wider opacity-50">
                        Ciclo:
                      </span>
                      <div className="inline-flex items-center gap-0.5 rounded-full border border-[var(--line)] bg-[var(--surface)] p-0.5">
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
                    </div>
                  </div>

                  {/* Tempo & Peso */}
                  <div className={`space-y-4 transition-opacity ${!isActive ? "opacity-60" : ""}`}>
                    {!free && (
                      <div>
                        <p className="mb-1.5 text-xs font-medium uppercase tracking-wider opacity-50">
                          Tempo de estudo
                        </p>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            className="input w-20 py-1.5 text-center font-mono-num"
                            type="number"
                            min={1}
                            max={999}
                            inputMode="numeric"
                            value={
                              minutesDraft[s.id] ?? String(s.study_minutes ?? 25)
                            }
                            onChange={(e) =>
                              setMinutesDraft((prev) => ({
                                ...prev,
                                [s.id]: e.target.value,
                              }))
                            }
                            onBlur={() => {
                              const next = parseMinutes(
                                minutesDraft[s.id] ?? String(s.study_minutes ?? 25),
                                s.study_minutes ?? 25,
                              );
                              setMinutesDraft((prev) => {
                                const copy = { ...prev };
                                delete copy[s.id];
                                return copy;
                              });
                              if (next !== (s.study_minutes ?? 25)) {
                                upsertSubject({ ...s, study_minutes: next });
                              }
                            }}
                          />
                          <span className="opacity-55 text-xs">minutos por sessão</span>
                        </label>
                      </div>
                    )}

                    <div>
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <p className="text-xs font-medium uppercase tracking-wider opacity-50">
                          Peso no ciclo
                        </p>
                        <span className="text-[11px] opacity-55">
                          {(s.weight ?? 1) > 1
                            ? `${s.weight}x por ciclo (intercalado)`
                            : "1x por ciclo (padrão)"}
                        </span>
                      </div>
                      <div className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface)] p-0.5">
                        {[1, 2, 3, 4].map((w) => {
                          const active = (s.weight ?? 1) === w;
                          return (
                            <button
                              key={w}
                              type="button"
                              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                                active
                                  ? "bg-[var(--signal)] text-white shadow-sm"
                                  : "text-[color-mix(in_srgb,var(--ink)_55%,transparent)] hover:text-[var(--ink)]"
                              }`}
                              onClick={() => {
                                if (active) return;
                                upsertSubject({ ...s, weight: w });
                              }}
                            >
                              {w === 1 ? "1x (Normal)" : `${w}x`}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Frequência & Foco do dia */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
                      <div className="min-w-0">
                        <p className="mb-1.5 text-xs font-medium uppercase tracking-wider opacity-50">
                          Frequência
                        </p>
                        <StudyDaysPicker
                          value={freq}
                          onChange={(next) => updateStudyDays(s, next)}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="mb-1.5 text-xs font-medium uppercase tracking-wider opacity-50">
                          Foco do dia
                        </p>
                        <p className="mb-1.5 text-[11px] leading-snug opacity-50">
                          Nestes dias o foco é só as matérias marcadas.
                        </p>
                        <ExclusiveDaysPicker
                          value={exclusiveDays}
                          onChange={(days) =>
                            upsertSubject({ ...s, exclusive_days: days })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Rodízio interno de disciplinas */}
                  {!free && (
                    <div className="pt-2">
                      <RotationEditor
                        subject={s}
                        onSave={(rotation) => upsertSubject({ ...s, rotation })}
                      />
                    </div>
                  )}

                  {/* Anotações e Recursos quando não usa rodízio */}
                  {!rot && (
                    <div className="space-y-2 pt-1">
                      <p className="text-xs font-medium uppercase tracking-wider opacity-50">
                        Anotações & Recursos
                      </p>
                      <textarea
                        className="input w-full min-h-20"
                        placeholder="Onde parou, links rápidos, resumo..."
                        value={s.notes}
                        onChange={(e) =>
                          upsertSubject({ ...s, notes: e.target.value })
                        }
                      />
                      <SubjectResources
                        recursos={s.recursos}
                        onChange={(recursos) => upsertSubject({ ...s, recursos })}
                      />
                    </div>
                  )}

                  {/* Progresso do Módulo */}
                  <div className="pt-1">
                    <ProgressEditor
                      progress={s.progress}
                      onSave={(progress) => upsertSubject({ ...s, progress })}
                    />
                  </div>

                  {/* Ícone */}
                  <div className="pt-1">
                    <SubjectIconPicker
                      name={s.name}
                      value={s.icon}
                      onChange={(icon) => upsertSubject({ ...s, icon })}
                    />
                  </div>

                  {/* Diálogo de confirmação de exclusão */}
                  {pendingDelete?.id === s.id ? (
                    <div
                      id={`delete-confirm-${s.id}`}
                      className="rounded-[var(--radius-tag)] border border-[color-mix(in_srgb,var(--warn)_40%,var(--line))] bg-[color-mix(in_srgb,var(--warn)_10%,var(--surface))] p-3"
                      role="alertdialog"
                      aria-labelledby={`delete-title-${s.id}`}
                    >
                      <p
                        id={`delete-title-${s.id}`}
                        className="text-sm font-semibold text-[var(--warn)]"
                      >
                        Excluir “{s.name}”?
                      </p>
                      <p className="mt-1 text-xs leading-snug text-[color-mix(in_srgb,var(--ink)_65%,transparent)]">
                        Essa ação não pode ser desfeita. O histórico e as configurações desta matéria serão excluídos.
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="btn"
                          onClick={() => setPendingDelete(null)}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className="btn ml-auto border-[var(--warn)] bg-[color-mix(in_srgb,var(--warn)_12%,var(--surface))] text-[var(--warn)]"
                          onClick={() => {
                            deleteSubject(s.id);
                            setFreqDrafts((prev) => {
                              const next = { ...prev };
                              delete next[s.id];
                              return next;
                            });
                            setPendingDelete(null);
                          }}
                        >
                          <Trash2 size={16} strokeWidth={1.75} /> Sim, excluir
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Ações do Rodapé da Matéria */
                    <div className="flex flex-wrap items-center gap-2 border-t border-[var(--line)]/60 pt-3">
                      <button
                        type="button"
                        className={`btn inline-flex items-center gap-1.5 transition ${
                          isActive
                            ? "text-[color-mix(in_srgb,var(--ink)_75%,transparent)] hover:text-[var(--ink)]"
                            : "btn-primary shadow-sm"
                        }`}
                        onClick={() => upsertSubject({ ...s, active: !isActive })}
                        title={
                          isActive
                            ? "Pausar matéria (não aparecerá no ciclo até ser reativada)"
                            : "Reativar matéria no ciclo"
                        }
                      >
                        {isActive ? (
                          <>
                            <Pause size={14} strokeWidth={2} /> Pausar matéria
                          </>
                        ) : (
                          <>
                            <Play size={14} strokeWidth={2.5} fill="currentColor" /> Ativar matéria
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        className="btn ml-auto text-[var(--warn)] hover:bg-[var(--warn-soft)]"
                        onClick={() =>
                          setPendingDelete({ id: s.id, name: s.name })
                        }
                      >
                        <Trash2 size={15} strokeWidth={1.75} /> Excluir
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
