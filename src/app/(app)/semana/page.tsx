"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DAYS, type BlockType, type WeekBlock } from "@/lib/types";
import {
  BLOCK_COLORS,
  blockStyle,
  defaultBlockColor,
  todayIndex,
} from "@/lib/utils";

function inferTypeFromColor(color: string): BlockType {
  if (color === defaultBlockColor("estudo")) return "estudo";
  if (color === defaultBlockColor("reuniao")) return "reuniao";
  if (color === defaultBlockColor("trabalho")) return "trabalho";
  if (color === defaultBlockColor("pessoal")) return "pessoal";
  return "outro";
}

function DayCard({ dayIndex, name }: { dayIndex: number; name: string }) {
  const { data, upsertWeekBlock, deleteWeekBlock } = useApp();
  const [adding, setAdding] = useState(false);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftColor, setDraftColor] = useState(defaultBlockColor("estudo"));
  const [colorFor, setColorFor] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<WeekBlock | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const isToday = dayIndex === todayIndex();
  const blocks = data.week_blocks
    .filter((b) => b.day === dayIndex)
    .sort((a, b) => a.sort_order - b.sort_order);

  useEffect(() => {
    if (!adding) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAdding(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [adding]);

  function addBlock() {
    const label = draftLabel.trim() || "Novo bloco";
    upsertWeekBlock({
      day: dayIndex,
      label,
      type: inferTypeFromColor(draftColor),
      color: draftColor,
    });
    setDraftLabel("");
    setDraftColor(defaultBlockColor("estudo"));
    setAdding(false);
  }

  function closeAdd() {
    setDraftLabel("");
    setDraftColor(defaultBlockColor("estudo"));
    setAdding(false);
  }

  return (
    <div
      className={`surface relative flex min-h-52 min-w-0 flex-col p-3 ${
        adding ? "z-20 overflow-visible" : "overflow-hidden"
      } ${isToday ? "ring-2 ring-[var(--signal)]" : ""}`}
    >
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Excluir bloco?"
        message={
          pendingDelete
            ? `Deseja excluir "${pendingDelete.label}" de ${name}?`
            : ""
        }
        confirmLabel="Sim, excluir"
        cancelLabel="Cancelar"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteWeekBlock(pendingDelete.id);
          setPendingDelete(null);
        }}
      />

      <p className="mb-3 text-xs font-semibold uppercase tracking-wider opacity-60">
        {name}
        {isToday ? " · hoje" : ""}
      </p>

      <div className="flex-1 space-y-2">
        {blocks.map((b) => {
          const style = blockStyle(b);
          const editing = editingId === b.id;
          return (
            <div key={b.id} className="space-y-1">
              <div
                className={`rounded-[var(--radius-tag)] px-2 py-2 text-sm ${
                  editing ? "ring-2 ring-[var(--signal)]/35" : ""
                }`}
                style={style.style}
              >
                <div className="flex items-start gap-1">
                  <textarea
                    className={`min-w-0 flex-1 resize-none bg-transparent outline-none ${
                      editing
                        ? "min-h-14"
                        : "h-5 overflow-hidden whitespace-nowrap"
                    }`}
                    rows={
                      editing
                        ? Math.min(4, Math.max(2, Math.ceil(b.label.length / 12)))
                        : 1
                    }
                    value={b.label}
                    onFocus={() => setEditingId(b.id)}
                    onBlur={() => {
                      window.setTimeout(() => {
                        setEditingId((id) => (id === b.id ? null : id));
                      }, 120);
                    }}
                    onChange={(e) =>
                      upsertWeekBlock({ ...b, label: e.target.value })
                    }
                  />
                  <div className="flex shrink-0 gap-0.5 pt-0.5">
                    <button
                      type="button"
                      className="rounded bg-[var(--surface)]/70 p-1 opacity-70 hover:opacity-100"
                      title="Cor"
                      aria-label="Escolher cor"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() =>
                        setColorFor((id) => (id === b.id ? null : b.id))
                      }
                    >
                      <span
                        className="block h-3 w-3 rounded-full border border-black/20"
                        style={{
                          background: b.color || defaultBlockColor(b.type),
                        }}
                      />
                    </button>
                    <button
                      type="button"
                      className="rounded bg-[var(--surface)]/70 p-1 opacity-70 hover:text-[var(--warn)] hover:opacity-100"
                      title="Excluir"
                      aria-label="Excluir"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setPendingDelete(b)}
                    >
                      <Trash2 size={12} strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              </div>
              {colorFor === b.id && (
                <div className="flex flex-wrap gap-1 px-0.5">
                  {BLOCK_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`h-5 w-5 rounded-full border-2 ${
                        (b.color || defaultBlockColor(b.type)) === c
                          ? "border-[var(--ink)]"
                          : "border-transparent"
                      }`}
                      style={{ background: c }}
                      onClick={() => {
                        upsertWeekBlock({
                          ...b,
                          color: c,
                          type: inferTypeFromColor(c),
                        });
                        setColorFor(null);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div className="relative">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-1 rounded-[var(--radius-tag)] border border-dashed border-[var(--line)] py-2 text-xs opacity-55 transition hover:opacity-100"
            onClick={() => setAdding(true)}
          >
            <Plus size={14} strokeWidth={2} />
            Bloco
          </button>

          {adding ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-30 cursor-default bg-[color-mix(in_srgb,var(--ink)_18%,transparent)]"
                aria-label="Fechar formulário"
                onClick={closeAdd}
              />
              <div
                className="absolute bottom-0 left-1/2 z-40 w-[min(17.5rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-3.5 shadow-[var(--shadow-lg)]"
                role="dialog"
                aria-label={`Novo bloco em ${name}`}
              >
                <p className="mb-2 text-xs font-semibold opacity-60">
                  Novo bloco · {name}
                </p>
                <input
                  className="input w-full px-3 py-2.5 text-sm"
                  placeholder="Nome do bloco"
                  value={draftLabel}
                  autoFocus
                  onChange={(e) => setDraftLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addBlock();
                    }
                  }}
                />
                <p className="mt-3 text-[10px] uppercase tracking-wider opacity-50">
                  Cor
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {BLOCK_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`h-6 w-6 rounded-full border-2 ${
                        draftColor === c
                          ? "border-[var(--ink)]"
                          : "border-transparent"
                      }`}
                      style={{ background: c }}
                      onClick={() => setDraftColor(c)}
                    />
                  ))}
                </div>
                <div className="mt-3.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="btn btn-primary w-full px-2 py-2 text-xs"
                    onClick={addBlock}
                  >
                    Adicionar
                  </button>
                  <button
                    type="button"
                    className="btn w-full px-2 py-2 text-xs"
                    onClick={closeAdd}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function SemanaPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-display pb-0.5 text-2xl font-semibold leading-normal tracking-tight md:text-3xl">
        Semana
      </h1>
      <p className="mt-2 opacity-65">
        Edite direto em cada dia · escolha a cor do bloco.
      </p>

      <div className="mt-6 flex gap-3 overflow-x-auto overscroll-x-contain pb-2 sm:mt-8 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 md:grid-cols-3 lg:grid-cols-7">
        {DAYS.map((name, i) => (
          <div
            key={name}
            className="relative w-[min(78vw,17rem)] shrink-0 sm:w-auto sm:min-w-0"
          >
            <DayCard dayIndex={i} name={name} />
          </div>
        ))}
      </div>
    </div>
  );
}
