# SPEC 09 — Juego Snake jugable en la plataforma con ranking

> **Status:** Aprobado
> **Depends on:** SPEC 05, SPEC 06, SPEC 07
> **Date:** 2026-10-15
> **Objective:** Crear desde cero el juego `snake` en Arcade Vault (reutilizando y renombrando el mock `serpentina`), jugable con HUD, pausa y modal de la plataforma, con frutas pixel-art como comida y leaderboard en `/salon/snake`.

---

## Por qué existe este spec

Hoy el catálogo tiene `serpentina`, un mock sin juego real (arena mock en `GamePlayer`, `ranked = false`, 0 partidas en `scores`). No hay código de referencia en `references/started-games/`: el motor se escribe desde cero. Lo único que se aporta es `references/source-assets/snake-assets/` (`fruits.png`, hoja de 3790×442 con tres filas de frutas, y `sprites.js`, un atlas con las coordenadas de la fila pixel-art, fuente: spriters-resource). `sprites.js` usa `window.SPRITE_ATLAS` y rutas relativas del prototipo, así que no se importa: solo se copian sus coordenadas a `constants.ts`.

Por decisión del usuario, **no se crea una entrada nueva**: la entrada `serpentina` se reutiliza y se **renombra a `snake`** (id, título y fila de `games`). El id es una clave primaria referenciada por `scores.game_id` sin `ON UPDATE CASCADE`, pero `serpentina` tiene 0 filas en `scores` (comprobado con `execute_sql`), así que el renombrado es seguro. Antes de aplicarlo en el plan se vuelve a comprobar.

Snake encaja en el contrato actual: canvas 800×600 (por defecto) y sin vidas, que ya soporta la extensión opcional de SPEC 07 (`lives: false` en `ENGINE_META`; `GameStats.lives` omitido y VIDAS oculto en el HUD). **No hay extensión nueva del contrato** y `asteroides`, `tetris` y `arkanoid` no se ven afectados.

---

## Alcance

**Dentro:**

- Motor en `lib/games/snake/` sin globals ni `document`, con estas mecánicas:
  - Rejilla de 20×15 celdas de 40 px sobre un canvas de 800×600 lógicos.
  - Serpiente de longitud inicial 3, que avanza una celda por paso sin parar.
  - Giro con ← ↑ ↓ → y con W A S D; no se puede invertir 180° ni en un solo paso con dos pulsaciones (cola de giros de máximo 2).
  - Una sola vida: chocar con una pared o con la propia cola termina la partida.
  - Una fruta en pantalla a la vez, en una celda libre al azar. Cada aparición usa un sprite distinto de la fila pixel-art (nunca el mismo que la anterior).
  - Comer una fruta suma `10 × nivel` puntos y alarga la serpiente una celda.
  - Nivel = `1 + floor(frutas / 5)`; cada nivel acorta el paso hasta un mínimo.
  - Si la serpiente llena las 300 celdas, la partida termina con `onGameOver` (victoria).
- Assets: `fruits.png` copiado sin procesar a `public/games/snake/fruits.png`; coordenadas de la fila pixel-art (22 frutas) en `constants.ts`; carga con `Image` dentro del motor y dibujo con `drawImage`.
- Entrada `snake: createSnakeEngine` en `ENGINES` de `lib/games/registry.ts`. Sin entrada en `ENGINE_META` más allá de `snake: { lives: false }` (800×600 y `lines: false` ya son los valores por defecto).
- Actualización de la entrada existente de `lib/games.ts`: `id: "snake"`, título `SNAKE`, categoría `ARCADE`, color `green`, textos `short`/`long` revisados para el juego real. La portada sigue siendo `cover-snake` en `app/globals.css` (ya existe; se rediseña con `/frontend-design` para mostrar una serpiente neón y una fruta).
- Leyenda de teclas en `CONTROLS` de `components/game-player.tsx`.
- Migración `supabase/migrations/<timestamp>_snake_ranked.sql` que renombra la fila (`id`, `title`) y pone `ranked = true`, aplicada con `apply_migration`.
- Controles: ← ↑ ↓ → y W A S D giran; `P` y `Esc` alternan la pausa; sin scroll de la página con las flechas.
- Estética vectorial con acentos neón desde los tokens del tema para serpiente, rejilla y fondo; las frutas son los sprites.
- Nota breve en `CLAUDE.md` (juego, `public/games/snake/` y renombrado de `serpentina`).

