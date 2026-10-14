# SPEC 06 — Leaderboard por juego, ranking global y tabla de juegos en Supabase

> **Status:** Aprobado
> **Depends on:** SPEC 01, SPEC 04, SPEC 05
> **Date:** 2026-10-14
> **Objective:** Crear las tablas `games` y `scores` en Supabase y reemplazar el Salón de la Fama mock por un ranking global (`/salon`) y un leaderboard por juego (`/salon/[id]`) alimentados por las partidas reales de los juegos con motor.

---

## Por qué existe este spec

Hoy el Salón de la Fama (`app/salon/page.tsx`) muestra datos inventados por `seededScores`, y `best` y `plays` del catálogo (`lib/games.ts`) son cifras escritas a mano. SPEC 04 dejó la conexión a Supabase lista con el esquema `public` vacío, y SPEC 05 entregó el primer juego real (`asteroides`) con el contrato `GameEngine`. Este spec es el primer uso real de la base de datos: convierte las partidas jugadas en puntuaciones compartidas.

Todavía no hay autenticación (spec futuro), así que el jugador se identifica solo por el nombre que escribe en el modal de fin de partida. Es una limitación aceptada y documentada, no un descuido.

---

## Alcance

**Dentro:**

- Migración que crea las tablas `games` y `scores` con RLS activado, y las vistas `game_stats` y `global_leaderboard`. Se aplica con el MCP de Supabase (`apply_migration`) y se guarda versionada en `supabase/migrations/`.
- Datos iniciales de `games`: las 9 entradas actuales de `lib/games.ts` (`id`, `title`, `cat`), con `ranked = true` solo para `asteroides`.
- Tabla `scores` sin datos iniciales: el ranking arranca vacío, sin seed.
- Inserción anónima de puntuaciones desde el navegador, validada por RLS y `CHECK` (solo juegos con `ranked = true`).
- `GamePlayer`: si `game.id in ENGINES`, `GUARDAR PUNTUACIÓN` inserta en `scores` con el cliente de navegador, gestiona el error con reintento y, al guardar, enlaza a `/salon/<id>`. Los juegos sin motor siguen con `localStorage["av_scores"]`.
- `/salon` pasa a ser el **ranking global**: podio y tabla de los mejores jugadores, con la suma de la mejor marca de cada jugador en cada juego con ranking.
- Ruta nueva `/salon/[id]`: **leaderboard del juego** (podio + tabla de las mejores partidas). `[id]` solo acepta ids de juegos con ranking; cualquier otro responde 404.
- Pestañas de navegación del salón: `GLOBAL` + una por juego con ranking, como enlaces a rutas (no estado local).
- `best` y `plays` de las tarjetas (`components/game-card.tsx`) y de la ficha (`app/juegos/[id]/page.tsx`) pasan a leerse de la vista `game_stats`; se eliminan de `lib/games.ts`.
- Estado vacío en cada tabla (`SIN PUNTUACIONES TODAVÍA`) y estado de error de carga.
- Helper de lectura en `lib/supabase/queries.ts` y tipos regenerados en `lib/supabase/database.types.ts`.
- Nota breve en `CLAUDE.md` sobre `games`, `scores`, las vistas y `queries.ts`.

**Fuera de alcance (specs futuros):**

- Autenticación real, `profiles` y asociar puntuaciones a un usuario (`user_id`). Mientras tanto, el nombre es texto libre y no garantiza identidad.
- Evitar trampas o spam (validación en servidor de la partida, límite de frecuencia, captcha). Solo hay `CHECK` de rango.
- Moderación o borrado de nombres ofensivos.
- Guardar en Supabase las puntuaciones de los juegos sin motor (siguen en `localStorage` con el mock).
- Mover `cover`, `color`, `short` y `long` a la tabla `games`: siguen en `lib/games.ts`.
- Realtime (ranking en vivo) y paginación: los rankings muestran el Top 50 y se leen al cargar la página.
- "Actividad en vivo" y el resto de datos mock de la home (`lib/home.ts`).
- Filtros por periodo (semanal, mensual).
- Migrar a Supabase las entradas ya guardadas en `localStorage["av_scores"]`.
- Tests automatizados (no hay framework configurado).

