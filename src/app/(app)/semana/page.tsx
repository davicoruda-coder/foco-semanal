"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useOpenTransition } from "@/lib/use-open-transition";
import { DAYS, type BlockType, type WeekBlock } from "@/lib/types";
import {
  BLOCK_COLORS,
  blockStyle,
  defaultBlockColor,
  todayIndex,
} from "@/lib/utils";

const DRAG_MIME = "application/x-foco-week-block";

function inferTypeFromColor(color: string): BlockType {
  if (color === defaultBlockColor("estudo")) return "estudo";
  if (color === defaultBlockColor("reuniao")) return "reuniao";
  if (color === defaultBlockColor("trabalho")) return "trabalho";
  if (color === defaultBlockColor("pessoal")) return "pessoal";
  return "outro";
}

function ColorSwatches({
  value,
  onPick,
}: {
  value: string;
  onPick: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 px-0.5 sm:gap-1.5">
      {BLOCK_COLORS.map((c) => {
        const selected = value === c;
        return (
          <button
            key={c}
            type="button"
            title="Escolher cor"
            aria-label={`Cor ${c}`}
            aria-pressed={selected}
            className={`h-10 w-10 shrink-0 rounded-full border-2 sm:h-8 sm:w-8 ${
              selected ? "border-[var(--ink)]" : "border-black/10"
            }`}
            style={{ background: c }}
            onClick={() => onPick(c)}
          />
        );
      })}
    </div>
  );
}

