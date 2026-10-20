# SPEC 12 — Autenticación: registro, login y sesión con Supabase Auth

> **Status:** Aprobado
> **Depends on:** SPEC 01, SPEC 04, SPEC 06
> **Date:** 2026-10-20
> **Objective:** Sustituir el mock de `/auth` por registro, login (email + contraseña, Google y GitHub) y sesión real con Supabase Auth, con un perfil de nombre arcade único y un ranking que solo acepta puntuaciones de usuarios con sesión.

---

## Por qué existe este spec

Hoy `/auth` es un mock: `SessionProvider` guarda `{ name }` en `localStorage` (`av_user`), no verifica nada y cualquiera puede escribir cualquier nombre en `scores.player_name`. SPEC 06 dejó esa limitación como aceptada "hasta el spec de auth". Este es ese spec.

Tres puntos condicionan el diseño:

- **El ranking pasa a exigir identidad.** `scores` se inserta hoy con `anon` y nombre libre. Con cuentas, el nombre sale de un perfil único y el insert se cierra a `authenticated`. Es una decisión del usuario: el invitado sigue pudiendo jugar, pero no guarda puntuación.
- **Hace falta sesión en el servidor.** `@supabase/ssr` ya está instalado. La sesión va en cookies y se refresca en `proxy.ts`, que hoy solo protege `/salon/:id`; CLAUDE.md avisa de que solo se admite un `proxy.ts`, así que se fusiona.
- **El perfil nace en el registro.** Con confirmación de correo no hay sesión tras `signUp`, así que el cliente no puede insertar el perfil. Lo crea un trigger en la base de datos a partir del nombre pasado en los metadatos.

Son decisiones del usuario: email + contraseña **y** OAuth (Google, GitHub), confirmación de correo obligatoria, nombre arcade obligatorio en el registro, `/auth` con pestañas, y la recuperación de contraseña fuera de este spec.

---

## Alcance

**Dentro:**

- **Registro** en la pestaña CREAR CUENTA de `/auth`: usuario (nombre arcade 3–12, único), correo y contraseña (mínimo 8 caracteres). Tras enviar, aviso "revisa tu correo" sin iniciar sesión.
- **Login** en la pestaña INICIAR SESIÓN con correo y contraseña. Errores visibles y genéricos (no revelan si el correo existe).
- **OAuth** con Google y GitHub (botones ya dibujados en `/auth`). Si la cuenta nueva no tiene perfil, se redirige a `/auth/nombre` para elegir el nombre arcade.
- **Confirmación de correo** y retorno de OAuth en `GET /auth/callback` (intercambio del `code` por sesión con `exchangeCodeForSession`, redirección a `/`).
- **Sesión real**: cookies con `@supabase/ssr`, refresco en `proxy.ts` (fusionado con la comprobación de `/salon/:id`), `SessionProvider` alimentado por `supabase.auth` y cierre de sesión real desde la nav.
- **Perfil**: tabla `profiles` con nombre arcade único, creada por trigger en el registro por correo y por inserción desde `/auth/nombre` en OAuth.
- **Ranking autenticado**: `scores.user_id`; el insert exige sesión, `user_id = auth.uid()` y que `player_name` coincida con el nombre del perfil. `GamePlayer` usa el nombre del perfil y desaparece el campo de nombre libre.
- **Invitado**: sigue pudiendo jugar los juegos con motor; al terminar, el modal le propone entrar o registrarse en lugar de guardar.
- **Eliminación del mock**: se borra `av_user` y la función `login(user)` del `SessionProvider`.
- Variables y configuración de Supabase documentadas (URL de redirección, proveedores, plantilla de correo).
- Nota breve en `CLAUDE.md`.

**Fuera de alcance (specs futuros):**

