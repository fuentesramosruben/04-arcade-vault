// Validación compartida por el cliente (/auth) y las Server Actions (app/auth/actions.ts).
// Devuelven el mensaje de error en español, o null si el valor es válido.
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 12;
export const PASSWORD_MIN = 8;
export const EMAIL_MAX = 120;
const USERNAME_RE = /^[A-Z0-9_-]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Forma canónica del nombre arcade: la misma que exige `profiles.username`. */
export function normalizeUsername(value: string): string {
  return value.trim().toUpperCase();
}
export function validateUsername(value: string): string | null {
  const username = normalizeUsername(value);
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    return `El usuario debe tener entre ${USERNAME_MIN} y ${USERNAME_MAX} caracteres.`;
  }
  if (!USERNAME_RE.test(username)) {
    return "El usuario solo admite letras, números, guion y guion bajo.";
  }
  return null;
}
export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (email.length === 0 || email.length > EMAIL_MAX || !EMAIL_RE.test(email)) {
    return "Introduce un correo válido.";
  }
  return null;
}
export function validatePassword(value: string): string | null {
  if (value.length < PASSWORD_MIN) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`;
  }
  return null;
}