function DayCard({
  dayIndex,
  name,
  draggingId,
  onDragBlock,
}: {
  dayIndex: number;
  name: string;
  draggingId: string | null;
  onDragBlock: (id: string | null) => void;
}) {
  const { data, setData, upsertWeekBlock, deleteWeekBlock } = useApp();
  const [adding, setAdding] = useState(false);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftColor, setDraftColor] = useState(defaultBlockColor("estudo"));
  const [colorFor, setColorFor] = useState<string | null>(null);
  const [moveFor, setMoveFor] = useState<string | null>(null);
  const [dragArmed, setDragArmed] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<WeekBlock | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dropHighlight, setDropHighlight] = useState(false);

  const isToday = dayIndex === todayIndex();
  const { shown: addingShown, leaving: addingLeaving } =
    useOpenTransition(adding);
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

  function reorderWithinDay(fromId: string, toId: string) {
    if (fromId === toId) return;
    setData((prev) => {
      const dayBlocks = prev.week_blocks
        .filter((b) => b.day === dayIndex)
        .sort((a, b) => a.sort_order - b.sort_order);
      const from = dayBlocks.findIndex((b) => b.id === fromId);
      const to = dayBlocks.findIndex((b) => b.id === toId);
      if (from < 0 || to < 0) return prev;
      const next = [...dayBlocks];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      const others = prev.week_blocks.filter((b) => b.day !== dayIndex);
      return {
        ...prev,
        week_blocks: [
          ...others,
          ...next.map((b, i) => ({ ...b, sort_order: i })),
        ],
      };
    });
  }

  function moveBlockBy(id: string, delta: -1 | 1) {
    setData((prev) => {
      const dayBlocks = prev.week_blocks
        .filter((b) => b.day === dayIndex)
        .sort((a, b) => a.sort_order - b.sort_order);
      const from = dayBlocks.findIndex((b) => b.id === id);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= dayBlocks.length) return prev;
      const next = [...dayBlocks];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      const others = prev.week_blocks.filter((b) => b.day !== dayIndex);
      return {
        ...prev,
        week_blocks: [
          ...others,
          ...next.map((b, i) => ({ ...b, sort_order: i })),
        ],
      };
    });
  }

  function acceptIncomingBlock(blockId: string, beforeId?: string) {
    setData((prev) => {
      const moving = prev.week_blocks.find((b) => b.id === blockId);
      if (!moving) return prev;

      if (moving.day === dayIndex) {
        if (!beforeId) return prev;
        const dayBlocks = prev.week_blocks
          .filter((b) => b.day === dayIndex)
          .sort((a, b) => a.sort_order - b.sort_order);
        const from = dayBlocks.findIndex((b) => b.id === blockId);
        const to = dayBlocks.findIndex((b) => b.id === beforeId);
        if (from < 0 || to < 0 || from === to) return prev;
        const next = [...dayBlocks];
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        const others = prev.week_blocks.filter((b) => b.day !== dayIndex);
        return {
          ...prev,
          week_blocks: [
            ...others,
            ...next.map((b, i) => ({ ...b, sort_order: i })),
          ],
        };
      }

      const sourceDay = moving.day;
      const sourceRest = prev.week_blocks
        .filter((b) => b.day === sourceDay && b.id !== blockId)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((b, i) => ({ ...b, sort_order: i }));

      const target = prev.week_blocks
        .filter((b) => b.day === dayIndex)
        .sort((a, b) => a.sort_order - b.sort_order);
      const insertAt = beforeId
        ? target.findIndex((b) => b.id === beforeId)
        : -1;
      const safeInsert = insertAt >= 0 ? insertAt : target.length;
      const moved = { ...moving, day: dayIndex };
      const nextTarget = [...target];
      nextTarget.splice(safeInsert, 0, moved);

      const others = prev.week_blocks.filter(
        (b) => b.day !== sourceDay && b.day !== dayIndex,
      );

      return {
        ...prev,
        week_blocks: [
          ...others,
          ...sourceRest,
          ...nextTarget.map((b, i) => ({ ...b, sort_order: i })),
        ],
      };
    });
  }

  function readDragId(e: React.DragEvent) {
    return (
      e.dataTransfer.getData(DRAG_MIME) ||
      e.dataTransfer.getData("text/plain") ||
      draggingId ||
      ""
    );
  }

  return (
    <div
      className={`surface relative flex min-h-52 min-w-0 flex-col p-3 transition ${
        addingShown ? "z-20 overflow-visible" : "overflow-hidden"
      } ${isToday ? "ring-2 ring-[var(--signal)]" : ""} ${
        dropHighlight
          ? "ring-2 ring-[var(--accent-2)] ring-offset-2 ring-offset-[var(--paper)]"
          : ""
      }`}
      onDragOver={(e) => {
        if (!draggingId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDropHighlight(true);
      }}
      onDragLeave={() => setDropHighlight(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDropHighlight(false);
        const id = readDragId(e);
        if (!id) return;
        acceptIncomingBlock(id);
        onDragBlock(null);
      }}
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
        {blocks.map((b, index) => {
          const style = blockStyle(b);
          const editing = editingId === b.id;
          const isDragging = draggingId === b.id;
          return (
            <div
              key={b.id}
              className={`space-y-1 ${isDragging ? "opacity-45" : ""}`}
              draggable={dragArmed === b.id}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData(DRAG_MIME, b.id);
                e.dataTransfer.setData("text/plain", b.id);
                onDragBlock(b.id);
                setColorFor(null);
              }}
              onDragEnd={() => {
                setDragArmed(null);
                onDragBlock(null);
                setDropHighlight(false);
              }}
              onDragOver={(e) => {
                if (!draggingId || draggingId === b.id) return;
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDropHighlight(false);
                const id = readDragId(e);
                if (!id || id === b.id) return;
                if (
                  data.week_blocks.find((x) => x.id === id)?.day === dayIndex
                ) {
                  reorderWithinDay(id, b.id);
                } else {
                  acceptIncomingBlock(id, b.id);
                }
                onDragBlock(null);
              }}
            >
              <div
                className={`rounded-[var(--radius-tag)] px-2 py-2 text-sm ${
                  editing ? "ring-2 ring-[var(--signal)]/35" : ""
                }`}
                style={style.style}
              >
                <div className="flex items-start gap-1">
                  <button
                    type="button"
                    className="-ml-0.5 shrink-0 cursor-grab rounded p-1 opacity-55 hover:opacity-100 active:cursor-grabbing"
                    title="Arrastar ou tocar para mover"
                    aria-label="Mover bloco"
                    aria-expanded={moveFor === b.id}
                    onPointerDown={() => setDragArmed(b.id)}
                    onPointerUp={() => setDragArmed(null)}
                    onPointerCancel={() => setDragArmed(null)}
                    onClick={() =>
                      setMoveFor((id) => (id === b.id ? null : b.id))
                    }
                  >
                    <GripVertical size={15} strokeWidth={2} />
                  </button>
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
                        className="block h-3.5 w-3.5 rounded-full border border-black/20"
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
                      <Trash2 size={13} strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              </div>
              {moveFor === b.id && (
                <div className="panel-in flex gap-1.5 px-0.5">
                  <button
                    type="button"
                    className="btn flex-1 justify-center px-2 py-2 text-xs disabled:opacity-35"
                    title="Subir"
                    aria-label="Subir bloco"
                    disabled={index === 0}
                    onClick={() => moveBlockBy(b.id, -1)}
                  >
                    <ChevronUp size={16} strokeWidth={2} />
                  </button>
                  <button
                    type="button"
                    className="btn flex-1 justify-center px-2 py-2 text-xs disabled:opacity-35"
                    title="Descer"
                    aria-label="Descer bloco"
                    disabled={index === blocks.length - 1}
                    onClick={() => moveBlockBy(b.id, 1)}
                  >
                    <ChevronDown size={16} strokeWidth={2} />
                  </button>
                </div>
              )}
              {colorFor === b.id && (
                <div className="panel-in">
                  <ColorSwatches
                    value={b.color || defaultBlockColor(b.type)}
                    onPick={(c) => {
                      upsertWeekBlock({
                        ...b,
                        color: c,
                        type: inferTypeFromColor(c),
                      });
                      setColorFor(null);
                    }}
                  />
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

          {addingShown ? (
            <>
              <button
                type="button"
                className={`scrim-fade fixed inset-0 z-30 cursor-default bg-[color-mix(in_srgb,var(--ink)_18%,transparent)] ${
                  addingLeaving ? "is-leaving" : ""
                }`}
                aria-label="Fechar formulário"
                onClick={closeAdd}
              />
              <div
                className="absolute bottom-0 left-1/2 z-40 w-[min(17.5rem,calc(100vw-1.5rem))] -translate-x-1/2"
                role="dialog"
                aria-label={`Novo bloco em ${name}`}
              >
                <div
                  className={`rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-3.5 shadow-[var(--shadow-lg)] ${
                    addingLeaving ? "panel-out" : "panel-in"
                  }`}
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
                  <div className="mt-2">
                    <ColorSwatches
                      value={draftColor}
                      onPick={setDraftColor}
                    />
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
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function SemanaPage() {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-display pb-0.5 text-2xl font-semibold leading-normal tracking-tight md:text-3xl">
        Semana
      </h1>
      <p className="mt-2 opacity-65">
        Edite, escolha a cor e reordene os blocos (arraste ou use as setas).
      </p>

      <div className="mt-6 flex gap-3 overflow-x-auto overscroll-x-contain pb-2 sm:mt-8 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 md:grid-cols-3 lg:grid-cols-7">
        {DAYS.map((name, i) => (
          <div
            key={name}
            className="relative w-[min(78vw,17rem)] shrink-0 sm:w-auto sm:min-w-0"
          >
            <DayCard
              dayIndex={i}
              name={name}
              draggingId={draggingId}
              onDragBlock={setDraggingId}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
