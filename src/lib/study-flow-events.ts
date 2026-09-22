/** Evento quando uma matéria com tempo chega a 00:00 e vira Concluída. */
export const SUBJECT_COMPLETE_EVENT = "foco-subject-complete";

export function emitSubjectComplete(subjectId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(SUBJECT_COMPLETE_EVENT, { detail: { subjectId } }),
  );
}

/** Evento quando uma volta inteira do ciclo de hoje é concluída. */
export const CYCLE_COMPLETE_EVENT = "foco-cycle-complete";

export function emitCycleComplete(round: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(CYCLE_COMPLETE_EVENT, { detail: { round } }),
  );
}
