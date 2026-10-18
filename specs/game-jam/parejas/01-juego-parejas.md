# SPEC XX — Juego Parejas jugable en la plataforma con ranking

> **Status:** Borrador
> **Depends on:** SPEC 05, SPEC 06, SPEC 07
> **Date:** 2026-10-18
> **Objective:** Crear desde cero el juego de memoria `parejas` en Arcade Vault, jugable con HUD, pausa y modal de la plataforma, con seis niveles de tablero creciente, y con leaderboard en `/salon/parejas`.

---

## Por qué existe este spec

El catálogo tiene un solo puzzle con motor (`tetris`) y ninguna entrada de memoria: ni mock ni código de referencia en `references/started-games/`. El motor se escribe desde cero. `references/game-suggestions-todo.md` lo propone como "Memoria con símbolos neón y niveles crecientes" (coste S).

Parejas encaja en el contrato actual sin extensiones: canvas 800×600 (por defecto) y sin vidas, que ya soporta la extensión opcional de SPEC 07 (`lives: false` en `ENGINE_META`; `GameStats.lives` omitido y VIDAS oculto en el HUD). No hay extensión nueva del contrato y `asteroides`, `tetris`, `arkanoid` y `snake` no se ven afectados.

Como el canvas no lleva texto ni HUD y la plataforma no tiene reloj, el tiempo restante del nivel se dibuja como una barra vectorial en la parte superior del canvas. La derrota llega por tiempo agotado, no por fallos: en un tablero de 6×6 un fallo es inevitable y no puede ser un castigo mortal.

Es una **entrada nueva** del catálogo; no existe ningún mock equivalente que reutilizar.

---

## Alcance

**Dentro:**

- Motor en `lib/games/parejas/` sin globals ni `document`, con estas mecánicas:
  - Tablero de cartas boca abajo, con cursor que se mueve por las cartas.
  - Cada turno se voltean dos cartas. Si forman pareja se quedan boca arriba (emparejadas); si no, se muestran 700 ms y vuelven a boca abajo.
  - Seis niveles con tableros 3×4, 4×4, 4×5, 4×6, 5×6 y 6×6 (6 a 18 parejas).
  - Cada nivel empieza con una vista previa de todas las cartas boca arriba (el tiempo está parado), y luego se ocultan.
  - Barra de tiempo por nivel (40 a 150 s). Si llega a 0, termina la partida.
  - Combo de aciertos seguidos (×1 a ×5) que se rompe con un fallo.
  - Bonus por segundos sobrantes y bonus por nivel sin fallos.
  - Limpiar el nivel 6 termina la partida con `onGameOver` (victoria).
- 36 caras únicas = 9 formas vectoriales × 4 colores de tokens; en cada nivel se sortean las caras necesarias.
- Entrada `parejas: createParejasEngine` en `ENGINES` de `lib/games/registry.ts` y `parejas: { lives: false }` en `ENGINE_META`.
- Entrada nueva en `lib/games.ts`: `id: "parejas"`, título `PAREJAS`, categoría `PUZZLE`, color `cyan`, textos `short`/`long` en español, y portada nueva `cover-parejas` en `app/globals.css` (diseñada con `/frontend-design`).
- Leyenda de teclas en `CONTROLS` de `components/game-player.tsx`.
- Migración `supabase/migrations/<timestamp>_parejas_ranked.sql` que inserta la fila `parejas` en `games` con `ranked = true`, aplicada con `apply_migration`.
- Teclado: ← ↑ ↓ → y W A S D mueven el cursor; Espacio y Enter voltean la carta; `P` y `Esc` alternan la pausa (los gestiona `GamePlayer`, como en SPEC 05-09); sin scroll de la página con las teclas de juego.
- Estética vectorial neón con colores de los tokens del tema, sin texto en el canvas.
- Nota breve en `CLAUDE.md`.

**Fuera de alcance (specs futuros):**

