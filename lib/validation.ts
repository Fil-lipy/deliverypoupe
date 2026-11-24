// Regras de validação de e-mail e senha, compartilhadas entre as rotas de API.

export const PASSWORD_MIN = 8;

/** Valida o formato básico de um e-mail. */
export function isValidEmail(email: string): boolean {
  const e = String(email ?? '').trim();
  if (e.length < 3 || e.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

/**
 * Valida a força da senha. Retorna uma mensagem de erro (string) ou null se válida.
 * Requisitos: mínimo de 8 caracteres, contendo letras e números.
 */
export function validatePassword(pw: string): string | null {
  const p = String(pw ?? '');
  if (p.length < PASSWORD_MIN) return `A senha deve ter no mínimo ${PASSWORD_MIN} caracteres.`;
  if (!/[A-Za-z]/.test(p) || !/[0-9]/.test(p)) return 'A senha deve conter letras e números.';
  return null;
}
