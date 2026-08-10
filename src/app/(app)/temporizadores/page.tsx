"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { FocusTimer } from "@/lib/types";

const ACCENTS = [
  "var(--signal)",
  "var(--accent-2)",
  "var(--warn)",
  "#8B5CF6",
  "#EC4899",
  "#0EA5E9",
];

export default function TemporizadoresPage() {
  const { data, upsertTimer, deleteTimer } = useApp();
  const timers = useMemo(
    () => [...(data.timers ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [data.timers],
  );
  const [pendingDelete, setPendingDelete] = useState<FocusTimer | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftMinutes, setDraftMinutes] = useState(25);

  function addTimer() {
    const name = draftName.trim() || `Temporizador ${timers.length + 1}`;
    upsertTimer({
      name,
      minutes: Math.max(1, draftMinutes),
      accent: ACCENTS[timers.length % ACCENTS.length],
    });
    setDraftName("");
    setDraftMinutes(25);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Excluir temporizador?"
        message={
          pendingDelete
            ? `Deseja excluir "${pendingDelete.name}"?`
            : ""
        }
        confirmLabel="Sim, excluir"
        cancelLabel="Cancelar"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteTimer(pendingDelete.id);
          setPendingDelete(null);
        }}
      />

      <h1 className="font-display text-4xl font-semibold">Temporizadores</h1>
      <p className="mt-2 opacity-65">
        Mesmos da tela principal — renomeie, ajuste minutos, adicione ou exclua.
      </p>

      <section className="surface mt-8 overflow-hidden p-0">
        <div
          className="px-4 py-3 text-white md:px-5"
          style={{
            background:
              "linear-gradient(120deg, var(--signal), color-mix(in srgb, var(--signal) 55%, var(--accent-2)))",
          }}
        >
          <p className="font-display text-base font-semibold tracking-tight md:text-lg">
            Gerenciar
          </p>
        </div>

        <ul className="divide-y divide-[var(--line)]">
          {timers.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-4 md:px-5">
              <span
                className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-[3px] font-mono-num text-xs font-medium"
                style={{ borderColor: t.accent }}
              >
                {String(t.minutes).padStart(2, "0")}:00
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <input
                  className="input py-2"
                  value={t.name}
                  onChange={(e) =>
                    upsertTimer({ ...t, name: e.target.value || t.name })
                  }
                  aria-label="Nome"
                />
                <label className="flex items-center gap-2 text-sm opacity-70">
                  Minutos
                  <input
                    type="number"
                    min={1}
                    className="input w-24 py-1.5"
                    value={t.minutes}
                    onChange={(e) =>
                      upsertTimer({
                        ...t,
                        minutes: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                  />
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ACCENTS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      title="Cor"
                      className={`h-5 w-5 rounded-full border-2 ${
                        t.accent === c ? "border-[var(--ink)]" : "border-transparent"
                      }`}
                      style={{ background: c }}
                      onClick={() => upsertTimer({ ...t, accent: c })}
                    />
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="btn text-[var(--warn)]"
                onClick={() => setPendingDelete(t)}
                disabled={timers.length <= 1}
                title={
                  timers.length <= 1
                    ? "Deixe pelo menos um temporizador"
                    : "Excluir"
                }
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>

        <div className="border-t border-[var(--line)] bg-[var(--mist)]/40 p-4 md:p-5">
          <p className="mb-3 text-sm font-medium">Novo temporizador</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="input"
              placeholder="Nome"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
            />
            <input
              type="number"
              min={1}
              className="input sm:w-28"
              placeholder="Min"
              value={draftMinutes}
              onChange={(e) => setDraftMinutes(Number(e.target.value) || 1)}
            />
            <button type="button" className="btn btn-primary whitespace-nowrap" onClick={addTimer}>
              <Plus size={16} /> Adicionar
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
