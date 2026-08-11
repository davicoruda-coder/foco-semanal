"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { STATUS_LABEL, type SubjectStatus } from "@/lib/types";
import { statusClass, statusRowClass } from "@/lib/utils";

export default function MateriasPage() {
  const { data, upsertSubject, setSubjectStatus, deleteSubject, setData } = useApp();
  const [name, setName] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const subjects = [...data.subjects].sort((a, b) => a.cycle_order - b.cycle_order);

  function move(id: string, dir: -1 | 1) {
    setData((prev) => {
      const list = [...prev.subjects].sort((a, b) => a.cycle_order - b.cycle_order);
      const idx = list.findIndex((s) => s.id === id);
      const swap = idx + dir;
      if (swap < 0 || swap >= list.length) return prev;
      const a = list[idx];
      const b = list[swap];
      return {
        ...prev,
        subjects: prev.subjects.map((s) => {
          if (s.id === a.id) return { ...s, cycle_order: b.cycle_order };
          if (s.id === b.id) return { ...s, cycle_order: a.cycle_order };
          return s;
        }),
      };
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Excluir matéria?"
        message={
          pendingDelete
            ? `Deseja mesmo excluir "${pendingDelete.name}"? Essa ação não pode ser desfeita.`
            : ""
        }
        confirmLabel="Sim, excluir"
        cancelLabel="Cancelar"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteSubject(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
      <h1 className="font-display pb-0.5 text-2xl font-semibold leading-normal tracking-tight md:text-3xl">
        Matérias
      </h1>
      <p className="mt-2 opacity-65">Status, observações e ordem do ciclo de estudo.</p>

      <form
        className="surface mt-8 flex flex-col gap-3 p-4 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          upsertSubject({ name: name.trim(), status: "prox" });
          setName("");
        }}
      >
        <input
          className="input"
          placeholder="Nova matéria"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit" className="btn btn-primary whitespace-nowrap">
          Adicionar
        </button>
      </form>

      <ul className="mt-6 space-y-4">
        {subjects.map((s) => (
          <li key={s.id} className={`surface p-4 ${statusRowClass(s.status)}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <input
                className="input max-w-xs font-medium"
                value={s.name}
                onChange={(e) => upsertSubject({ ...s, name: e.target.value })}
              />
              <div className="inline-flex items-center gap-0.5 rounded-full border border-[var(--line)] bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] p-0.5">
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
            <textarea
              className="input mt-3 min-h-20"
              placeholder="Observações"
              value={s.notes}
              onChange={(e) => upsertSubject({ ...s, notes: e.target.value })}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn" onClick={() => move(s.id, -1)}>
                Subir no ciclo
              </button>
              <button type="button" className="btn" onClick={() => move(s.id, 1)}>
                Descer
              </button>
              <button
                type="button"
                className="btn ml-auto text-[var(--warn)]"
                onClick={() => setPendingDelete({ id: s.id, name: s.name })}
              >
                <Trash2 size={16} strokeWidth={1.75} /> Excluir
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