---

## Modelo de datos

```sql
-- Catálogo (id = slug de lib/games.ts)
create table public.games (
  id         text primary key,
  title      text not null,
  cat        text not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  ranked     boolean not null default false,  -- true = el juego tiene motor y guarda en scores
  sort_order integer not null
);

-- Una fila por partida guardada
create table public.scores (
  id          uuid primary key default gen_random_uuid(),
  game_id     text not null references public.games (id),
  player_name text not null
    check (char_length(player_name) between 3 and 12 and player_name = upper(btrim(player_name))),
  score       integer not null check (score between 1 and 10000000),
  created_at  timestamptz not null default now()
);
create index scores_game_score_idx on public.scores (game_id, score desc, created_at);
create index scores_player_idx on public.scores (player_name);

alter table public.games  enable row level security;
alter table public.scores enable row level security;
```

Políticas RLS:

```
games:  SELECT  anon, authenticated  using (true)
scores: SELECT  anon, authenticated  using (true)
scores: INSERT  anon, authenticated  with check (
          exists (select 1 from games g where g.id = game_id and g.ranked))
sin UPDATE ni DELETE para ningún rol
games:  sin INSERT/UPDATE/DELETE desde la API (el catálogo se cambia con migraciones)
```

Vistas (ambas con `security_invoker = true`, para que respeten el RLS de las tablas base):

```sql
-- best y plays por juego (los juegos sin partidas devuelven 0)
create view public.game_stats with (security_invoker = true) as
  select g.id as game_id,
         coalesce(max(s.score), 0) as best,
         count(s.id)               as plays
  from games g left join scores s on s.game_id = g.id
  group by g.id;

-- ranking global: suma de la mejor marca de cada jugador en cada juego con ranking
create view public.global_leaderboard with (security_invoker = true) as
  select player_name,
         sum(best)  as total_score,
         count(*)   as games_played,
         max(last_at) as last_at
  from (
    select player_name, game_id, max(score) as best, max(created_at) as last_at
    from scores group by player_name, game_id
  ) b
  group by player_name;
```

Tipos de la aplicación:

```ts
// lib/supabase/queries.ts — lecturas con el cliente de servidor
export interface LeaderboardRow {
  rank: number;
  name: string;
  score: number;
  date: string; // "DD/MM/YYYY", mismo formato que ScoreRow
}
export interface GlobalRow extends LeaderboardRow {
  gamesPlayed: number;
}
export interface GameStats {
  gameId: string;
  best: number;
  plays: number;
}

getGameLeaderboard(gameId: string): Promise<LeaderboardRow[]>; // Top 50, score desc, created_at asc
getGlobalLeaderboard(): Promise<GlobalRow[]>; // Top 50, total_score desc, last_at asc
getGameStats(): Promise<GameStats[]>;
```

`lib/games.ts` pierde los campos `best` y `plays` de `Game`; conserva `id`, `title`, `short`, `long`, `cat`, `cover` y `color`.

Convenciones:

- El cliente normaliza antes de insertar: `name.trim().toUpperCase().slice(0, 12)`; el `CHECK` lo exige también en la base de datos.
- Las fechas se formatean en el cliente/servidor como `DD/MM/YYYY` desde `created_at`.
- `ranked` en la base de datos y `id in ENGINES` en la UI describen lo mismo; la migración y el registro deben coincidir (hoy, solo `asteroides`).
- Toda tabla nueva lleva RLS activado (convención de SPEC 04).

---

## Plan de implementación

Antes de cada paso se consulta la guía relevante en `node_modules/next/dist/docs/` (`cacheComponents`, Suspense, rutas dinámicas con `generateStaticParams`, `notFound`) y la documentación vigente de RLS con `search_docs` del MCP de Supabase. La UI nueva (podio por juego, pestañas, estados vacío y error) se diseña con `/frontend-design`, partiendo de los estilos existentes `av-hall`, `podium` y `hall-table`.