- Ratón, animación de volteo y destellos (SPEC XX-02).
- Cartas especiales y tiempo extra (SPEC XX-03).
- Otros juegos (cada uno con su spec).
- Modos de juego alternativos (contrarreloj puro, dos jugadores, tableros personalizados).
- Sonido y música: no hay assets de audio.
- Controles táctiles o gamepad.
- Antitrampas, autenticación y moderación de nombres (siguen como en SPEC 06).
- Tests automatizados (no hay framework configurado).

---

## Modelo de datos

- Sin tablas nuevas: `games` y `scores` ya existen (SPEC 06). El único cambio de datos es una fila nueva en `games` con `ranked = true` para `parejas`.
- Sin extensión del contrato: `GameStats` se emite con `score` y `level`; no se envían `lives` ni `lines`. `ENGINE_META.parejas = { lives: false }`.
- Archivos del motor:

```
lib/games/parejas/engine.ts      # createParejasEngine: bucle, fases, input, dibujo
lib/games/parejas/entities.ts    # tipos y funciones puras (barajar, construir tablero, mover cursor, puntos)
lib/games/parejas/constants.ts   # canvas, niveles, tiempos, formas, colores por defecto
```

- Tipos clave:

```ts
// lib/games/parejas/entities.ts
export type CardState = "down" | "up" | "matched";
export interface Card {
  face: number; // 0..35; forma = face % 9, color = face % 4
  state: CardState;
}
export type Phase = "preview" | "play" | "reveal" | "clear" | "over";
export function buildDeck(pairs: number, rng: () => number): Card[]; // elige `pairs` caras distintas, las duplica y baraja (Fisher-Yates)
export function moveCursor(
  index: number,
  dx: number,
  dy: number,
  cols: number,
  rows: number,
): number; // con vuelta al borde
export function pairPoints(combo: number): number; // 100 × combo
export function timeBonus(remainingMs: number, level: number): number; // floor(remainingMs / 1000) × 10 × level

// lib/games/parejas/constants.ts
export interface LevelDef {
  rows: number;
  cols: number;
  timeSec: number;
  previewMs: number;
}
export const LEVELS: LevelDef[]; // 6 niveles, ver tabla
export const SHAPES: number; // 9
```

- Canvas lógico 800×600 (por defecto del contrato). Origen arriba a la izquierda. `dt` limitado a 50 ms y `lastTime` reiniciado al reanudar. Todo el tiempo de juego se acumula con `dt`, así que la pausa lo congela.
- Niveles:

| Nivel | Tablero (filas×cols) | Cartas | Parejas | Tiempo | Vista previa |
| :---: | :------------------: | :----: | :-----: | :----: | :----------: |
|   1   |         3×4          |   12   |    6    |  40 s  |   1 600 ms   |
|   2   |         4×4          |   16   |    8    |  55 s  |   1 800 ms   |
|   3   |         4×5          |   20   |   10    |  75 s  |   2 000 ms   |
|   4   |         4×6          |   24   |   12    |  95 s  |   2 200 ms   |
|   5   |         5×6          |   30   |   15    | 120 s  |   2 500 ms   |
|   6   |         6×6          |   36   |   18    | 150 s  |   2 800 ms   |

La vista previa es `1 000 + 100 × parejas` ms.

- Geometría: barra de tiempo en `x 16..784`, `y 14..26`. Zona de cartas `x 16..784`, `y 44..584` (768×540), separación de 12 px. Las cartas son cuadradas con lado `S = min(floor((768 − 12 × (cols − 1)) / cols), floor((540 − 12 × (filas − 1)) / filas))`: 172 px en el nivel 1 y 80 px en el nivel 6. El tablero se centra en la zona.
- Caras: 9 formas (círculo, cuadrado, triángulo, rombo, aspa, cruz, estrella de 5 puntas, hexágono, rayo) definidas en `constants.ts` como listas de puntos normalizados en [-1, 1] (el círculo con `arc`). 4 colores (`--cyan`, `--magenta`, `--yellow`, `--green`). La cara `f` usa forma `f % 9` y color `f % 4`; como `mcm(9, 4) = 36`, las 36 caras son únicas. Se dibujan a trazo de 4 px con radio `0.32 × S`.
- Fases:
  - `preview`: todas las cartas boca arriba durante `previewMs`; el tiempo no corre y no se admite volteo. Al terminar pasan a `down` y empieza `play`.
  - `play`: se puede voltear. El tiempo restante baja con `dt`.
  - `reveal`: tras un fallo, las dos cartas se muestran 700 ms; el tiempo sigue corriendo, el cursor se mueve pero no se voltea. Al terminar vuelven a `down`.
  - `clear`: tras la última pareja del nivel, 800 ms de transición con el tiempo parado; después arranca el siguiente nivel en `preview` o, si era el 6, se llama a `onGameOver`.
  - `over`: partida terminada; el motor no procesa más.
