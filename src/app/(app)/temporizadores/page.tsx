"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Volume2 } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { BackToHoje } from "@/components/BackToHoje";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  ALARM_TONES,
  loadAlarmPrefs,
  previewAlarmTone,
  saveAlarmPrefs,
  type AlarmPrefs,
  type AlarmToneId,
} from "@/lib/audio";
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
  const [alarm, setAlarm] = useState<AlarmPrefs>({ volume: 0.7, tone: "acorde" });

  useEffect(() => {
    setAlarm(loadAlarmPrefs());
  }, []);

  function updateAlarm(next: AlarmPrefs) {
    setAlarm(next);
    saveAlarmPrefs(next);
  }

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

      <BackToHoje always />
      <h1 className="font-display pb-0.5 text-2xl font-semibold leading-normal tracking-tight md:text-3xl">
        Temporizadores
      </h1>
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

      <section className="surface mt-4 p-4 md:p-5">
        <h2 className="font-display text-base font-semibold tracking-tight md:text-lg">
          Alarme
        </h2>
        <p className="mt-1 text-xs opacity-55">
          Vale para temporizadores e lembretes com sino neste aparelho.
        </p>

        <label className="mt-4 flex items-center gap-3">
          <Volume2 size={18} strokeWidth={1.75} className="shrink-0 opacity-60" />
          <span className="w-16 shrink-0 text-sm opacity-70">Volume</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(alarm.volume * 100)}
            className="w-full accent-[var(--signal)]"
            onChange={(e) =>
              updateAlarm({
                ...alarm,
                volume: Number(e.target.value) / 100,
              })
            }
          />
          <span className="font-mono-num w-10 shrink-0 text-right text-sm opacity-60">
            {Math.round(alarm.volume * 100)}%
          </span>
        </label>

        <p className="mt-4 text-sm font-medium opacity-70">Toque</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {ALARM_TONES.map(({ id, label }) => {
            const active = alarm.tone === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => updateAlarm({ ...alarm, tone: id as AlarmToneId })}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-[var(--signal-soft)] text-[var(--signal)] ring-1 ring-[color-mix(in_srgb,var(--signal)_40%,transparent)]"
                    : "bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] text-[color-mix(in_srgb,var(--ink)_55%,transparent)] hover:text-[var(--ink)]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="btn mt-4"
          onClick={() => previewAlarmTone(alarm.tone, alarm.volume)}
        >
          Ouvir
        </button>
      </section>
    </div>
  );
}