1. **Migración.** Crear `supabase/migrations/<timestamp>_games_scores.sql` con tablas, índices, RLS, políticas, vistas y el `insert` de las 9 filas de `games`. Aplicarla con `apply_migration`. Verificación: `list_tables` muestra `games` y `scores` con RLS activo; `get_advisors` (security) sin avisos de RLS para ellas; una consulta con `execute_sql` confirma 9 filas en `games` y solo `asteroides` con `ranked`.
2. **Tipos.** Regenerar `lib/supabase/database.types.ts` con `generate_typescript_types`. Verificación: `tsc` sin errores.
3. **Lecturas.** Crear `lib/supabase/queries.ts` con `getGameLeaderboard`, `getGlobalLeaderboard` y `getGameStats` (cliente de servidor, formateo de fecha y rango). Verificación: `tsc` y `npm run lint` sin errores.
4. **Estadísticas reales en el catálogo.** Quitar `best` y `plays` de `Game` y de las 9 entradas de `lib/games.ts`; `app/juegos/page.tsx` y `app/juegos/[id]/page.tsx` leen `getGameStats()` dentro de `<Suspense>` y los pasan a `GameCard`/ficha (con un helper de formato compacto para `plays`). Verificación: `/juegos` y `/juegos/asteroides` muestran `0` y `0`; el build pasa.
5. **Guardado de puntuación.** En `GamePlayer`, para juegos con motor, `GUARDAR PUNTUACIÓN` normaliza el nombre y hace `insert` en `scores` con el cliente de navegador; bloquea el guardado con nombre de menos de 3 caracteres; muestra error con reintento si falla; al guardar, enlaza a `/salon/<id>`. Los juegos sin motor mantienen `saveScore` en `localStorage`. Verificación: una partida de `asteroides` crea una fila visible con `execute_sql`; `/juegos/caida/jugar` sigue guardando en `av_scores`.
6. **Componente de ranking.** Extraer de `app/salon/page.tsx` el podio y la tabla a un componente reutilizable (`components/leaderboard.tsx`) que recibe filas, un título y los estados vacío y de error, sin cambiar el aspecto actual. Añadir el componente de pestañas `components/salon-tabs.tsx` (enlaces a `/salon` y a `/salon/<id>` de los juegos con ranking, con el activo marcado). Verificación: `tsc` y `npm run lint` sin errores.
7. **Ranking global.** Reescribir `app/salon/page.tsx` como Server Component: `getGlobalLeaderboard()` dentro de `<Suspense>`, columna `JUEGOS` con `gamesPlayed`, y eliminar el bloque "TU MEJOR MARCA" y el uso de `seededScores`. Verificación: `/salon` muestra el estado vacío con la base vacía y una fila tras guardar una partida.
8. **Leaderboard por juego.** Crear `app/salon/[id]/page.tsx` con `generateStaticParams` limitado a juegos con ranking (`id in ENGINES`), `notFound()` para el resto, y `getGameLeaderboard(id)` dentro de `<Suspense>`. Verificación: `/salon/asteroides` lista las partidas por puntuación; `/salon/caida` responde 404.
9. **Enlaces.** Añadir el enlace "VER RANKING" a `/salon/<id>` en la ficha de los juegos con ranking y en el modal tras guardar; limpiar `seededScores` de `lib/scores.ts` si ya no tiene usos. Verificación: `rg seededScores` solo devuelve usos que sigan existiendo.
10. **Documentación.** Añadir a `CLAUDE.md` una nota sobre `games`, `scores`, las vistas, `lib/supabase/queries.ts` y el borrado de `best`/`plays` de `lib/games.ts`. Verificación: `git diff` solo contiene archivos de este spec.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `list_tables` muestra `games` y `scores` con RLS activado, y `get_advisors` (security) no reporta avisos de RLS desactivado para ellas ni para las vistas.
- [ ] `games` contiene 9 filas con los ids de `lib/games.ts` y solo `asteroides` tiene `ranked = true`.
- [ ] `supabase/migrations/` contiene la migración y coincide con lo aplicado en el proyecto.
- [ ] Con la clave publicable, un `insert` en `scores` para `asteroides` con nombre y puntuación válidos tiene éxito.
- [ ] Un `insert` para un juego con `ranked = false`, con un nombre de 2 o de 13 caracteres, con nombre en minúsculas, con `score = 0` o con `score = 10000001` es rechazado.
- [ ] Con la clave publicable, `update` y `delete` sobre `scores`, y cualquier escritura sobre `games`, son rechazados.
- [ ] `/salon` muestra `SIN PUNTUACIONES TODAVÍA` cuando `scores` está vacío; no aparece ninguna fila inventada.
- [ ] Tras terminar una partida de `asteroides` y pulsar `GUARDAR PUNTUACIÓN`, la fila aparece en `/salon/asteroides` y en `/salon` con el nombre en mayúsculas y la puntuación real.
- [ ] `/salon/asteroides` ordena de mayor a menor puntuación, desempata por fecha más antigua y muestra como máximo 50 filas.
- [ ] `/salon` suma la mejor marca de cada nombre por juego con ranking: dos partidas del mismo nombre en `asteroides` cuentan una sola vez (la mayor).
- [ ] `/salon/caida` y cualquier id inexistente responden 404; `/salon/asteroides` responde 200.
- [ ] Las pestañas del salón son enlaces (`GLOBAL` y `ASTEROIDES`), marcan la ruta activa y funcionan con recarga directa.
- [ ] El botón `GUARDAR PUNTUACIÓN` de un juego con motor queda deshabilitado con un nombre de menos de 3 caracteres.
- [ ] Si la inserción falla (sin red o rechazada), el modal muestra un mensaje de error, conserva nombre y puntuación y permite reintentar; no se pierde la partida.
- [ ] Guardar la puntuación de `asteroides` no escribe en `localStorage["av_scores"]`; guardarla en `caida` sí.
- [ ] `/juegos` y `/juegos/asteroides` muestran `best` y `plays` desde `game_stats`: `0` y `0` con la base vacía, y actualizados tras guardar una partida.
- [ ] `lib/games.ts` ya no contiene los campos `best` ni `plays`.
- [ ] `seededScores` no se usa en `/salon` ni en `/salon/[id]`.
- [ ] Si la consulta a Supabase falla, `/salon` y `/salon/[id]` muestran un mensaje de error y no una pantalla en blanco ni datos falsos.
- [ ] A 375 px de ancho `/salon` y `/salon/asteroides` no tienen scroll horizontal; el podio y la tabla se leen sin recortes.
- [ ] Recargar `/salon`, `/salon/asteroides` y `/juegos` no produce errores de hidratación ni errores en la consola.
- [ ] Ni `service_role` ni `SUPABASE_DB_PW` aparecen en el código ni en el bundle del cliente.
- [ ] `CLAUDE.md` documenta las tablas, las vistas y `queries.ts`.

