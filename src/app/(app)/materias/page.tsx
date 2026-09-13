"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Repeat, Trash2, X } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { BackToHoje } from "@/components/BackToHoje";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SubjectIconPicker } from "@/components/SubjectIconPicker";
import { newId } from "@/lib/demo-store";
import {
  DAYS,
  STATUS_LABEL,
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
} from "@/lib/utils";

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
          1 matéria: só anotações. 2+ no mesmo dia: mini-ciclo entre elas (sem
          mudar o ciclo normal).
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

  if (!open) {
    return (
      <button
        type="button"
        className="btn text-sm"
        onClick={() => setOpen(true)}
      >
        <Repeat size={15} strokeWidth={1.75} /> Ativar rodízio de disciplinas
      </button>
    );
  }

  return (
    <div className="mt-1 w-full rounded-[var(--radius-tag)] border border-[var(--line)] bg-[var(--mist)]/50 p-3">
      <ConfirmDialog
        open={confirmOff}
        title="Desativar rodízio?"
        message="As disciplinas do rodízio e as anotações de cada uma serão removidas. Essa ação não pode ser desfeita."
        confirmLabel="Sim, desativar"
        cancelLabel="Cancelar"
        onCancel={() => setConfirmOff(false)}
        onConfirm={() => {
          setConfirmOff(false);
          setOpen(false);
          onSave(null);
        }}
      />
      <div className="flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider opacity-60">
          <Repeat size={13} strokeWidth={2} /> Rodízio de disciplinas
        </p>
        <button
          type="button"
          className="rounded-full p-1.5 text-[color-mix(in_srgb,var(--ink)_45%,transparent)] transition hover:bg-[var(--surface)] hover:text-[var(--warn)]"
          title="Desativar rodízio"
          aria-label="Desativar rodízio"
          onClick={() => {
            if (rot) setConfirmOff(true);
            else setOpen(false);
          }}
        >
          <X size={15} strokeWidth={2} />
        </button>
      </div>
      <p className="mt-1 text-xs leading-snug opacity-55">
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
                {it.notes.trim() && (
                  <p className="mt-0.5 truncate px-1 text-xs opacity-50">
                    {it.notes}
                  </p>
                )}
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
                onClick={() => removeItem(it.id)}
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
  );
}

export default function MateriasPage() {
  const { data, upsertSubject, setSubjectStatus, deleteSubject, setData } = useApp();
  const [name, setName] = useState("");
  const [newMinutes, setNewMinutes] = useState("25");
  const [newIsFree, setNewIsFree] = useState(false);
  const [newFreq, setNewFreq] = useState<DraftFreq>({ mode: "all", days: [] });
  /** Rascunho local: permite abrir “Dias da semana” antes de marcar algum dia. */
  const [freqDrafts, setFreqDrafts] = useState<Record<string, DraftFreq>>({});
  const [minutesDraft, setMinutesDraft] = useState<Record<string, string>>({});
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
        Com tempo (ciclo e timer) ou Livre (só nome e anotações). Em Só hoje:
        1 matéria = anotações; 2+ no mesmo dia = mini-ciclo entre elas.
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
            study_minutes: parseMinutes(newMinutes, 25),
            is_free: newIsFree,
          });
          setName("");
          setNewMinutes("25");
          setNewIsFree(false);
          setNewFreq({ mode: "all", days: [] });
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            className="input"
            placeholder="Nova matéria"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {!newIsFree && (
            <label className="flex shrink-0 items-center gap-2 text-sm">
              <span className="opacity-60">Min</span>
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
            </label>
          )}
          <button type="submit" className="btn btn-primary whitespace-nowrap">
            Adicionar
          </button>
        </div>
        <div className="inline-flex items-center gap-0.5 rounded-full border border-[var(--line)] bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] p-0.5">
          <button
            type="button"
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
              !newIsFree
                ? "bg-[var(--signal)] text-white"
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
                ? "bg-[var(--signal)] text-white"
                : "text-[color-mix(in_srgb,var(--ink)_55%,transparent)] hover:text-[var(--ink)]"
            }`}
            onClick={() => setNewIsFree(true)}
          >
            Livre
          </button>
        </div>
        <StudyDaysPicker value={newFreq} onChange={setNewFreq} />
      </form>

      <ul className="mt-6 space-y-4">
        {subjects.map((s) => {
          const freq = freqForSubject(s);
          const free = Boolean(s.is_free);
          return (
            <li
              key={s.id}
              className={`surface p-4 ${free ? freeRowClass() : statusRowClass(s.status)}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <input
                  className="input max-w-xs font-medium"
                  value={s.name}
                  onChange={(e) => upsertSubject({ ...s, name: e.target.value })}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-0.5 rounded-full border border-[var(--line)] bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] p-0.5">
                    <button
                      type="button"
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                        !free
                          ? "bg-[var(--signal)] text-white"
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
                          ? "bg-[var(--signal)] text-white"
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
                  {!free && (
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
                  )}
                </div>
              </div>
              <div className="mt-3">
                <SubjectIconPicker
                  name={s.name}
                  value={s.icon}
                  onChange={(icon) => upsertSubject({ ...s, icon })}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-end gap-4">
                {!free && (
                  <div>
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wider opacity-50">
                      Tempo de estudo
                    </p>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        className="input w-20 py-2 text-center font-mono-num"
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
                      <span className="opacity-55">min</span>
                    </label>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wider opacity-50">
                    Frequência
                  </p>
                  <StudyDaysPicker
                    value={freq}
                    onChange={(next) => updateStudyDays(s, next)}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wider opacity-50">
                    Só hoje
                  </p>
                  <p className="mb-1.5 text-[11px] leading-snug opacity-50">
                    Nestes dias só as matérias marcadas aparecem. 1 = anotações;
                    2+ = mini-ciclo (ciclo normal intacto).
                  </p>
                  <ExclusiveDaysPicker
                    value={normalizeExclusiveDays(s.exclusive_days) ?? []}
                    onChange={(days) =>
                      upsertSubject({ ...s, exclusive_days: days })
                    }
                  />
                </div>
              </div>
              {!free && (
                <div className="mt-3">
                  <RotationEditor
                    subject={s}
                    onSave={(rotation) => upsertSubject({ ...s, rotation })}
                  />
                </div>
              )}
              {!normalizeRotation(s.rotation) && (
                <textarea
                  className="input mt-3 min-h-20"
                  placeholder="Anotações"
                  value={s.notes}
                  onChange={(e) =>
                    upsertSubject({ ...s, notes: e.target.value })
                  }
                />
              )}
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
