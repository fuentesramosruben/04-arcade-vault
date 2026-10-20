# SPEC 13 — Medidas de seguridad básicas (checklist de seguridad)

> **Status:** Implementado
> **Depends on:** SPEC 04, SPEC 06, SPEC 12
> **Date:** 2026-10-20
> **Objective:** Cerrar los puntos de `references/security/security-checklist.md` (RLS, política de contraseñas, límite de registros, cabeceras de seguridad en Next.js y avisos del advisor de Supabase) y dejar cada uno verificado o, si depende del plan, documentado.

---

## Por qué existe este spec

SPEC 12 abrió la web a cuentas reales y, con ellas, a bots, contraseñas débiles y un navegador que ejecuta lo que le sirvamos. La checklist de `references/security/security-checklist.md` recoge los huecos básicos. Antes de escribir el spec se comprobó el estado real, y varios puntos ya están medio hechos:

- **RLS:** `games`, `scores` y `profiles` ya tienen RLS activado (comprobado con `list_tables`). El punto de la checklist ya se cumple; el spec lo convierte en un criterio verificable para que no se pierda.
- **Política de contraseña:** la app solo valida 8 caracteres (`PASSWORD_MIN` en `lib/auth/validation.ts`, cliente y Server Action). El usuario ya configuró en el servidor de Supabase Auth (Dashboard) el mínimo de 8 y la exigencia de minúsculas, mayúsculas, dígitos y símbolos. Hay un desajuste: una contraseña como `abcdefgh` pasa la validación de la app y Supabase la rechaza con un error genérico. El spec alinea `validatePassword` con el servidor y lo deja documentado y comprobable.
- **Advisor de Supabase:** hay 3 avisos `WARN`. Dos son la función `public.rls_auto_enable()` (`SECURITY DEFINER`, función del event trigger `ensure_rls`, que activa RLS en tablas nuevas) con `EXECUTE` para `PUBLIC`, `anon` y `authenticated`, es decir, invocable desde `/rest/v1/rpc/rls_auto_enable`. El tercero es la protección de contraseñas filtradas, desactivada.
- **Contraseñas filtradas:** esa protección de Supabase es de pago (plan Pro). El usuario está en plan Free, así que no se puede activar. Decisión del usuario: dejarla documentada y bloqueada por el plan, con una mitigación propia en la Server Action.

Decisiones del usuario: cabeceras de la checklist más extras **sin CSP**, límite de registros desde la configuración de Supabase Auth (sin CAPTCHA ni limitador propio) y plan Free con la protección de filtradas documentada.

---

## Alcance

**Dentro:**

- **RLS (verificación):** comprobar que `games`, `scores` y `profiles` siguen con RLS activado; no hay cambios de esquema.
- **Avisos `anon_security_definer_function_executable` y `authenticated_security_definer_function_executable`:** migración que revoca `EXECUTE` de `public.rls_auto_enable()` a `PUBLIC`, `anon` y `authenticated`. El event trigger `ensure_rls` sigue funcionando porque Postgres no comprueba `EXECUTE` al dispararlo.
- **Cabeceras de seguridad** en `next.config.ts` para todas las rutas: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()` y `Strict-Transport-Security: max-age=31536000`.
- **Política de contraseña en el servidor de Supabase Auth** (Dashboard → Authentication → Sign In / Providers → Email), ya configurada por el usuario: mínimo 8 caracteres y obligatorios minúsculas, mayúsculas, dígitos y símbolos. Se verifica con peticiones directas a la API de Auth.
- **Validación de contraseña alineada** en `lib/auth/validation.ts`: `validatePassword` exige además minúscula, mayúscula, dígito y símbolo, con mensajes en español, para que cliente y Server Action rechacen lo mismo que Supabase antes de llamarle.
- **Límite de registros por IP** con la configuración de rate limits de Supabase Auth (Dashboard → Authentication → Rate Limits): 10 registros e inicios de sesión por IP cada 5 minutos.
- **Contraseñas filtradas (plan Free):** documentar que la protección nativa no está disponible y añadir una comprobación propia contra la API de rangos de HaveIBeenPwned (k-anonymity) en la Server Action `signUp`, que falla en abierto si el servicio no responde.
- Documentar en `.env.example` y en `CLAUDE.md` la configuración manual del Dashboard, y marcar la checklist.
- Protección de rutas con Proxy Next.js - informacion sobre proxy aqui:
https://nextjs.org/docs/app/getting-started/proxy

Ejemplo: proxy.ts
```ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This function can be marked `async` if using `await` inside
export function proxy(request: NextRequest) {
  return NextResponse.redirect(new URL('/home', request.url))
}