- Reglas del turno: Espacio o Enter sobre una carta `down` la pasa a `up`. Con la segunda carta se compara `face`: si coinciden, ambas pasan a `matched`, el combo sube y se suma puntuación; si no, fase `reveal` y el combo vuelve a 0. Sobre una carta `up` o `matched` no hace nada.
- Cursor: empieza en la carta 0 de cada nivel. Se mueve por filas y columnas con vuelta al borde (de la última columna a la primera de la misma fila, y análogo en vertical).
- Puntuación:

| Evento                        | Puntos                                                     |
| ----------------------------- | ---------------------------------------------------------- |
| Pareja con combo `c` (1 a 5)  | `100 × c`; el combo `c` = aciertos seguidos, con tope en 5 |
| Fallo                         | 0 y combo a 0                                              |
| Nivel limpio, tiempo sobrante | `floor(msRestantes / 1000) × 10 × nivel`                   |
| Nivel limpio sin ningún fallo | +500                                                       |

El combo se reinicia a 0 al empezar cada nivel. Máximo teórico: pares 28 500 (2 000 + 3 000 + 4 000 + 5 000 + 6 500 + 8 000) + tiempo menos de 22 550 + perfectos 3 000, unos 54 000 puntos, muy por debajo de 10 000 000 (límite del `CHECK` de `scores`).

- `onStats({ score, level })` solo cuando cambia la puntuación o el nivel; `restart()` deja score 0, nivel 1, combo 0 y un tablero nuevo. `onGameOver(score)` una sola vez (tiempo agotado, nivel 6 limpio o `end()`).
- Barra de tiempo: pista con `--line`, relleno proporcional a `restante / timeSec`. Color `--green` por encima del 50 %, `--yellow` entre 25 % y 50 %, `--magenta` por debajo del 25 %. Sin texto.
- Colores leídos una vez en `start()` con `getComputedStyle(canvas)` (`--bg`, `--line`, `--ink`, `--ink-faint`, `--cyan`, `--magenta`, `--yellow`, `--green`), con valores por defecto en `constants.ts`. Fondo `--bg`.
- Aspecto de carta: boca abajo = cuadrado redondeado de 8 px con borde `--ink-faint` y un rombo pequeño centrado del mismo color; boca arriba = borde y forma del color de la cara con `shadowBlur` 12; emparejada = misma cara a opacidad 0.45 y sin brillo. Cursor = borde `--ink` de 3 px, 6 px por fuera de la carta, con `shadowBlur` 16. `shadowBlur` solo en cartas boca arriba y en el cursor.
- Input: `keydown` registrado en `start()` sobre `window` y retirado en `destroy()`; `preventDefault` solo en las teclas de juego (flechas, WASD, Espacio y Enter) y nunca si el foco está en `button`, `input` o `a`. Se ignora `e.repeat` para Espacio y Enter (un volteo por pulsación); las flechas con repetición del sistema mueven el cursor.

---

## Plan de implementación

Antes de cada paso se consulta la guía relevante en `node_modules/next/dist/docs/` (Client Components, `cacheComponents`, rutas dinámicas con `generateStaticParams`). La UI nueva (portada, leyenda) se diseña con la skill `/frontend-design`.

