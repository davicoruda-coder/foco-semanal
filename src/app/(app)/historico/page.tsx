"use client";

import { useMemo } from "react";
import { useApp } from "@/components/AppProvider";

export default function HistoricoPage() {
  const { data } = useApp();

  const bySubject = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of data.study_sessions.filter((x) => x.completed)) {
      map.set(s.subject_name, (map.get(s.subject_name) ?? 0) + s.duration_minutes);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [data.study_sessions]);

  const sessions = [...data.study_sessions].sort(
    (a, b) => +new Date(b.started_at) - +new Date(a.started_at),
  );

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-4xl font-semibold">Histórico</h1>
      <p className="mt-2 opacity-65">Tempo de foco por matéria e sessões recentes.</p>

      <section className="surface mt-8 p-5">
        <h2 className="font-display text-xl font-semibold">Totais</h2>
        {bySubject.length === 0 ? (
          <p className="mt-3 text-sm opacity-70">Ainda sem sessões concluídas.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {bySubject.map(([name, mins]) => (
              <li key={name} className="flex justify-between gap-3 text-sm">
                <span className="font-medium">{name}</span>
                <span className="font-mono-num opacity-70">{mins} min</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ul className="mt-6 space-y-3">
        {sessions.map((s) => (
          <li key={s.id} className="surface flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
            <div>
              <p className="font-medium">{s.subject_name}</p>
              <p className="opacity-60">
                {new Date(s.started_at).toLocaleString("pt-BR")} · {s.mode} ·{" "}
                {s.completed ? "concluída" : "parcial"}
              </p>
            </div>
            <span className="font-mono-num">{s.duration_minutes} min</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