// Alternatively, you can use a default export:
// export default function proxy(request: NextRequest) { ... }

export const config = {
  matcher: '/about/:path*',
}
```

**Fuera de alcance (specs futuros):**

- `Content-Security-Policy`: con `cacheComponents`, Turbopack, `next/font/google` y Supabase puede romper la hidratación; merece su propio spec.
- CAPTCHA (Turnstile/hCaptcha) en registro y login.
- Limitador de frecuencia propio en Server Actions o en la base de datos (p. ej. al guardar puntuaciones).
- Activar la protección nativa de contraseñas filtradas (requiere plan Pro).
- Medidor de fortaleza o indicador visual de requisitos en el formulario de `/auth`.
- Recuperación de contraseña, MFA y confirmación de correo (ya decididos en SPEC 12 o fuera de él).
- Antitrampas de puntuación más allá de RLS (validación de partidas en servidor).
- `HSTS` con `includeSubDomains` o `preload`.
- Tests automatizados (no hay framework configurado).

---

## Modelo de datos

Sin tablas ni columnas nuevas: solo cambia un privilegio. Migración nueva `supabase/migrations/<timestamp>_revoke_rls_auto_enable_execute.sql`:

```sql
-- La función solo la ejecuta el event trigger ensure_rls; nadie la llama por RPC
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
```

Estructuras nuevas en código:

```ts
// lib/auth/validation.ts: se añaden a PASSWORD_MIN = 8
// Símbolos: el conjunto exacto que acepta Supabase Auth
const PASSWORD_SYMBOLS = "!@#$%^&*()_+-=[]{};':\"|<>?,./`~";
// validatePassword(value) sigue devolviendo string | null (mensaje en español)
```

```ts
// lib/auth/pwned.ts (solo servidor)
/** true si la contraseña aparece en filtraciones; false si no o si el servicio no responde. */
export async function isPasswordPwned(password: string): Promise<boolean>;
```

```ts
// next.config.ts
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
];
// headers: async () => [{ source: "/(.*)", headers: securityHeaders }]
```

Archivos:

```
supabase/migrations/<timestamp>_revoke_rls_auto_enable_execute.sql  # revoke de EXECUTE
next.config.ts                                                       # headers()
lib/auth/pwned.ts                                                    # comprobación HIBP (k-anonymity)
lib/auth/validation.ts                                               # validatePassword con composición
app/auth/actions.ts                                                  # signUp llama a isPasswordPwned
.env.example                                                         # nota de configuración del Dashboard
references/security/security-checklist.md                            # puntos marcados
CLAUDE.md                                                            # nota breve
```

Convenciones:

- `isPasswordPwned` envía a HIBP solo los 5 primeros caracteres del SHA-1 en mayúsculas (`https://api.pwnedpasswords.com/range/<prefijo>`, cabecera `Add-Padding: true`); la contraseña y el hash completo nunca salen del servidor. Tiempo máximo 3 s; cualquier error o tiempo agotado devuelve `false`.
- Mensaje al usuario: "Esa contraseña aparece en filtraciones conocidas. Elige otra." Se muestra como error del campo contraseña y conserva lo escrito (patrón de `ContactState.values`).
- La comprobación solo se aplica en `signUp`; el inicio de sesión no la usa. Lo mismo vale para la composición: `validatePassword` solo se usa en el registro, así que las cuentas existentes con contraseñas anteriores a esta política siguen pudiendo iniciar sesión.
- Mensaje de composición: "La contraseña necesita minúscula, mayúscula, número y símbolo." El orden de comprobación en `signUp` es: longitud, composición, HIBP.
- `HSTS` solo tiene efecto sobre HTTPS; en `localhost` por HTTP el navegador lo ignora.

---

## Plan de implementación

