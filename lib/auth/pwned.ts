// Solo servidor. Comprobación de contraseñas filtradas con la API de rangos de
// HaveIBeenPwned (k-anonymity): solo sale el prefijo de 5 caracteres del SHA-1.
import { createHash } from "node:crypto";
const HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range/";
const HIBP_TIMEOUT_MS = 3000;
/** true si la contraseña aparece en filtraciones; false si no o si el servicio no responde. */
export async function isPasswordPwned(password: string): Promise<boolean> {
  try {
    const hash = createHash("sha1")
      .update(password)
      .digest("hex")
      .toUpperCase();
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);
    const response = await fetch(`${HIBP_RANGE_URL}${prefix}`, {
      headers: { "Add-Padding": "true" },
      cache: "no-store",
      signal: AbortSignal.timeout(HIBP_TIMEOUT_MS),
    });
    if (!response.ok) return false;
    const body = await response.text();
    // Cada línea es "SUFIJO:CONTEO"; con Add-Padding las de relleno tienen conteo 0.
    return body.split("\n").some((line) => {
      const [lineSuffix, count] = line.trim().split(":");
      return lineSuffix === suffix && Number(count) > 0;
    });
  } catch {
    return false;
  }
}
