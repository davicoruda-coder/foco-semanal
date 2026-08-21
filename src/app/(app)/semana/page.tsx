"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2 } from "lucide-react";
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

const MOVE_MOUSE = 5;
const MOVE_TOUCH = 10;
const HOLD_MS = 180;
const FLIP_MS = 220;

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

function placeWeekBlock(
  blocks: WeekBlock[],
  blockId: string,
  targetDay: number,
  beforeId: string | null,
): WeekBlock[] {
  const moving = blocks.find((b) => b.id === blockId);
  if (!moving) return blocks;
  if (beforeId === blockId) return blocks;

  const fromDay = moving.day;
  const sourceList = blocks
    .filter((b) => b.day === fromDay)
    .sort((a, b) => a.sort_order - b.sort_order);
  const from = sourceList.findIndex((b) => b.id === blockId);
  if (from < 0) return blocks;

  if (fromDay === targetDay) {
    let to = beforeId
      ? sourceList.findIndex((b) => b.id === beforeId)
      : sourceList.length;
    if (to < 0) to = sourceList.length;
    if (to > from) to -= 1;
    if (to === from) return blocks;
    const next = [...sourceList];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    const others = blocks.filter((b) => b.day !== fromDay);
    return [...others, ...next.map((b, i) => ({ ...b, sort_order: i }))];
  }

  const targetList = blocks
    .filter((b) => b.day === targetDay)
    .sort((a, b) => a.sort_order - b.sort_order);
  let to = beforeId
    ? targetList.findIndex((b) => b.id === beforeId)
    : targetList.length;
  if (to < 0) to = targetList.length;

  const sourceRest = sourceList
    .filter((b) => b.id !== blockId)
    .map((b, i) => ({ ...b, sort_order: i }));
  const nextTarget = [...targetList];
  nextTarget.splice(to, 0, { ...moving, day: targetDay });
  const others = blocks.filter(
    (b) => b.day !== fromDay && b.day !== targetDay,
  );
  return [
    ...others,
    ...sourceRest,
    ...nextTarget.map((b, i) => ({ ...b, sort_order: i })),
  ];
}

function hitSlot(
  clientX: number,
  clientY: number,
  draggingId: string,
): { day: number; beforeId: string | null } | null {
  const els = document.elementsFromPoint(clientX, clientY);
  for (const node of els) {
    const el = node as HTMLElement;
    const block = el.closest?.("[data-block-id]") as HTMLElement | null;
    if (block) {
      const id = block.dataset.blockId;
      if (!id || id === draggingId) continue;
      const dayEl = block.closest("[data-week-day]") as HTMLElement | null;
      if (!dayEl) continue;
      const day = Number(dayEl.dataset.weekDay);
      if (Number.isNaN(day)) continue;
      const rect = block.getBoundingClientRect();
      const after = clientY > rect.top + rect.height / 2;
      if (!after) return { day, beforeId: id };
      const next = block.nextElementSibling as HTMLElement | null;
      const nextId =
        next?.dataset?.blockId && next.dataset.blockId !== draggingId
          ? next.dataset.blockId
          : null;
      return { day, beforeId: nextId };
    }
    const dayEl = el.closest?.("[data-week-day]") as HTMLElement | null;
    if (dayEl) {
      const day = Number(dayEl.dataset.weekDay);
      if (Number.isNaN(day)) continue;
      return { day, beforeId: null };
    }
  }
  return null;
}

type DragGhost = {
  id: string;
  label: string;
  background: string;
  w: number;
  h: number;
  x: number;
  y: number;
  grabX: number;
  grabY: number;
};

