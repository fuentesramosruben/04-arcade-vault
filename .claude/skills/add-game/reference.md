# Referencia de integración de juegos

Mapa extraído de SPEC 05, SPEC 06 y `CLAUDE.md`. Compruébalo contra el código antes de citarlo en un spec.

## Qué se toca a mano

| Archivo                                           | Cambio                                                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `lib/games/<id>/{engine,entities,constants}.ts`   | Motor en TypeScript puro (el tamaño de los archivos depende del juego)                           |
| `lib/games/registry.ts`                           | Entrada `<id>: create<Nombre>Engine` en `ENGINES`                                                |
| `lib/games.ts`                                    | Entrada del catálogo (`id`, `title`, `short`, `long`, `cat`, `cover`, `color`) si es juego nuevo |
| `app/globals.css`                                 | Portada `.cover-<id>` (diseñada con `/frontend-design`)                                          |
| `components/game-player.tsx`                      | Entrada en `CONTROLS` con la leyenda de teclas                                                   |
| `supabase/migrations/<timestamp>_<id>_ranked.sql` | `ranked = true` para el juego, aplicada con `apply_migration`                                    |
| `CLAUDE.md`                                       | Nota breve del juego y de cualquier extensión del contrato                                       |

Si reutiliza un mock, no se crea entrada nueva en `lib/games.ts`: se actualiza la existente (sin tocar `best`/`plays`, que ya no existen allí).

## Qué funciona solo por estar en `ENGINES`

- `components/game-player.tsx` usa `GameCanvas` si `game.id in ENGINES` (HUD, pausa, modal y guardado en `scores`).
- `components/salon-tabs.tsx` añade la pestaña del juego.
- `app/salon/[id]/page.tsx` genera la ruta con `generateStaticParams` y responde 404 al resto.
- `proxy.ts` deja pasar `/salon/<id>` solo si el id está en `ENGINES`.
- `app/juegos/[id]/page.tsx` muestra el enlace "VER RANKING".
- `game_stats` y `global_leaderboard` incluyen el juego sin cambios.

No hay que regenerar `lib/supabase/database.types.ts`: la migración solo cambia filas, no el esquema.

**Invariante:** `ranked` en la tabla `games` y `id in ENGINES` deben coincidir. Si no, el RLS rechaza el guardado o la UI enlaza a un ranking vacío.

## Contrato actual (`lib/games/types.ts`)

```ts
export interface GameStats {
  score: number;
  lives: number;
  level: number;
}
export interface GameEngineCallbacks {
  onStats(stats: GameStats): void; // cada vez que cambia score, lives o level
  onGameOver(finalScore: number): void; // 0 vidas o llamada a end()
}
export interface GameEngine {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void; // score 0, 3 vidas, nivel 1
  end(): void; // botón FIN
  destroy(): void; // cancela requestAnimationFrame y quita listeners
}
export type GameEngineFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameEngineCallbacks,
) => GameEngine;
```

`GameCanvas` monta un canvas 800×600 lógicos escalado por CSS al marco CRT 4:3. `GamePlayer` fija `LIVES = 3` y calcula el HUD (JUGADOR, PUNTUACIÓN, VIDAS, NIVEL).

## Extensiones previstas del contrato

Solo se proponen cuando el juego no encaja. Siempre opcionales y retrocompatibles: sin ellas, `asteroides` se comporta igual. Se concretan en el spec del primer juego que las necesite; los juegos siguientes las reutilizan.

- **Tamaño del canvas por juego** (p. ej. Tetris 300×600): metadatos junto a la fábrica en `registry.ts` (ancho, alto), con 800×600 por defecto. `GameCanvas` los usa para `width`/`height` y `aspect-ratio`; el marco CRT debe seguir sin scroll horizontal a 375 px.
- **Vidas opcionales:** `lives?: number` en `GameStats`; si no viene, el HUD oculta VIDAS y el juego termina solo por `onGameOver`.
- **Estadística extra** (p. ej. líneas en Tetris): solo si el usuario la pide; evitar ampliar el HUD por defecto.
- **Assets:** archivos en `public/games/<id>/`, cargados por el motor con URL. Los fallos de carga no deben romper la partida.
- **Sonido:** `HTMLAudioElement` creado dentro del motor, silenciado al pausar y liberado en `destroy()`.

## Reglas de portado desde JavaScript vanilla

- Sin `document`, `window` ni globals de módulo: el estado vive en la instancia que devuelve la fábrica.
- `ctx` e input se reciben por parámetro; los listeners se registran en `start()` y se quitan en `destroy()`.
- `preventDefault` solo en teclas de juego, y nunca si el foco está en `button`, `input` o `a`.
- `dt` limitado a 50 ms y `lastTime` reiniciado al reanudar para evitar saltos.
- Se elimina del canvas todo HUD, overlay `GAME OVER`/`PAUSA` y el reinicio por tecla: lo hace la plataforma.
- `P` y `Esc` alternan la pausa.
- `onStats` solo cuando algo cambia; `onGameOver` una sola vez por partida.
- Colores neón desde `getComputedStyle(canvas)` (`--cyan`, `--magenta`, `--yellow`, `--ink`) con fallback en `constants.ts`; `shadowBlur` solo en los elementos principales.
- Una instancia por montaje (React Strict Mode crea y destruye dos).
- La puntuación debe estar entre 1 y 10 000 000.

## Notas por referencia (`references/started-games/`)

- **`02-asteroids`:** ya portado como `asteroides` (SPEC 05). Mock `rocas` intacto.
- **`03-tetris`:** canvas 300×600 con preview "next" en un segundo canvas, sin vidas, nivel por líneas (cada 10), tema claro/oscuro propio que se descarta, HUD en DOM que se mueve a la plataforma. Mock equivalente: `caida` (PUZZLE, magenta).
- **`04-arkanoid`:** canvas 800×600, `levels.js` con 5 niveles, spritesheet (`assets/spritesheet-breakout.png`) y sonidos (`assets/sounds/`). Mock equivalente: `bloque-buster` (ARCADE, cyan).

Revisa el código real de cada carpeta al hacer el inventario: estas notas son un punto de partida.

## SQL modelo de la migración `ranked`

Juego nuevo (ya hay fila en `games` solo si lo creó otro spec; normalmente no):

```sql
insert into public.games (id, title, cat, ranked, sort_order)
values ('<id>', '<TÍTULO>', '<CAT>', true, <siguiente sort_order>);
```

Reutiliza un mock existente:

```sql
update public.games set ranked = true where id = '<id>';
```

Verificación con `execute_sql`: `select id, ranked from public.games order by sort_order;` y comparar con las claves de `ENGINES`. El nombre del archivo lleva el timestamp de `apply_migration`.