**Fuera de alcance (specs futuros):**

- Otros juegos (cada uno con su spec).
- Vidas, obstáculos, frutas especiales o con valor distinto, bonus de tiempo, modo sin paredes (wrap) y varias frutas a la vez.
- Sprites para serpiente o fondo: la serpiente se dibuja en vectorial.
- Las filas vectorial y realista de `fruits.png` (solo se usa la fila pixel-art).
- Recortar o optimizar `fruits.png`.
- Sonido y música: no hay assets de audio.
- Controles táctiles, gestos o gamepad.
- Antitrampas, autenticación y moderación de nombres (siguen como en SPEC 06).
- Tests automatizados (no hay framework configurado).

---

## Modelo de datos

- Sin tablas nuevas: `games` y `scores` ya existen (SPEC 06). Los únicos cambios de datos son sobre la fila existente de `games`: `id` pasa de `serpentina` a `snake`, `title` de `SERPENTINA` a `SNAKE` y `ranked` a `true`.
- Sin extensión del contrato: `GameStats` se emite con `score` y `level`; no se envían `lives` ni `lines`. `ENGINE_META.snake = { lives: false }`.
- Archivos del motor:

```
lib/games/snake/engine.ts      # createSnakeEngine: bucle, paso fijo, input, colisiones, carga de sprites, dibujo
lib/games/snake/entities.ts    # tipos Cell, Direction, SnakeState y funciones puras (avance, colisión, celda libre, nivel, puntos)
lib/games/snake/constants.ts   # canvas, rejilla, ritmo, FRUIT_SPRITES, colores por defecto, ruta del PNG
public/games/snake/fruits.png  # copia de references/source-assets/snake-assets/fruits.png
```

- Tipos clave:

```ts
// lib/games/snake/entities.ts
export interface Cell {
  col: number;
  row: number;
}
export type Direction = "up" | "down" | "left" | "right";

// lib/games/snake/constants.ts
export interface SpriteRect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export const FRUIT_SPRITES: Record<string, SpriteRect>; // 22 frutas, coordenadas de sprites.js (fila y = 136, h = 160)
export const FRUIT_SHEET_URL = "/games/snake/fruits.png";
```

- Canvas lógico 800×600 (por defecto del contrato). Origen arriba a la izquierda, rejilla `COLS = 20`, `ROWS = 15`, `CELL = 40`. `dt` limitado a 50 ms y `lastTime` reiniciado al reanudar.
- Ritmo: paso fijo con acumulador. Intervalo `max(70, 150 − 10 × (nivel − 1))` ms: 150 ms en el nivel 1 y 70 ms desde el nivel 9. El dibujo corre por `requestAnimationFrame` y solo la lógica va por pasos.
- Inicio: serpiente de 3 celdas con la cabeza en `(col 5, row 7)` mirando a la derecha, que se mueve de inmediato (como Arkanoid). Primera fruta en una celda libre al azar.
- Giros: cada pulsación válida se añade a una cola de máximo 2 direcciones; en cada paso se consume una. Una dirección se descarta si es igual u opuesta a la última encolada (o a la actual si la cola está vacía).
- Puntuación: `10 × nivel` por fruta, con el nivel vigente justo antes de comer. Máximo teórico: 297 frutas (300 celdas menos 3 iniciales), unos 88 000 puntos, muy por debajo de 10 000 000 (límite del `CHECK` de `scores`).
- `onStats({ score, level })` solo cuando cambia la puntuación o el nivel; `restart()` deja score 0, nivel 1 y serpiente inicial. `onGameOver(score)` una sola vez (choque, tablero lleno o `end()`).
- Sprites: una `Image` creada en `start()` con `FRUIT_SHEET_URL`. Se dibuja con `drawImage(sheet, sx, sy, sw, sh, dx, dy, dw, dh)` ajustando el sprite a una celda de 40 px con margen de 2 px y conservando la proporción (los recortes son de 110–170 × 160). Mientras no cargue, o si falla, la fruta se dibuja como un círculo neón de respaldo y la partida no se interrumpe. `destroy()` suelta la referencia.
- Colores: serpiente (`--green`), fruta de respaldo (`--magenta`), rejilla tenue y fondo (`--ink`/negro) leídos una vez en `start()` con `getComputedStyle(canvas)`, con valores por defecto en `constants.ts`. `shadowBlur` solo en la cabeza.
- Input: `keydown` registrado en `start()` sobre `window` y retirado en `destroy()`; `preventDefault` solo en las teclas de juego (flechas y WASD) y nunca si el foco está en `button`, `input` o `a`. `P`/`Esc` alternan la pausa.

