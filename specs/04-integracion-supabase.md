# SPEC 04 — Integración base de Supabase

> **Status:** Implementado
> **Depends on:** SPEC 03
> **Date:** 2026-10-14
> **Objective:** Conectar la app Next.js al proyecto de Supabase existente (`rvdlyinimpdntwggwrew`) con clientes de navegador y de servidor tipados, variables de entorno documentadas y una conexión verificada, sin cambiar todavía ninguna pantalla.

---

## Por qué existe este spec

Hoy la sesión (`components/session-provider.tsx`) y las puntuaciones (`components/game-player.tsx`) viven en `localStorage`, y el salón y la actividad son datos mock. Todo lo que venga después (auth real, perfiles, puntuaciones, ranking) necesita primero una conexión a Supabase correcta y segura. Este spec deja esa base lista y aislada para que cada funcionalidad posterior tenga su propio spec.

El proyecto de Supabase ya existe y está vacío (sin tablas en `public`).

---

## Alcance

**Dentro:**

- Instalar `@supabase/supabase-js` y `@supabase/ssr`.
- Cliente de navegador: `lib/supabase/client.ts` (`createBrowserClient`).
- Cliente de servidor: `lib/supabase/server.ts` (`createServerClient` con `cookies()` de `next/headers`, compatible con Next 16 y `cacheComponents`).
- Tipos de base de datos: `lib/supabase/database.types.ts`, generados con el MCP de Supabase (`generate_typescript_types`) y usados como genérico `Database` en ambos clientes. El esquema está vacío, así que el tipo inicial es mínimo.
- Variables de entorno públicas `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, documentadas en `.env.example` y rellenadas en `.env.local` con los valores del proyecto.
- Error explícito y temprano si falta alguna variable de entorno.
- Verificación de conexión con una página temporal que se elimina antes del commit.
- Nota breve en `CLAUDE.md` sobre `lib/supabase/*` y las variables de entorno.

**Fuera de alcance (specs futuros):**

- Autenticación real (registro, login, logout, confirmación de correo) y reemplazo de `SessionProvider`. Preferencias ya expresadas para ese spec: correo + contraseña, modo invitado local sin migrar datos de `localStorage`, tabla `profiles` con `username` único creada por trigger.
- `proxy.ts` para refrescar la sesión en cookies (solo tiene sentido con auth).
- Tablas, migraciones (`supabase/migrations/`), políticas RLS y la tabla `profiles`.
- Guardar puntuaciones en Supabase, Salón de la Fama y "Actividad en vivo" con datos reales.
- OAuth (Google/GitHub): los botones de `/auth` siguen inertes.
- Realtime, Storage y Edge Functions.
- Supabase CLI y stack local de desarrollo.
- Clave `service_role` o cualquier cliente con privilegios elevados.
- Tests automatizados (no hay framework configurado).

---

## Modelo de datos

Esta feature no introduce tablas ni datos persistentes: el esquema `public` sigue vacío. Solo añade la configuración de los clientes.

```ts
// lib/supabase/client.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export function createClient(): SupabaseClient<Database>; // navegador

// lib/supabase/server.ts
export async function createClient(): Promise<SupabaseClient<Database>>; // servidor: await cookies()
```

Variables de entorno:

```
NEXT_PUBLIC_SUPABASE_URL=                 # https://rvdlyinimpdntwggwrew.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=     # clave publicable (sb_publishable_…); segura en el cliente solo con RLS activo
```

Convenciones:

- Solo existe la clave publicable en el cliente. `SUPABASE_DB_PW` (ya presente en `.env.local`) no la usa la app y nunca lleva prefijo `NEXT_PUBLIC_`.
- Ninguna tabla futura se crea sin RLS activado.
- Los clientes se crean por llamada, no como singleton de módulo en el servidor.

---

## Plan de implementación

Antes de cada paso se consulta la guía correspondiente en `node_modules/next/dist/docs/` (`environment-variables.md`, cookies y `cacheComponents`) y la documentación actual de `@supabase/ssr` con la herramienta `search_docs` del MCP de Supabase.

1. **Dependencias.** Instalar `@supabase/supabase-js` y `@supabase/ssr`. Verificación: `npm run lint` sin errores y `npm run build` sigue pasando.
2. **Entorno.** Añadir las dos variables a `.env.example` con comentarios (origen del valor, clave publicable, regla de no usar `NEXT_PUBLIC_` para secretos). Obtener URL y clave con `get_project_url` y `get_publishable_keys` y escribirlas en `.env.local`. Verificación: `.env.example` aparece en `git status` sin secretos y `.env.local` no.
3. **Tipos.** Generar `lib/supabase/database.types.ts` con `generate_typescript_types`. Verificación: `tsc` sin errores.
4. **Cliente de navegador.** Crear `lib/supabase/client.ts`; si falta alguna variable, lanza un error que nombra la variable. Verificación: `tsc` sin errores.
5. **Cliente de servidor.** Crear `lib/supabase/server.ts` con el adaptador de cookies de Next 16 (`await cookies()`), tolerando que `setAll` falle en Server Components. Mismo error explícito por variables ausentes. Verificación: `tsc` sin errores.
6. **Verificación de conexión (temporal).** Crear una página `app/supabase-check/page.tsx` que, dentro de `Suspense`, llama con el cliente de servidor a una consulta cualquiera sobre una tabla inexistente y muestra el código de error devuelto; además un componente cliente hace la misma llamada con el cliente de navegador. Un error de tabla inexistente (`PGRST205`) demuestra que la URL y la clave son válidas; un error de clave inválida o de red indica fallo de configuración. Verificación: ambos lados muestran `PGRST205`. Después **eliminar** la página.
7. **Documentación.** Añadir a `CLAUDE.md` una nota sobre `lib/supabase/client.ts`, `lib/supabase/server.ts`, `database.types.ts` y las variables de entorno. Verificación: `git diff` solo contiene los archivos de este spec.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `package.json` incluye `@supabase/supabase-js` y `@supabase/ssr`.
- [ ] Existen `lib/supabase/client.ts`, `lib/supabase/server.ts` y `lib/supabase/database.types.ts`.
- [ ] `.env.example` lista `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` sin valores, y está versionado.
- [ ] `.env.local` contiene ambas variables y no se versiona.
- [ ] Con una variable ausente, crear el cliente lanza un error que nombra esa variable.
- [ ] La verificación de conexión desde el servidor y desde el navegador devuelve `PGRST205` (tabla inexistente), no un error de clave ni de red.
- [ ] La página temporal `app/supabase-check` no existe en el commit final.
- [ ] Ni `service_role` ni `SUPABASE_DB_PW` aparecen en el código ni en el bundle del cliente.
- [ ] Ninguna pantalla existente cambia: `/`, `/juegos`, `/salon`, `/auth` y `/acerca` se comportan igual que antes.
- [ ] `SessionProvider` y el uso de `localStorage` siguen intactos.
- [ ] Recargar cualquier página no produce errores de hidratación ni errores en la consola.
- [ ] `CLAUDE.md` documenta los clientes de Supabase y las variables.

---

## Decisiones

- **Sí:** spec solo de integración base. Pedido explícito del usuario ("solo quiero la integración de Supabase"); auth, perfiles y puntuaciones tienen estado, esquema y RLS propios. **No:** incluir auth en este spec (se propuso y se descartó).
- **Sí:** `@supabase/ssr` con cookies. Es la vía soportada para App Router y deja la base lista para una sesión en servidor. **No:** `createClient` de `supabase-js` con `localStorage` (sin sesión en servidor y con parpadeo en hidratación).
- **Sí:** clave publicable (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). Es la clave moderna de Supabase y puede estar en el cliente si hay RLS. **No:** la clave `anon` heredada ni `service_role`.
- **Sí:** tipos generados con el MCP, aunque el esquema esté vacío, para que los clientes ya nazcan tipados. **No:** añadir los tipos más tarde con cambios en ambos clientes.
- **Sí:** fallar rápido si faltan variables. Es una configuración obligatoria y un fallo silencioso daría errores confusos. **No:** degradar a un estado de error en UI como en el formulario de contacto (SPEC 03), que tiene un fallback razonable.
- **Sí:** verificar la conexión con una consulta a una tabla inexistente. Con el esquema vacío no hay otra tabla que consultar, y `PGRST205` distingue una conexión válida de una clave inválida. **No:** crear una tabla de prueba (sería esquema sin spec).
- **Sí:** página de verificación temporal, borrada antes del commit. **No:** dejar una ruta de diagnóstico pública.
- **Sí:** no crear `proxy.ts` ni `supabase/migrations/` todavía. No hay sesión que refrescar ni esquema que versionar. **No:** añadirlos "por adelantado".
- **Sí:** dejar `SessionProvider` y `localStorage` intactos. El reemplazo es el trabajo del spec de auth. **No:** conectar la sesión mock a Supabase a medias.

---

## Riesgos

| Riesgo                                                                                  | Mitigación                                                                                                                                                |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next 16 con `cacheComponents`: leer `cookies()` es dinámico y falla fuera de `Suspense` | El cliente de servidor solo se usa dentro de límites dinámicos; la página de verificación lo prueba con `Suspense`; leer la guía de Next antes del paso 5 |
| `cookies()` es asíncrona en Next 16                                                     | `createClient` de servidor es `async` y hace `await cookies()`                                                                                            |
| `setAll` lanza al llamarse desde un Server Component                                    | Capturar el error en el adaptador de cookies (el refresco de sesión llegará con `proxy.ts` en el spec de auth)                                            |
| Filtración de credenciales (`SUPABASE_DB_PW`, `service_role`)                           | Solo la URL y la clave publicable llevan `NEXT_PUBLIC_`; `.env*` en `.gitignore`; criterio de aceptación sobre el bundle                                  |
| Clave publicable expuesta sin RLS en futuras tablas                                     | Convención: toda tabla nueva se crea con RLS activado; se exige en cada spec de esquema                                                                   |
| API de `@supabase/ssr` distinta a la que se conoce                                      | Consultar la documentación vigente con `search_docs` antes de escribir los clientes                                                                       |
| Apuntar por error a otro proyecto de Supabase                                           | La URL sale de `get_project_url` y debe coincidir con el `project_ref` de `.mcp.json`                                                                     |

---

## Qué **no** está en este spec

- Auth real, perfiles (`profiles`), OAuth y reemplazo de `SessionProvider`.
- Tablas, migraciones, RLS y `proxy.ts`.
- Puntuaciones, Salón de la Fama y actividad con datos reales.
- Realtime, Storage, Edge Functions y Supabase CLI local.
- Tests automatizados.

Cada uno de ellos, si se aborda, va en su propio spec.