1. **Constantes y entidades.** Crear `lib/games/parejas/constants.ts` (canvas, `LEVELS`, formas, colores por defecto, tiempos de fallo 700 ms y transición 800 ms) y `entities.ts` (tipos y funciones puras `buildDeck`, `moveCursor`, `pairPoints`, `timeBonus`). Verificación: `tsc` sin errores; `buildDeck(18, Math.random)` devuelve 36 cartas con 18 caras distintas, cada una dos veces.
2. **Motor.** Crear `lib/games/parejas/engine.ts`: estado en la instancia, bucle `requestAnimationFrame` con `dt` limitado, fases, cursor, volteo, combo, bonus, nivel siguiente y dibujo (fondo, barra de tiempo, cartas, cursor). Implementar `start`/`pause`/`resume`/`restart`/`end`/`destroy`. `onStats` solo cuando cambia algo; `onGameOver` una sola vez. Sin HUD ni overlays en el canvas. Verificación: `tsc`.
3. **Registro.** Añadir `parejas: createParejasEngine` a `ENGINES` y `parejas: { lives: false }` a `ENGINE_META` en `lib/games/registry.ts`. Verificación: `tsc`; los otros cuatro juegos siguen igual.
4. **Catálogo y portada.** Añadir la entrada `parejas` a `lib/games.ts` y la portada `.cover-parejas` a `app/globals.css` (cuadrícula de cartas con formas neón). Verificación: `/juegos` muestra la tarjeta `PAREJAS` y `/juegos/parejas` abre su ficha.
5. **Leyenda.** Añadir `parejas` a `CONTROLS` en `game-player.tsx` (← ↑ ↓ → o WASD mover · ESPACIO o ENTER voltear · P pausa). Verificación: `/juegos/parejas/jugar` muestra el canvas 800×600, la leyenda y un HUD sin VIDAS.
6. **Migración `ranked`.** Comprobar con `execute_sql` `select max(sort_order) from public.games` y aplicar con `apply_migration` el `insert` de `parejas` (`'PAREJAS'`, `'PUZZLE'`, `true`, `max + 1`, previsto 12); guardar el archivo en `supabase/migrations/`. Verificación: `select id, ranked from public.games order by sort_order;` devuelve `ranked = true` solo para las claves de `ENGINES`; `get_advisors` sin avisos nuevos.
7. **Partida completa.** Jugar hasta un game over (también dejando agotar el tiempo del nivel 1), guardar la puntuación y comprobar la fila en `/salon/parejas` y en `/salon`. Verificación: el modal muestra la puntuación real y la fila aparece en ambos rankings.
8. **Pulido y responsive.** Revisar a 375, 768 y 1280 px el marco 4:3, el tamaño del cursor y la legibilidad de las formas en el nivel 6 (cartas de 80 px). Verificación: sin scroll horizontal a 375 px.
9. **Documentación.** Añadir a `CLAUDE.md` una nota de `lib/games/parejas/` y de `ENGINE_META.parejas`. Verificación: `git diff` solo contiene archivos de este spec.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] Existen `lib/games/parejas/{engine,entities,constants}.ts` y ninguno referencia `document` ni variables globales de estado.
- [ ] `parejas` está en `ENGINES` y `ranked = true` en `games`; ambos coinciden con las demás claves y filas.
- [ ] `lib/games.ts` contiene la entrada `parejas` (PUZZLE, cyan, título `PAREJAS`) y `/juegos` la muestra con `cover-parejas`.
- [ ] `/juegos/parejas/jugar` renderiza el canvas del juego y no la arena mock.
- [ ] El canvas es de 800×600 lógicos y `ENGINE_META.parejas` solo define `lives: false`.
- [ ] El HUD de la plataforma muestra PUNTUACIÓN y NIVEL reales al instante, y no muestra VIDAS ni LÍNEAS.
- [ ] El nivel 1 muestra 12 cartas (3×4) boca arriba durante 1 600 ms y después boca abajo; el nivel 6 muestra 36 cartas (6×6) con 18 caras distintas, cada una dos veces.
- [ ] Durante la vista previa la barra de tiempo no baja y Espacio no voltea ninguna carta.
- [ ] ← ↑ ↓ → y W A S D mueven el cursor, con vuelta al borde.
- [ ] Espacio y Enter voltean la carta bajo el cursor; sobre una carta ya boca arriba o emparejada no hacen nada; mantener pulsado Espacio voltea una sola carta.
- [ ] Dos cartas iguales quedan boca arriba (emparejadas, con menos brillo); dos distintas se muestran 700 ms y vuelven a boca abajo, sin permitir un tercer volteo en ese tiempo.
- [ ] Una pareja suma `100 × combo` puntos (100, 200, 300, 400, 500 y 500 en adelante) y un fallo reinicia el combo.
- [ ] Al limpiar un nivel se suma `floor(segundos restantes) × 10 × nivel`, y +500 si no hubo ningún fallo en el nivel.
- [ ] Tras limpiar un nivel pasan 800 ms y empieza el siguiente con su tablero, su tiempo y su vista previa; el HUD muestra el nivel nuevo.
- [ ] Limpiar el nivel 6 abre el modal `FIN DEL JUEGO` con la puntuación real.
- [ ] Si la barra de tiempo llega a 0, se abre el modal `FIN DEL JUEGO` con la puntuación real y el motor se detiene.
- [ ] La barra de tiempo pasa de verde a amarillo por debajo del 50 % y a magenta por debajo del 25 %.
- [ ] El botón FIN termina la partida con la puntuación actual; `JUGAR DE NUEVO` empieza otra con 0 puntos, nivel 1 y un tablero nuevo.
- [ ] PAUSA, `P` y `Esc` detienen el juego y la barra de tiempo, sin salto de tiempo al reanudar (ni tampoco en mitad de un fallo o de la vista previa).
- [ ] Las teclas de juego no hacen scroll de la página ni activan un botón enfocado.
- [ ] El canvas no dibuja HUD, texto `GAME OVER`/`PAUSA`; no contiene texto.
- [ ] `GUARDAR PUNTUACIÓN` inserta una fila en `scores` con `game_id = 'parejas'`, el nombre en mayúsculas y la puntuación real, y no escribe en `localStorage["av_scores"]`.
- [ ] La fila aparece en `/salon/parejas` y suma en `/salon`; hay una pestaña `PAREJAS` en el salón.
- [ ] `/juegos` y `/juegos/parejas` muestran `best` y `plays` desde `game_stats`.
- [ ] `/salon/parejas` responde 200 y los ids sin motor siguen en 404.
- [ ] Al salir de la pantalla de juego no quedan listeners ni `requestAnimationFrame`: tras volver, una pulsación de volteo produce una sola acción.
- [ ] Recargar `/juegos/parejas/jugar` no produce errores de hidratación ni en la consola.
- [ ] A 375 px no hay scroll horizontal y el canvas conserva su proporción 4:3.
- [ ] `asteroides`, `tetris`, `arkanoid` y `snake` se comportan exactamente igual; los mocks del catálogo no cambian.
- [ ] `CLAUDE.md` documenta el juego.