---

## Plan de implementación

Antes de cada paso se consulta la guía relevante en `node_modules/next/dist/docs/` (Client Components, `public/`, `cacheComponents`, rutas dinámicas con `generateStaticParams`). La UI nueva (portada, leyenda) se diseña con la skill `/frontend-design`.

1. **Constantes y entidades.** Crear `lib/games/snake/constants.ts` (canvas, rejilla, ritmo, `FRUIT_SPRITES` con las 22 coordenadas de `sprites.js`, colores por defecto, ruta del PNG) y `entities.ts` (tipos y funciones puras: avance de la cabeza, colisión con pared y cola, elección de celda libre, nivel y puntos). Verificación: `tsc` sin errores.
2. **Sprite sheet.** Copiar `references/source-assets/snake-assets/fruits.png` a `public/games/snake/fruits.png`. Verificación: `/games/snake/fruits.png` responde 200 con el servidor de desarrollo.
3. **Motor.** Crear `lib/games/snake/engine.ts`: estado en la instancia, bucle `requestAnimationFrame` con paso fijo, cola de giros, comida, nivel, colisiones, carga del PNG con respaldo y dibujo (fondo, rejilla tenue, serpiente vectorial, fruta). Implementar `start`/`pause`/`resume`/`restart`/`end`/`destroy`. `onStats` solo cuando cambia algo; `onGameOver` una sola vez. Sin HUD ni overlays en el canvas. Verificación: `tsc`.
4. **Registro.** Añadir `snake: createSnakeEngine` a `ENGINES` y `snake: { lives: false }` a `ENGINE_META` en `lib/games/registry.ts`. Verificación: `tsc`; `asteroides`, `tetris` y `arkanoid` siguen igual.
5. **Catálogo y portada.** Renombrar la entrada `serpentina` en `lib/games.ts` (`id: "snake"`, título `SNAKE`, textos nuevos) y rediseñar `.cover-snake` en `app/globals.css`. Verificación: `/juegos` muestra la tarjeta `SNAKE` y `/juegos/snake` abre su ficha; `/juegos/serpentina` ya no existe.
6. **Leyenda.** Añadir `snake` a `CONTROLS` en `game-player.tsx` (← ↑ ↓ → o WASD girar · P pausa). Verificación: `/juegos/snake/jugar` muestra el canvas 800×600, la leyenda y un HUD sin VIDAS.
7. **Migración `ranked`.** Repetir `select count(*) from public.scores where game_id = 'serpentina'` (debe ser 0) y aplicar con `apply_migration` el `update` que renombra `serpentina` a `snake`, con título `SNAKE` y `ranked = true`; guardar el archivo en `supabase/migrations/`. Verificación: `select id, ranked from public.games order by sort_order;` devuelve `ranked = true` solo para las claves de `ENGINES` y no queda ninguna fila `serpentina`; `get_advisors` sin avisos nuevos.
8. **Partida completa.** Jugar hasta el game over, guardar la puntuación y comprobar la fila en `/salon/snake` y en `/salon`. Verificación: el modal muestra la puntuación real y la fila aparece en ambos rankings.
9. **Pulido y responsive.** Revisar a 375, 768 y 1280 px el marco 4:3, el tamaño de las frutas y la legibilidad de la cabeza frente al cuerpo. Verificación: sin scroll horizontal a 375 px.
10. **Documentación.** Añadir a `CLAUDE.md` una nota de `lib/games/snake/`, `public/games/snake/` y el renombrado `serpentina` → `snake`. Verificación: `git diff` solo contiene archivos de este spec.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] Existen `lib/games/snake/{engine,entities,constants}.ts` y ninguno referencia `document` ni variables globales de estado.
- [ ] `snake` está en `ENGINES` y `ranked = true` en `games`; ambos coinciden con las demás claves y filas.
- [ ] No existe ninguna fila `serpentina` en `games` ni referencias a `"serpentina"` en `lib/games.ts` ni en el resto del código.
- [ ] `lib/games.ts` contiene la entrada `snake` (ARCADE, verde, título `SNAKE`) y `/juegos` la muestra con `cover-snake`; no hay entrada duplicada de serpiente.
- [ ] `/juegos/snake/jugar` renderiza el canvas del juego y no la arena mock.
- [ ] El canvas es de 800×600 lógicos y `ENGINE_META.snake` solo define `lives: false`.
- [ ] El HUD de la plataforma muestra PUNTUACIÓN y NIVEL reales al instante, y no muestra VIDAS ni LÍNEAS.
- [ ] La partida empieza con una serpiente de 3 celdas que se mueve hacia la derecha sin pulsar nada, y hay exactamente una fruta en pantalla.
- [ ] ← ↑ ↓ → y W A S D giran la serpiente; pulsar la dirección opuesta a la actual no tiene efecto; dos giros rápidos en el mismo paso se aplican en pasos consecutivos.
- [ ] Comer una fruta alarga la serpiente una celda, suma `10 × nivel` puntos y genera otra fruta en una celda libre, con un sprite distinto del anterior.
- [ ] El nivel pasa de 1 a 2 al comer la 5.ª fruta y el intervalo de paso baja de 150 ms a 140 ms; desde el nivel 9 se queda en 70 ms.
- [ ] Chocar con una pared o con la propia cola abre el modal `FIN DEL JUEGO` con la puntuación real y el motor se detiene.
- [ ] Llenar las 300 celdas abre el modal `FIN DEL JUEGO` con la puntuación real.
- [ ] El botón FIN termina la partida con la puntuación actual; `JUGAR DE NUEVO` empieza otra con 0 puntos, nivel 1 y la serpiente inicial.
- [ ] PAUSA, `P` y `Esc` detienen el movimiento sin salto de tiempo al reanudar.
- [ ] Las flechas durante la partida no hacen scroll de la página ni activan un botón enfocado.
- [ ] Si `fruits.png` no carga, la partida sigue con frutas dibujadas como círculos y sin errores no capturados en consola.
- [ ] El canvas no dibuja HUD, texto `GAME OVER`/`PAUSA`; no contiene texto.
- [ ] `GUARDAR PUNTUACIÓN` inserta una fila en `scores` con `game_id = 'snake'`, el nombre en mayúsculas y la puntuación real, y no escribe en `localStorage["av_scores"]`.
- [ ] La fila aparece en `/salon/snake` y suma en `/salon`; hay una pestaña `SNAKE` en el salón.
- [ ] `/juegos` y `/juegos/snake` muestran `best` y `plays` desde `game_stats`.
- [ ] `/salon/snake` responde 200 y los ids sin motor, incluido `serpentina`, devuelven 404.
- [ ] Al salir de la pantalla de juego no quedan listeners ni `requestAnimationFrame`: tras volver, una pulsación de giro produce una sola acción.
- [ ] Recargar `/juegos/snake/jugar` no produce errores de hidratación ni en la consola.
- [ ] A 375 px no hay scroll horizontal y el canvas conserva su proporción 4:3.
- [ ] `asteroides`, `tetris` y `arkanoid` se comportan exactamente igual.
- [ ] `CLAUDE.md` documenta el juego y el renombrado.