---

## Decisiones

- **Sí:** tabla `games` en Supabase, además del leaderboard. Decisión explícita del usuario; da clave foránea a `scores`, permite `ranked` y `game_stats`. **No:** limitarse a una vista en tabla de la UI.
- **Sí:** `games` solo guarda `id`, `title`, `cat`, `ranked` y `sort_order`; `short`, `long`, `cover` y `color` siguen en `lib/games.ts`. Evita duplicar textos y estilos CSS en dos fuentes de verdad. **No:** vaciar `lib/games.ts` ni mover todo el catálogo a la base de datos (cambio grande en todas las pantallas).
- **Sí:** puntuaciones en `scores` con inserción anónima validada por RLS y `CHECK`. Decisión del usuario; permite un ranking compartido sin esperar a auth. **No:** seguir en `localStorage` (sin ranking compartido) ni esperar al spec de auth.
- **Sí:** nombre libre y una fila por partida. Decisión del usuario; no requiere `UPDATE` anónimo ni permite que alguien sobrescriba la marca de otro. **No:** upsert por (juego, nombre).
- **Sí:** el ranking global suma la mejor marca de cada nombre en cada juego con ranking. Es comparable entre jugadores y premia jugar varios juegos. **No:** mejor partida individual de cualquier juego (las escalas de puntos no son comparables entre juegos).
- **Sí:** solo los juegos con motor guardan en Supabase; los mock siguen en `localStorage`. Evita llenar el ranking de números aleatorios. **No:** guardar el mock en la base ni mostrar pestañas "PRÓXIMAMENTE".
- **Sí:** `ranked` en `games` (lo exige el RLS) y `id in ENGINES` en la UI para decidir pestañas y rutas. **No:** leer `ranked` de la base de datos en cada petición solo para pintar pestañas.
- **Sí:** rutas `/salon` (global) y `/salon/[id]` (por juego). Decisión del usuario; URLs compartibles y enlazables desde la ficha. **No:** pestañas con estado local ni Top 5 dentro de la ficha del juego.
- **Sí:** `best` y `plays` derivados por la vista `game_stats`. Una sola fuente de verdad, sin triggers ni contadores que se desincronicen. **No:** columnas `best`/`plays` mantenidas por trigger.
- **Sí:** vistas con `security_invoker = true`. Respetan el RLS de las tablas base y no abren una puerta lateral. **No:** vistas con los privilegios del propietario.
- **Sí:** estado vacío real y sin seed. Las cifras mock desaparecen y `best`/`plays` valen `0` hasta que se juegue. **No:** datos de ejemplo ni mock como respaldo.
- **Sí:** lecturas dinámicas con el cliente de servidor dentro de `<Suspense>`, sin caché. El ranking cambia con cada partida y `cacheComponents` obliga a aislar lo dinámico. **No:** `"use cache"` con revalidación (complejidad innecesaria con tan poco tráfico).
- **Sí:** migración versionada en `supabase/migrations/` además de aplicarla con el MCP. Ya hay esquema que versionar (SPEC 04 lo había diferido por estar vacío). **No:** cambios de esquema solo en el panel.
- **Sí:** Top 50 sin paginación. **No:** paginación ni scroll infinito.
- **Sí:** el nombre de la sesión mock (`user.name`) sigue siendo el valor inicial del campo del modal, editable. **No:** exigir login para guardar.