---

## Decisiones

- **Sí:** entrada nueva `parejas` (propuesta del agente, revisar). **No:** reutilizar o renombrar un mock; no existe ninguno de memoria.
- **Sí:** HUD, pausa y modal de la plataforma; el motor solo emite datos. **No:** HUD u overlays en el canvas.
- **Sí:** guardado en `scores` solo para juegos con motor. **No:** `localStorage` para este juego.
- **Sí:** sin vidas, reutilizando `lives: false` de SPEC 07 (propuesta del agente, revisar). **No:** vidas por fallo ni `GameStats.lives`; **No:** extensión nueva del contrato.
- **Sí:** derrota por tiempo agotado con una barra vectorial sin texto (propuesta del agente, revisar). **No:** reloj numérico en el canvas, ni en el HUD (exigiría un campo nuevo en `GameStats`).
- **Sí:** seis niveles de 3×4 a 6×6 y victoria al limpiar el 6 con `onGameOver`. **No:** niveles infinitos (el ranking quedaría sin fin natural) ni pantalla de victoria propia.
- **Sí:** tiempos (40 a 150 s) y puntos (`100 × combo`, `10 × nivel` por segundo, +500 por nivel sin fallos) como valores iniciales, a ajustar en la revisión. **No:** puntos fijos por pareja: no premiarían la racha ni la rapidez.
- **Sí:** vista previa con el tiempo parado. **No:** vista previa que gasta tiempo: penalizaría los tableros grandes por algo que no depende del jugador.
- **Sí:** el tiempo sigue corriendo durante el fallo de 700 ms (penaliza fallar). **No:** pararlo.
- **Sí:** combo con tope ×5 y reinicio por nivel. **No:** combo sin tope (haría que un nivel 6 limpio dominara el ranking) ni combo que cruza niveles.
- **Sí:** caras = forma × color, 36 únicas, con forma distinta aunque falle el color. **No:** emojis o texto en las cartas (el canvas no lleva texto) ni solo colores.
- **Sí:** teclado únicamente en este spec, con vuelta al borde del cursor. **No:** ratón aquí (SPEC XX-02) ni cursor que se detiene en el borde (más pulsaciones).
- **Sí:** Espacio y Enter con `e.repeat` ignorado. **No:** permitir voltear con la tecla mantenida.
- **Sí:** estética vectorial con tokens del tema. **No:** copiar una paleta externa ni usar sprites.
- **Sí:** sin sonido. **No:** buscar o añadir efectos por ahora.
- **Sí:** color de catálogo `cyan`. **No:** `yellow` para no igualar a Tetris.