---

## Decisiones

- **Sí:** reutilizar la entrada `serpentina` y renombrarla a `snake` (decisión del usuario). **No:** entrada nueva con el mock intacto; evita dos juegos de serpiente en el catálogo.
- **Sí:** renombrar `id` con un `update` en `games`, válido porque `serpentina` no tiene partidas. **No:** `ON UPDATE CASCADE` ni migrar `scores`; no hace falta con 0 filas y cambiaría el esquema.
- **Sí:** título `SNAKE`, en línea con el nuevo id. **No:** conservar `SERPENTINA` como título con id `snake`.
- **Sí:** HUD, pausa y modal de la plataforma; el motor solo emite datos. **No:** HUD u overlays en el canvas.
- **Sí:** guardado en `scores` solo para juegos con motor. **No:** `localStorage` para este juego.
- **Sí:** clásico con una vida (decisión del usuario), reutilizando `lives: false` de SPEC 07. **No:** vidas o `GameStats.lives`; **No:** extensión nueva del contrato.
- **Sí:** paredes mortales y cola mortal. **No:** modo wrap (puede ser otro spec).
- **Sí:** rejilla 20×15 de 40 px sobre 800×600: encaja en el canvas por defecto y en el marco 4:3 sin tocar `GameCanvas`. **No:** rejillas cuadradas más pequeñas ni canvas propio.
- **Sí:** nivel cada 5 frutas y puntos `10 × nivel` (decisión del usuario), con paso de 150 ms que baja 10 ms por nivel hasta 70 ms. Los valores de ritmo y la longitud inicial 3 son propuestas del spec y se ajustan en la revisión. **No:** puntos fijos ni valores por fruta.
- **Sí:** fruta pixel-art como comida, sprite aleatorio distinto del anterior (decisión del usuario). **No:** una sola fruta fija ni las filas vectorial y realista.
- **Sí:** serpiente vectorial neón con colores de los tokens del tema. **No:** copiar la paleta de la hoja ni dibujar la serpiente con sprites (no los hay).
- **Sí:** copiar `fruits.png` sin procesar a `public/games/snake/` y apuntar las coordenadas de `sprites.js` desde `constants.ts`. **No:** importar `sprites.js` (usa `window` y rutas del prototipo) ni recortar la hoja en este spec.
- **Sí:** cola de giros de 2 y rechazo de 180°. **No:** aceptar cualquier tecla sin cola, que provoca muertes injustas al girar rápido.
- **Sí:** tablero lleno como fin de partida con `onGameOver`. **No:** pantalla de victoria propia.
- **Sí:** `references/source-assets/` no forma parte del commit de este spec; solo se copia el PNG a `public/`. **No:** versionar la carpeta de referencia en este spec.
- **Sí:** sin sonido. **No:** buscar o añadir efectos por ahora.