1. **Migración de privilegios.** Aplicar `revoke_rls_auto_enable_execute` con el MCP `supabase`, guardar el `.sql` en `supabase/migrations/` y ejecutar `get_advisors` (security): desaparecen los dos avisos `*_security_definer_function_executable`. Comprobar que `ensure_rls` sigue activando RLS creando y borrando una tabla de prueba dentro de una transacción con `rollback`.
2. **Cabeceras.** Añadir `securityHeaders` y `headers()` a `next.config.ts`. Con `npm run build && npm run start`, comprobar con `curl -I` en `/`, `/juegos`, `/salon` y `/auth` que llegan las 5 cabeceras, y que los estáticos (`/_next/static/...`) también las llevan.
3. **Validación de contraseña alineada.** Ampliar `validatePassword` en `lib/auth/validation.ts` con minúscula, mayúscula, dígito y símbolo. Comprobar en `/auth` (pestaña CREAR CUENTA) que `abcdefgh` y `Abcdefg1` se rechazan con mensaje claro y que `Abcdef1!` se acepta.
4. **Comprobación de contraseñas filtradas.** Crear `lib/auth/pwned.ts` y llamarla en la Server Action `signUp` tras `validatePassword`, antes de `supabase.auth.signUp`. Probar con una contraseña conocida filtrada que cumpla la política (`Password123!`) y con una aleatoria larga.
5. **Configuración del Dashboard.** Confirmar la política de contraseña (mínimo 8, minúsculas, mayúsculas, dígitos y símbolos) y fijar el límite de registros e inicios de sesión en 10 por IP cada 5 minutos. Verificar con peticiones a `POST /auth/v1/signup`: una contraseña de 7 caracteres y otra de 8 sin símbolo deben responder `422` con `weak_password`.
6. **Proteccion de rutas con Proxy Next.js**
7. **Documentación.** Anotar en `.env.example` y `CLAUDE.md` la configuración manual (política de contraseña, rate limits, protección de filtradas no disponible en Free y su mitigación) y la regla de cabeceras; marcar los puntos de `references/security/security-checklist.md`.

---

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `list_tables` muestra `rls_enabled: true` en `games`, `scores` y `profiles`.
- [ ] `get_advisors` (security) ya no reporta `anon_security_definer_function_executable` ni `authenticated_security_definer_function_executable`.
- [ ] El único aviso de seguridad que queda en `get_advisors` es `auth_leaked_password_protection`, aceptado y documentado como bloqueado por el plan Free.
- [ ] `has_function_privilege('anon', 'public.rls_auto_enable()', 'execute')` y el equivalente para `authenticated` devuelven `false`.
- [ ] Crear una tabla en `public` sin activar RLS manualmente la deja con RLS activado (el event trigger `ensure_rls` sigue funcionando).
- [ ] `curl -I` a `/`, `/juegos`, `/salon` y `/auth` devuelve `x-content-type-options: nosniff`, `x-frame-options: DENY`, `referrer-policy: strict-origin-when-cross-origin`, `permissions-policy` y `strict-transport-security: max-age=31536000`.
- [ ] La landing, `/juegos/<id>/jugar` y `/auth` cargan sin errores nuevos en consola con las cabeceras activas, y el sonido de Arkanoid sigue funcionando.
- [ ] `POST /auth/v1/signup` con una contraseña de 7 caracteres, y otra de 8 sin símbolo, responden `422` con `weak_password`.
- [ ] El formulario de registro rechaza, sin llamar a Supabase, contraseñas sin minúscula, sin mayúscula, sin dígito o sin símbolo, con un mensaje en español.
- [ ] Una contraseña como `Abcdef1!` pasa la validación de la app y Supabase la acepta.
- [ ] El inicio de sesión de una cuenta existente no aplica la política de composición.
- [ ] El Dashboard de Supabase tiene el límite de registros e inicios de sesión en 10 por IP cada 5 minutos.
- [ ] Registrarse con `Password123!` muestra "Esa contraseña aparece en filtraciones conocidas. Elige otra." y conserva usuario y correo.
- [ ] Si `api.pwnedpasswords.com` no responde en 3 s, el registro continúa sin error.
- [ ] La contraseña completa y su hash completo no aparecen en ninguna petición saliente: solo el prefijo de 5 caracteres.
- [ ] `.env.example` y `CLAUDE.md` describen la configuración manual del Dashboard, y la checklist tiene los puntos marcados.

---

## Decisiones