function useFlip(orderKey: string) {
  const nodes = useRef(new Map<string, HTMLElement>());
  const prev = useRef(new Map<string, DOMRect>());

  useLayoutEffect(() => {
    const nextRects = new Map<string, DOMRect>();
    nodes.current.forEach((el, id) => {
      nextRects.set(id, el.getBoundingClientRect());
    });
    nodes.current.forEach((el, id) => {
      const last = prev.current.get(id);
      const next = nextRects.get(id);
      if (!last || !next) return;
      const dx = last.left - next.left;
      const dy = last.top - next.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      el.style.transition = "none";
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      requestAnimationFrame(() => {
        el.style.transition = `transform ${FLIP_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
        el.style.transform = "";
      });
    });
    prev.current = nextRects;
  }, [orderKey]);

  return (id: string) => (el: HTMLDivElement | null) => {
    if (el) nodes.current.set(id, el);
    else nodes.current.delete(id);
  };
}

function DayCard({
  dayIndex,
  name,
  blocks,
  draggingId,
  placeholderH,
  overDay,
  registerFlip,
  onPointerDownBlock,
}: {
  dayIndex: number;
  name: string;
  blocks: WeekBlock[];
  draggingId: string | null;
  placeholderH: number;
  overDay: number | null;
  registerFlip: (id: string) => (el: HTMLDivElement | null) => void;
  onPointerDownBlock: (
    block: WeekBlock,
    e: ReactPointerEvent<HTMLDivElement>,
  ) => void;
}) {
  const { upsertWeekBlock, deleteWeekBlock } = useApp();
  const [adding, setAdding] = useState(false);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftColor, setDraftColor] = useState(defaultBlockColor("estudo"));
  const [colorFor, setColorFor] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<WeekBlock | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editWrapRef = useRef<HTMLDivElement | null>(null);

  const isToday = dayIndex === todayIndex();
  const { shown: addingShown, leaving: addingLeaving } =
    useOpenTransition(adding);

  useEffect(() => {
    if (!adding) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAdding(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [adding]);

  useEffect(() => {
    if (!editingId) return;
    function onPointerDown(e: PointerEvent) {
      const wrap = editWrapRef.current;
      if (!wrap || wrap.contains(e.target as Node)) return;
      setEditingId(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setEditingId(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [editingId]);

  useEffect(() => {
    if (draggingId) {
      setEditingId(null);
      setColorFor(null);
    }
  }, [draggingId]);

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
      data-week-day={dayIndex}
      className={`surface relative flex min-h-52 min-w-0 flex-col p-3 transition ${
        addingShown || draggingId ? "z-20 overflow-visible" : "overflow-hidden"
      } ${isToday && !draggingId ? "ring-2 ring-[var(--signal)]" : ""} ${
        overDay === dayIndex
          ? "ring-2 ring-[var(--accent-2)] ring-offset-2 ring-offset-[var(--paper)]"
          : ""
      }`}
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
          const isDragging = draggingId === b.id;
          return (
            <div
              key={b.id}
              ref={registerFlip(b.id)}
              data-block-id={b.id}
              className="space-y-1 will-change-transform"
            >
              {isDragging ? (
                <div
                  className="rounded-[var(--radius-tag)] border-2 border-dashed border-[color-mix(in_srgb,var(--ink)_22%,transparent)] bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]"
                  style={{ height: placeholderH }}
                />
              ) : editing ? (
                <div
                  ref={editWrapRef}
                  className="rounded-[var(--radius-tag)] p-2.5 ring-2 ring-[var(--signal)]/40"
                  style={style.style}
                >
                  <textarea
                    autoFocus
                    className="min-h-20 w-full resize-y break-words bg-transparent text-sm leading-snug outline-none"
                    rows={3}
                    value={b.label}
                    onChange={(e) =>
                      upsertWeekBlock({ ...b, label: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setEditingId(null);
                      }
                    }}
                  />
                </div>
              ) : (
                <div
                  className="group relative cursor-grab rounded-[var(--radius-tag)] px-2.5 py-2 text-sm select-none active:cursor-grabbing"
                  style={style.style}
                  title="Arraste para reordenar · clique para editar"
                  onPointerDown={(e) => {
                    if ((e.target as HTMLElement).closest("[data-no-drag]")) {
                      return;
                    }
                    onPointerDownBlock(b, e);
                  }}
                  onClick={(e) => {
                    if (draggingId) return;
                    if ((e.target as HTMLElement).closest("[data-no-drag]")) {
                      return;
                    }
                    setColorFor(null);
                    setEditingId(b.id);
                  }}
                >
                  <div className="flex items-center gap-0.5">
                    <span
                      className="min-w-0 flex-1 whitespace-normal break-words px-0.5 py-0.5 text-left text-sm leading-snug"
                      lang="pt-BR"
                    >
                      {b.label || "Sem nome"}
                    </span>
                    <div
                      className={`contents lg:absolute lg:right-1 lg:top-1 lg:z-10 lg:flex lg:items-center lg:gap-0.5 lg:rounded-lg lg:px-1 lg:py-0.5 lg:shadow-[0_1px_8px_rgba(0,0,0,0.16)] lg:transition-opacity ${
                        colorFor === b.id
                          ? "lg:opacity-100"
                          : "lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
                      }`}
                      style={{ background: style.style?.background }}
                    >
                      <button
                        type="button"
                        data-no-drag
                        className="shrink-0 rounded-md bg-black/[0.08] p-1 transition hover:bg-black/20"
                        title="Cor"
                        aria-label="Escolher cor"
                        onClick={() => {
                          setColorFor((id) => (id === b.id ? null : b.id));
                        }}
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
                        data-no-drag
                        className="shrink-0 rounded-md bg-black/[0.08] p-1 transition hover:bg-black/20"
                        title="Excluir"
                        aria-label="Excluir"
                        onClick={() => setPendingDelete(b)}
                      >
                        <Trash2 size={13} strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {!editing && !isDragging && colorFor === b.id && (
                <div className="panel-in" data-no-drag>
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
  const { data, setData } = useApp();
  const [draftBlocks, setDraftBlocks] = useState<WeekBlock[] | null>(null);
  const [ghost, setGhost] = useState<DragGhost | null>(null);
  const [overDay, setOverDay] = useState<number | null>(null);
  const session = useRef<{
    id: string;
    pointerId: number;
    startX: number;
    startY: number;
    active: boolean;
    holdTimer: number | null;
    captureEl: HTMLElement | null;
  } | null>(null);
  const draftRef = useRef<WeekBlock[] | null>(null);
  const ghostRef = useRef<DragGhost | null>(null);
  const dataRef = useRef(data);

  const weekBlocks = draftBlocks ?? data.week_blocks;
  const orderKey = weekBlocks
    .slice()
    .sort((a, b) => a.day - b.day || a.sort_order - b.sort_order)
    .map((b) => `${b.day}:${b.id}`)
    .join("|");
  const registerFlip = useFlip(orderKey);

  draftRef.current = draftBlocks;
  ghostRef.current = ghost;
  dataRef.current = data;

  function finishDrag() {
    const s = session.current;
    if (s?.holdTimer != null) window.clearTimeout(s.holdTimer);
    session.current = null;
    document.documentElement.classList.remove("is-dragging-block");
    const next = draftRef.current;
    if (next) {
      setData((prev) => ({ ...prev, week_blocks: next }));
    }
    setDraftBlocks(null);
    setGhost(null);
    setOverDay(null);
  }

  function activateDrag() {
    const s = session.current;
    const g = ghostRef.current;
    if (!s || s.active || !g) return;
    s.active = true;
    s.captureEl?.setPointerCapture(s.pointerId);
    document.documentElement.classList.add("is-dragging-block");
    setDraftBlocks(dataRef.current.week_blocks);
    setGhost({ ...g });
  }

  function onPointerDownBlock(
    block: WeekBlock,
    e: ReactPointerEvent<HTMLDivElement>,
  ) {
    if (e.button !== 0) return;
    if (session.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const style = blockStyle(block);
    const g: DragGhost = {
      id: block.id,
      label: block.label || "Sem nome",
      background: style.style?.background ?? defaultBlockColor(block.type),
      w: rect.width,
      h: rect.height,
      x: e.clientX,
      y: e.clientY,
      grabX: e.clientX - rect.left,
      grabY: e.clientY - rect.top,
    };
    ghostRef.current = g;
    session.current = {
      id: block.id,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      active: false,
      holdTimer: null,
      captureEl: e.currentTarget,
    };
    if (e.pointerType !== "mouse") {
      session.current.holdTimer = window.setTimeout(activateDrag, HOLD_MS);
    }

    const onMove = (ev: PointerEvent) => {
      const cur = session.current;
      if (!cur || ev.pointerId !== cur.pointerId) return;
      const dx = ev.clientX - cur.startX;
      const dy = ev.clientY - cur.startY;
      const dist = Math.hypot(dx, dy);
      if (!cur.active) {
        const isTouch = ev.pointerType === "touch";
        if (isTouch && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
          if (cur.holdTimer != null) window.clearTimeout(cur.holdTimer);
          session.current = null;
          ghostRef.current = null;
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          window.removeEventListener("pointercancel", onUp);
          return;
        }
        const need = isTouch ? MOVE_TOUCH : MOVE_MOUSE;
        if (dist < need) return;
        activateDrag();
      }
      if (!session.current?.active) return;
      ev.preventDefault();
      const nextGhost = {
        ...(ghostRef.current as DragGhost),
        x: ev.clientX,
        y: ev.clientY,
      };
      ghostRef.current = nextGhost;
      setGhost(nextGhost);
      const slot = hitSlot(ev.clientX, ev.clientY, cur.id);
      if (!slot) return;
      setOverDay(slot.day);
      setDraftBlocks((prev) => {
        const base = prev ?? dataRef.current.week_blocks;
        const next = placeWeekBlock(base, cur.id, slot.day, slot.beforeId);
        if (next === base) return prev;
        return next;
      });
    };

    const onUp = (ev: PointerEvent) => {
      const cur = session.current;
      if (!cur || ev.pointerId !== cur.pointerId) return;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      const wasActive = cur.active;
      finishDrag();
      if (wasActive) {
        ev.preventDefault();
        const stopClick = (click: Event) => {
          click.preventDefault();
          click.stopPropagation();
          document.removeEventListener("click", stopClick, true);
        };
        document.addEventListener("click", stopClick, true);
        window.setTimeout(
          () => document.removeEventListener("click", stopClick, true),
          400,
        );
      }
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  return (
    <div className="mx-auto max-w-6xl lg:max-w-none">
      <h1 className="font-display pb-0.5 text-2xl font-semibold leading-normal tracking-tight md:text-3xl">
        Semana
      </h1>
      <p className="mt-2 opacity-65">
        Clique para editar · arraste o bloco para reordenar ou mudar de dia.
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
              blocks={weekBlocks
                .filter((b) => b.day === i)
                .sort((a, b) => a.sort_order - b.sort_order)}
              draggingId={draftBlocks && ghost ? ghost.id : null}
              placeholderH={ghost?.h ?? 40}
              overDay={overDay}
              registerFlip={registerFlip}
              onPointerDownBlock={onPointerDownBlock}
            />
          </div>
        ))}
      </div>

      {draftBlocks && ghost
        ? createPortal(
            <div
              className="pointer-events-none fixed top-0 left-0 z-[80] rounded-[var(--radius-tag)] px-2.5 py-2 text-sm font-medium shadow-[var(--shadow-lg)]"
              style={{
                width: ghost.w,
                background: ghost.background,
                color: "#14201a",
                transform: `translate(${ghost.x - ghost.grabX}px, ${ghost.y - ghost.grabY}px) scale(1.04) rotate(1.2deg)`,
              }}
            >
              {ghost.label}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