---

## Riesgos

| Riesgo                                                                       | Mitigación                                                                                                                             |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Doble montaje en Strict Mode crea dos motores y dos bucles                   | `destroy()` en el cleanup de `GameCanvas`; criterio de aceptación sobre listeners y acción única                                       |
| Listeners de teclado persistentes tras salir de la pantalla                  | Registrados en `start()` y retirados en `destroy()`; nunca en el módulo                                                                |
| `preventDefault` en flechas y WASD rompe botones o el input del modal        | No prevenir si el foco está en `button`, `input` o `a`; el input de nombre debe seguir admitiendo flechas y letras                     |
| `ranked` y `ENGINES` se desincronizan                                        | Criterio de aceptación sobre ambos; la migración forma parte del plan                                                                  |
| El renombrado falla por la clave foránea de `scores`                         | Comprobar 0 filas de `serpentina` justo antes de aplicar; si hubiera, parar y decidir en otro paso                                     |
| Referencias residuales a `serpentina` (enlaces, `av_scores` en el navegador) | Criterio de aceptación de búsqueda en el código; `serpentina` devuelve 404 en `/salon`; las claves viejas de `localStorage` no se usan |
| Salto de `dt` al pausar o cambiar de pestaña (varios pasos de golpe)         | `dt` limitado a 50 ms, `lastTime` reiniciado al reanudar y como máximo un paso por frame                                               |
| Dos giros en el mismo paso hacen que la serpiente se muerda a sí misma       | Cola de giros de 2 y rechazo de la dirección opuesta a la última encolada                                                              |
| `fruits.png` pesa 586 KB y tarda en cargar                                   | La partida empieza sin esperar al PNG (círculo de respaldo); la carga es única por montaje y el navegador la cachea                    |
| Recortes de sprite de proporciones distintas (110–170 × 160)                 | Escalar al alto de celda conservando la proporción y centrar en la celda                                                               |
| Fruta generada bajo la serpiente o sin celdas libres                         | Elegir solo entre celdas libres; con 0 libres termina la partida                                                                       |
| Partida terminada con 0 puntos choca con el `CHECK` de `scores` (≥ 1)        | Mismo tratamiento que en SPEC 05–08 en el modal de la plataforma; no se reabre en este spec                                            |
| `shadowBlur` penaliza el rendimiento con serpientes largas                   | Brillo solo en la cabeza; el cuerpo con relleno simple                                                                                 |

---

## Qué **no** está en este spec

- Otros juegos distintos de Snake.
- Vidas, obstáculos, frutas especiales, wrap y varias frutas a la vez.
- Sprites de serpiente, filas vectorial y realista de `fruits.png`, y optimización del PNG.
- Sonido y música.
- Controles táctiles o gamepad.
- Autenticación, antitrampas y moderación de nombres.
- Tests automatizados.

Cada uno de ellos, si se aborda, va en su propio spec.