- Recuperación y cambio de contraseña ("¿olvidaste tu contraseña?").
- Página de perfil, edición del nombre arcade, avatar y borrado de cuenta.
- Magic link, teléfono/SMS, MFA y otros proveedores OAuth.
- Rutas protegidas por rol o panel de administración.
- Migrar o reclamar las puntuaciones antiguas de invitados (siguen con `user_id` nulo).
- Persistencia de puntuaciones de los juegos sin motor (siguen en `localStorage`, `av_scores`).
- Límites de frecuencia (rate limiting) y antitrampas más allá de exigir sesión.
- Tests automatizados (no hay framework configurado).

---

## Modelo de datos

Migración nueva `supabase/migrations/<timestamp>_auth_profiles.sql`. Todas las tablas con RLS activado.

```sql
-- Perfil: una fila por usuario de auth.users
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  username   text not null unique
    check (char_length(username) between 3 and 12 and username = upper(btrim(username))),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
grant select on public.profiles to anon, authenticated;
grant insert on public.profiles to authenticated;

create policy "profiles_select_all" on public.profiles
  for select to anon, authenticated using (true);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = auth.uid());
-- sin UPDATE ni DELETE (el nombre no se cambia en este spec)

-- Trigger: crea el perfil en el registro por correo (raw_user_meta_data.username)
-- create function public.handle_new_user() ... security definer, set search_path = ''
-- create trigger on_auth_user_created after insert on auth.users ...

-- Scores: se liga a la cuenta
alter table public.scores add column user_id uuid references auth.users (id);
-- filas antiguas: user_id null (invitados anteriores a este spec)
create index scores_user_idx on public.scores (user_id);

-- El insert pasa a exigir sesión y nombre de perfil
drop policy "scores_insert_ranked_games" on public.scores;
revoke insert on public.scores from anon;
create policy "scores_insert_own_profile" on public.scores
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.games g where g.id = game_id and g.ranked)
    and player_name = (select p.username from public.profiles p where p.id = auth.uid())
  );
```

Tipos en cliente:

```ts
// components/session-provider.tsx
export interface SessionUser {
  id: string;
  email: string | null;
  name: string | null; // profiles.username; null si aún no eligió nombre (OAuth)
}

interface SessionContextValue {
  user: SessionUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}
```

Archivos:

```
supabase/migrations/<timestamp>_auth_profiles.sql  # profiles, trigger, user_id, RLS de scores
lib/supabase/database.types.ts                     # regenerado con el MCP
lib/auth/validation.ts                             # validación de usuario, correo y contraseña (compartida)
app/auth/page.tsx                                  # pestañas conectadas a Supabase Auth
app/auth/actions.ts                                # Server Actions: signUp, signIn, signOut, setUsername
app/auth/callback/route.ts                         # exchangeCodeForSession
app/auth/nombre/page.tsx                           # elegir nombre arcade tras OAuth
components/session-provider.tsx                    # usuario real, sin av_user
components/nav.tsx                                 # logout real, nombre del perfil
components/game-player.tsx                         # nombre del perfil, modal para invitado
proxy.ts                                           # refresco de sesión + 404 de /salon/:id
CLAUDE.md                                          # nota breve
```

Convenciones:

- `profiles.username` en mayúsculas, 3–12 caracteres, igual que `scores.player_name` (SPEC 06).
- La unicidad es sobre el nombre en mayúsculas, así que `Kai` y `KAI` son el mismo nombre.
- Contraseña: mínimo 8 caracteres, validada en cliente y en la Server Action; Supabase aplica además su propia política.
- `SUPABASE_DB_PW` y `service_role` nunca van al cliente ni a este spec; no hace falta ninguna clave nueva (solo `NEXT_PUBLIC_*` existentes).

---

## Plan de implementación