- **Sí:** cabeceras de la checklist más `Permissions-Policy` y `HSTS`. Aportan protección sin tocar scripts ni estilos; los juegos no usan cámara, micrófono ni geolocalización.
- **No:** `Content-Security-Policy` en este spec. Con `cacheComponents`, fuentes de Google y Supabase es fácil romper la hidratación; mejor un spec propio con pruebas.
- **No:** `HSTS` con `includeSubDomains` o `preload`. Son difíciles de revertir y no hay subdominios que proteger.
- **Sí:** `X-Frame-Options: DENY`. Ninguna página de la app está pensada para incrustarse.
- **Sí:** límite de registros desde el Dashboard de Supabase. Es nativo, por IP y sin código; decisión del usuario.
- **No:** CAPTCHA ni limitador propio. Más proveedores, claves y cambios en `/auth`; un limitador propio es frágil detrás de proxies.
- **Sí:** 10 registros e inicios de sesión por IP cada 5 minutos. Valor propuesto por este spec: cubre una familia o un aula tras la misma IP y frena a los bots (el valor por defecto de Supabase es 30); es ajustable en el Dashboard.
- **Sí:** contraseña mínima de 8 en el servidor, igual que en la app. Lo pide la checklist y ya está configurado por el usuario.
- **Sí:** exigir minúsculas, mayúsculas, dígitos y símbolos. Decisión del usuario, ya configurada en Supabase (la primera versión de este spec lo descartaba; se corrige).
- **Sí:** replicar esa política en `validatePassword`. Si no, la app acepta contraseñas que Supabase rechaza y el usuario recibe un error genérico en lugar de un mensaje claro.
- **No:** aplicar la composición al inicio de sesión. Bloquearía a cuentas anteriores a la política; el servidor solo la exige al fijar la contraseña.
- **No:** indicador de requisitos en el formulario. Es mejora de UI y va en otro spec; el mensaje de error basta por ahora.
- **Sí:** comprobación propia contra HIBP con k-anonymity en `signUp`. Sustituye parcialmente a la protección nativa, que requiere plan Pro.
- **Sí:** fallar en abierto si HIBP no responde. Un servicio externo caído no debe impedir registrarse.
- **No:** activar la protección nativa de contraseñas filtradas. No existe en el plan Free; queda documentada para cuando se pase a Pro (en ese momento se puede retirar `lib/auth/pwned.ts`).
- **Sí:** revocar `EXECUTE` de `rls_auto_enable()` en lugar de convertirla a `SECURITY INVOKER`. La función necesita privilegios para alterar tablas; solo hay que cerrar la puerta de RPC.
- **No:** mover la función a otro esquema. Es la tercera opción del linter, más invasiva y con riesgo sobre el event trigger.

---

## Riesgos

| Riesgo                                                                                             | Mitigación                                                                                                                                              |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Revocar `EXECUTE` rompe el event trigger `ensure_rls` y las tablas nuevas quedan sin RLS           | Postgres no comprueba `EXECUTE` al disparar un event trigger. Criterio de aceptación explícito: crear una tabla de prueba y comprobar que nace con RLS. |
| Una cabecera rompe algo (p. ej. `Permissions-Policy` o `X-Frame-Options` en algún flujo OAuth)     | OAuth redirige a la pestaña completa, sin iframes. Se prueba `/auth`, un juego con sonido y el callback antes de cerrar el paso 2.                      |
| El límite por IP bloquea a usuarios legítimos tras una IP compartida (aula, CGNAT)                 | 10 por 5 minutos es holgado para uso normal; si hay quejas se sube en el Dashboard sin tocar código.                                                    |
| HIBP caído, lento o con cambios de formato                                                         | Tiempo máximo de 3 s y fallo en abierto: el registro nunca depende del servicio. Se ignora cualquier respuesta no reconocida.                           |
| El conjunto de símbolos de la app difiere del de Supabase y se acepta algo que el servidor rechaza | `PASSWORD_SYMBOLS` copia el conjunto documentado de Supabase; si el servidor aun así rechaza, `signUp` muestra el error y conserva lo escrito.          |
| La contraseña se filtra al consultar HIBP                                                          | Solo se envían 5 caracteres del SHA-1; la comprobación es solo de servidor y nunca se registra en logs.                                                 |
| La configuración manual del Dashboard se pierde o no se aplica en otro proyecto de Supabase        | Documentada en `.env.example` y `CLAUDE.md`, con la verificación `weak_password` repetible.                                                             |
| Aviso `auth_leaked_password_protection` permanece en el advisor                                    | Aceptado y documentado como bloqueado por el plan Free; se revisa al pasar a Pro.                                                                       |

---

## Qué **no** está en este spec

- `Content-Security-Policy`.
- CAPTCHA o limitador de frecuencia propio.
- Activar la protección nativa de contraseñas filtradas (plan Pro).
- Indicador visual de requisitos o medidor de fortaleza de contraseña.
- Recuperación de contraseña y MFA.
- Antitrampas de puntuación más allá de RLS.
- Cambios de esquema en `games`, `scores` o `profiles`.

Cada uno, si llega, va en su propio spec.
