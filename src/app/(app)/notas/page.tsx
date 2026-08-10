"use client";

import { useState } from "react";
import { useApp } from "@/components/AppProvider";

const NOTE_COLORS = ["#FDE047", "#F9A8D4", "#67E8F9", "#BEF264", "#FDBA74", "#C4B5FD"];

export default function NotasPage() {
  const { data, upsertSticky, deleteSticky, upsertColumn } = useApp();
  const [newCol, setNewCol] = useState("");

  const columns = [...data.note_columns].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="font-display text-4xl font-semibold">Notas</h1>
      <p className="mt-2 opacity-65">Post-its por coluna — ideias rápidas de estudo.</p>

      <form
        className="mt-6 flex max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!newCol.trim()) return;
          upsertColumn({ title: newCol.trim() });
          setNewCol("");
        }}
      >
        <input
          className="input"
          placeholder="Nova coluna"
          value={newCol}
          onChange={(e) => setNewCol(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">
          Criar
        </button>
      </form>

      <div className="dot-board mt-8 overflow-x-auto rounded-[var(--radius)] border border-[var(--line)] p-4">
        <div className="flex min-w-max gap-4">
          {columns.map((col) => {
            const notes = data.sticky_notes
              .filter((n) => n.column_id === col.id)
              .sort((a, b) => a.sort_order - b.sort_order);
            return (
              <div
                key={col.id}
                className="w-64 shrink-0 rounded-[var(--radius)] p-3"
                style={{ background: `${col.color}55`, color: "#292524" }}
              >
                <input
                  className="mb-3 w-full bg-transparent font-semibold outline-none"
                  value={col.title}
                  onChange={(e) => upsertColumn({ ...col, title: e.target.value })}
                />
                <div className="space-y-3">
                  {notes.map((n, i) => (
                    <div
                      key={n.id}
                      className="note-enter relative min-h-28 rounded-sm p-3 shadow-sm"
                      style={
                        {
                          background: n.color,
                          color: "#292524",
                          ["--rot" as string]: `${(i % 2 === 0 ? -1.5 : 1.2) + (i % 3) * 0.3}deg`,
                          transform: "rotate(var(--rot))",
                        } as React.CSSProperties
                      }
                    >
                      <textarea
                        className="font-hand h-24 w-full resize-none bg-transparent text-lg leading-tight outline-none"
                        value={n.text}
                        onChange={(e) => upsertSticky({ ...n, text: e.target.value })}
                      />
                      <div className="mt-1 flex gap-1">
                        {NOTE_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            className="h-4 w-4 rounded-sm border border-black/10"
                            style={{ background: c }}
                            onClick={() => upsertSticky({ ...n, color: c })}
                          />
                        ))}
                        <button
                          type="button"
                          className="ml-auto text-xs opacity-60"
                          onClick={() => deleteSticky(n.id)}
                        >
                          apagar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn mt-3 w-full bg-white/70"
                  style={{ color: "#292524" }}
                  onClick={() =>
                    upsertSticky({
                      column_id: col.id,
                      text: "",
                      color: NOTE_COLORS[notes.length % NOTE_COLORS.length],
                    })
                  }
                >
                  + Nota
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