1. **Migración y tipos.** Aplicar `auth_profiles` (tabla `profiles`, trigger, `scores.user_id`, RLS nueva) con el MCP `supabase`, guardar el `.sql` en `supabase/migrations/`, regenerar `database.types.ts` y ejecutar `get_advisors`. La app sigue funcionando salvo el guardado de puntuaciones, que se retoma en el paso 7: el mismo PR no se fusiona sin completarlo.
2. **Validación compartida.** Crear `lib/auth/validation.ts` (usuario 3–12 con caracteres permitidos, correo, contraseña ≥ 8) y sus mensajes en español.
3. **Proxy.** Fusionar en `proxy.ts` el refresco de sesión de `@supabase/ssr` (cliente de servidor con cookies de la petición/respuesta) con el 404 de `/salon/:id`; ampliar el `matcher` para excluir estáticos. Comprobar que `/salon/<id inexistente>` sigue devolviendo 404.
4. **Server Actions.** `app/auth/actions.ts`: `signUp` (pasa `username` en `options.data` y `emailRedirectTo`), `signIn`, `signOut` y `setUsername`; comprueba disponibilidad del nombre antes de registrar y traduce el error de unicidad; devuelve estado con valores para no perder lo escrito (patrón de `sendContact`).
5. **Callback.** `app/auth/callback/route.ts`: `exchangeCodeForSession`, redirige a `/` (o a `/auth/nombre` si no hay perfil) y a `/auth?error=...` si falla.
6. **Pantalla `/auth`.** Conectar las dos pestañas a las acciones, añadir el campo Usuario al registro, estados de carga, error y "revisa tu correo", y los botones Google/GitHub con `signInWithOAuth`. Crear `/auth/nombre`. Diseño con `/frontend-design`, manteniendo la estética actual. Botón JUGAR COMO INVITADO sin cambios.
7. **Sesión en la app.** Reescribir `SessionProvider` con `onAuthStateChange` y lectura del perfil; sin `av_user`. `nav.tsx` muestra el nombre del perfil y cierra sesión de verdad. `GamePlayer` usa el nombre del perfil, envía `user_id` en el insert y muestra al invitado el aviso de entrar o registrarse en el modal de fin de partida.
8. **Configuración y documentación.** Documentar en `.env.example` y en la nota de `CLAUDE.md` las URL de redirección, los proveedores y la confirmación de correo; actualizar la descripción del estado actual y la regla de `scores`.

---

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] Registrarse con usuario, correo y contraseña válidos crea la cuenta, muestra "revisa tu correo" y no inicia sesión.
- [ ] Tras abrir el enlace del correo, `/auth/callback` inicia sesión y redirige a `/`.
- [ ] Antes de confirmar el correo, el login con esa cuenta falla con un mensaje claro.
- [ ] El registro rechaza un usuario de menos de 3 o más de 12 caracteres, un correo inválido y una contraseña de menos de 8.
- [ ] Registrar un nombre ya usado (también en otra capitalización) muestra el error y conserva lo escrito.
- [ ] El login con credenciales erróneas muestra un error genérico, sin indicar si el correo existe.
- [ ] Entrar con Google o GitHub por primera vez lleva a `/auth/nombre`; al elegir un nombre válido y libre se crea el perfil y se redirige a `/`.
- [ ] Un usuario con sesión ve su nombre arcade en la nav; recargar la página mantiene la sesión.
- [ ] "Cerrar sesión" elimina la sesión: la nav vuelve a mostrar ENTRAR y recargar no la restaura.
- [ ] `localStorage` ya no contiene ni usa `av_user`.
- [ ] Un usuario con sesión guarda una puntuación en un juego con motor y aparece en `/salon/<id>` con su nombre de perfil.
- [ ] Un invitado juega hasta el fin de partida y ve el aviso de entrar o registrarse; no hay campo para guardar una puntuación.
- [ ] Un `insert` en `scores` con rol `anon` es rechazado por la base de datos.
- [ ] Un `insert` con sesión pero `player_name` distinto del perfil, o con `user_id` ajeno, es rechazado por RLS.
- [ ] `profiles` y `scores` tienen RLS activado y `get_advisors` no reporta avisos de seguridad nuevos por este cambio.
- [ ] `/salon/<id inexistente>` sigue respondiendo 404 y `/salon` y `/salon/<id válido>` siguen cargando.
- [ ] El formulario de `/auth` no tiene scroll horizontal a 360, 390 y 430 px.

---

## Decisiones

