"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { BackToHoje } from "@/components/BackToHoje";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DAYS, STATUS_LABEL, type Subject, type SubjectStatus } from "@/lib/types";
import { normalizeStudyDays, statusClass, statusRowClass } from "@/lib/utils";

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

export default function MateriasPage() {
  const { data, upsertSubject, setSubjectStatus, deleteSubject, setData } = useApp();
  const [name, setName] = useState("");
  const [newFreq, setNewFreq] = useState<DraftFreq>({ mode: "all", days: [] });
  /** Rascunho local: permite abrir “Dias da semana” antes de marcar algum dia. */
  const [freqDrafts, setFreqDrafts] = useState<Record<string, DraftFreq>>({});
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const subjects = [...data.subjects].sort((a, b) => a.cycle_order - b.cycle_order);

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
          if (pendingDelete) {
            deleteSubject(pendingDelete.id);
            setFreqDrafts((prev) => {
              const next = { ...prev };
              delete next[pendingDelete.id];
              return next;
            });
          }
          setPendingDelete(null);
        }}
      />
      <BackToHoje />
      <h1 className="font-display pb-0.5 text-2xl font-semibold leading-normal tracking-tight md:text-3xl">
        Matérias
      </h1>
      <p className="mt-2 opacity-65">
        Status, dias de estudo, observações e ordem do ciclo.
      </p>

      <form
        className="surface mt-8 flex flex-col gap-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          if (newFreq.mode === "days" && newFreq.days.length === 0) return;
          upsertSubject({
            name: name.trim(),
            status: "prox",
            study_days: studyDaysFromFreq(newFreq),
          });
          setName("");
          setNewFreq({ mode: "all", days: [] });
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="input"
            placeholder="Nova matéria"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="btn btn-primary whitespace-nowrap">
            Adicionar
          </button>
        </div>
        <StudyDaysPicker value={newFreq} onChange={setNewFreq} />
      </form>

      <ul className="mt-6 space-y-4">
        {subjects.map((s) => {
          const freq = freqForSubject(s);
          return (
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
              <div className="mt-3">
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wider opacity-50">
                  Frequência
                </p>
                <StudyDaysPicker
                  value={freq}
                  onChange={(next) => updateStudyDays(s, next)}
                />
              </div>
              <textarea
                className="input mt-3 min-h-20"
                placeholder="Anotações"
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
          );
        })}
      </ul>
    </div>
  );
}
