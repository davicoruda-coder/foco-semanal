/**
 * Senha pedida antes de ações destrutivas no app (reset de histórico, apagar nuvem).
 * É só uma trava na interface — não substitui autenticação da conta.
 */
export const DESTRUCTIVE_ACTION_PASSWORD = "91565683";

/** Pede a senha; retorna true só se bater. Cancelar = false. */
export function promptDestructivePassword(actionLabel: string): boolean {
  const typed = window.prompt(
    `Para ${actionLabel}, digite a senha de autorização:`,
  );
  if (typed == null) return false;
  return typed === DESTRUCTIVE_ACTION_PASSWORD;
}
