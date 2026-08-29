/** Política para senhas novas (convite, troca, redefinição). */
export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 72;

export function isValidNewPassword(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= MIN_PASSWORD_LENGTH &&
    value.length <= MAX_PASSWORD_LENGTH
  );
}

export function newPasswordHint(): string {
  return `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
}