---

## Riesgos

| Riesgo                                                                        | Mitigación                                                                                                                            |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Doble montaje en Strict Mode crea dos motores y dos bucles                    | `destroy()` en el cleanup de `GameCanvas`; criterio de aceptación sobre listeners y acción única                                      |
| Listeners de teclado persistentes tras salir de la pantalla                   | Registrados en `start()` y retirados en `destroy()`; nunca en el módulo                                                               |
| `preventDefault` en Espacio y Enter rompe botones o el input del modal        | No prevenir si el foco está en `button`, `input` o `a`; el input de nombre debe seguir admitiendo Espacio y letras                    |
| `ranked` y `ENGINES` se desincronizan                                         | Criterio de aceptación sobre ambos; la migración forma parte del plan                                                                 |
| Salto de `dt` al pausar o cambiar de pestaña                                  | `dt` limitado a 50 ms y `lastTime` reiniciado al reanudar; los temporizadores de fase usan `dt`, no `Date.now()`                      |
| `shadowBlur` penaliza el rendimiento con 36 cartas                            | Brillo solo en cartas boca arriba y en el cursor                                                                                      |
| Pausar durante el fallo de 700 ms deja las cartas visibles o las oculta antes | El temporizador de `reveal` avanza solo con `dt`, por lo que se congela con la pausa                                                  |
| Pulsar Espacio dos veces rápido voltea la misma carta o una tercera           | Solo se voltean cartas `down`; en `reveal`, `clear` y `preview` el volteo se ignora                                                   |
| Cartas de 80 px (nivel 6) con formas poco legibles a 375 px                   | Formas de trazo grueso (4 px lógicos, ~2 px reales) y color distinto; revisar en el paso 8 y subir el trazo si hace falta             |
| Daltonismo: dos caras con la misma forma y distinto color se confunden        | Cada forma se combina con 4 colores y el sorteo prioriza caras distintas; la forma sigue siendo distinta entre caras vecinas del mazo |
| Tiempos demasiado ajustados o demasiado holgados                              | Son valores iniciales en `LEVELS`; se ajustan en la revisión sin tocar la lógica                                                      |
| Partida terminada con 0 puntos choca con el `CHECK` de `scores` (≥ 1)         | Mismo tratamiento que en SPEC 05-09 en el modal de la plataforma; no se reabre en este spec                                           |
| Puntuación alcanzable sin pensar (pulsar al azar)                             | Los fallos rompen el combo y gastan tiempo; el azar puro no limpia el nivel 3 en 75 s                                                 |

---

## Qué **no** está en este spec

- Ratón, animación de volteo y destellos (SPEC XX-02).
- Cartas especiales y tiempo extra (SPEC XX-03).
- Otros juegos distintos de Parejas.
- Modos alternativos, dos jugadores y tableros personalizados.
- Sonido y música.
- Controles táctiles o gamepad.
- Autenticación, antitrampas y moderación de nombres.
- Tests automatizados.

Cada uno de ellos, si se aborda, va en su propio spec.