---

## Riesgos

| Riesgo                                                                       | Mitigación                                                                                                                                       |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Cualquiera puede insertar puntuaciones falsas o hacer spam (API pública)     | Aceptado hasta el spec de auth; `CHECK` de rango (1–10 000 000), solo juegos `ranked` y sin `UPDATE`/`DELETE`; documentado en la nota de alcance |
| Suplantación: dos personas usan el mismo nombre                              | Aceptado: el nombre no es identidad hasta tener `profiles`; el ranking global agrupa por nombre normalizado                                      |
| Nombres ofensivos visibles públicamente                                      | Aceptado en este spec; moderación queda como spec futuro                                                                                         |
| `ranked` (base de datos) y `ENGINES` (código) se desincronizan               | Criterio de aceptación sobre ambos; la nota en `CLAUDE.md` indica que un juego nuevo con motor exige actualizar `ranked` por migración           |
| Vistas sin `security_invoker` saltan el RLS                                  | Las dos vistas se crean con `security_invoker = true`; `get_advisors` lo verifica                                                                |
| `cacheComponents`: leer Supabase con `cookies()` falla fuera de `<Suspense>` | Todas las lecturas van dentro de `<Suspense>` con fallback; leer la guía de Next antes de los pasos 4, 7 y 8                                     |
| `generateStaticParams` con ids de la base de datos no disponibles en build   | Los ids de las rutas salen de `ENGINES`/`lib/games.ts`, no de una consulta                                                                       |
| La inserción desde el navegador falla (sin red, RLS) y se pierde la partida  | El modal conserva nombre y puntuación y permite reintentar; no cierra hasta tener éxito o salir explícitamente                                   |
| Quitar `best`/`plays` de `lib/games.ts` rompe consumidores olvidados         | `tsc` detecta cada uso; criterio de aceptación sobre `lib/games.ts` y el build                                                                   |
| Entradas antiguas en `av_scores` quedan huérfanas                            | Aceptado: eran datos locales del mock; no se migran                                                                                              |

---

## Qué **no** está en este spec

- Autenticación, `profiles` y `user_id` en las puntuaciones.
- Antitrampas, límites de frecuencia y moderación de nombres.
- Puntuaciones en Supabase para los juegos sin motor.
- Mover `cover`, `color`, `short` y `long` a la base de datos.
- Realtime, paginación y filtros por periodo.
- "Actividad en vivo" y demás datos mock de la home.
- Migración de `localStorage["av_scores"]`.
- Tests automatizados.

Cada uno de ellos, si se aborda, va en su propio spec.
