/**
 * Senha pedida antes de ações destrutivas no app (reset de histórico, apagar nuvem).
 * É só uma trava na interface — não substitui autenticação da conta.
 */
export const DESTRUCTIVE_ACTION_PASSWORD = "91565683";

export type DestructivePromptResult = "ok" | "cancel" | "wrong";

/** Pede a senha. Cancelar = cancel; senha errada = wrong; certa = ok. */
export function promptDestructivePassword(
  actionLabel: string,
): DestructivePromptResult {
  const typed = window.prompt(
    `Para ${actionLabel}, digite a senha de autorização:`,
  );
  if (typed == null) return "cancel";
  if (typed === DESTRUCTIVE_ACTION_PASSWORD) return "ok";
  return "wrong";
}