- **Sí:** Supabase Auth con email + contraseña, Google y GitHub. Decisión del usuario; el formulario y los botones ya existen en el mock.
- **No:** magic link y teléfono. Cambian el formulario actual y dependen de canales externos.
- **Sí:** confirmación de correo obligatoria. Evita cuentas con correos ajenos que ocuparían nombres del ranking.
- **Sí:** tabla `profiles` con `username` único y trigger en el registro. Sin sesión tras `signUp` el cliente no puede insertar el perfil.
- **Sí:** `scores.user_id` y RLS que exige que `player_name` sea el nombre del perfil. Es la antitrampa mínima prometida en SPEC 06.
- **No:** reclamar o reasignar las puntuaciones antiguas. Son de nombres libres sin identidad; se quedan con `user_id` nulo.
- **Sí:** invitado sin guardar puntuación. Decisión del usuario; empuja al registro y deja de aceptar escrituras anónimas.
- **No:** mantener un nombre libre para invitados en `scores`. Contradice el objetivo de identidad del ranking.
- **Sí:** nombre arcade obligatorio en el registro; con OAuth, paso intermedio `/auth/nombre`.
- **No:** nombre autogenerado y editable. Obliga a una página de perfil que queda fuera.
- **Sí:** `/auth` con pestañas, más `/auth/callback` y `/auth/nombre`. Conserva el diseño y los enlaces existentes.
- **No:** `/login` y `/registro` separados. Rompe el diseño actual sin aportar funcionalidad.
- **Sí:** cookies con `@supabase/ssr` y refresco en `proxy.ts` fusionado. El servidor conoce al usuario, y CLAUDE.md exige un único `proxy.ts`.
- **No:** sesión solo en cliente. El servidor no vería al usuario y no habría lecturas ni rutas condicionadas por sesión.
- **No:** recuperación de contraseña en este spec. Decisión del usuario; spec futuro.

---

## Riesgos

| Riesgo                                                                                       | Mitigación                                                                                                                                   |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Un nuevo usuario toma el nombre de un invitado antiguo con puntuaciones                      | Limitación aceptada: las filas antiguas tienen `user_id` nulo y no se reasignan; el ranking las sigue agrupando por nombre.                  |
| Configuración manual en Supabase (proveedores, URL de redirección, confirmación de correo)   | Documentada en `.env.example` y `CLAUDE.md`; sin ella, OAuth y el enlace del correo fallan y `/auth?error=...` lo muestra.                   |
| El proxy fusionado rompe el 404 de `/salon/:id` o refresca la sesión en rutas estáticas      | Criterio de aceptación explícito del 404 y `matcher` que excluye estáticos; verificación manual antes de cerrar el paso 3.                   |
| Dos pestañas con sesiones distintas o sesión caducada durante una partida                    | `onAuthStateChange` actualiza el contexto; si el insert falla por RLS, `GamePlayer` muestra el error de guardado existente.                  |
| El trigger falla si el nombre ya existe y el registro devuelve un error genérico             | La Server Action comprueba la disponibilidad antes de `signUp` y traduce el error de unicidad; la condición de carrera queda como error.     |
| Pérdida de la sesión del mock actual (`av_user`) al desplegar                                | Esperada y aceptada: el mock no tenía valor real. Los usuarios deben registrarse; se ignora y se limpia la clave obsoleta si existe.         |
| Las cookies de sesión con `cacheComponents` obligan a leer el usuario dentro de `<Suspense>` | Leer el usuario solo en Client Components o en Server Components dentro de `<Suspense>`; consultar la doc de `node_modules/next/dist/docs/`. |

---

## Qué **no** está en este spec

- Recuperación o cambio de contraseña.
- Página de perfil, edición del nombre, avatar o borrado de cuenta.
- Magic link, SMS, MFA y otros proveedores OAuth.
- Roles, administración y rutas protegidas.
- Reclamar las puntuaciones antiguas de invitados.
- Persistencia en Supabase de los juegos sin motor.
- Rate limiting y antitrampas más allá de exigir sesión.

Cada uno, si llega, va en su propio spec.
