# SPEC 07 — Juego Tetris jugable en la plataforma con ranking

> **Status:** Aprobado
> **Depends on:** SPEC 05, SPEC 06
> **Date:** 2026-10-15
> **Objective:** Portar a TypeScript el juego de `references/started-games/03-tetris` como el juego `tetris` de Arcade Vault, jugable con HUD, pausa y modal de la plataforma, y con leaderboard en `/salon/tetris`.

---

## Por qué existe este spec

Hoy el catálogo tiene `caida`, un mock de piezas sin juego real. `references/started-games/03-tetris` es un Tetris completo, pero su código no se puede insertar tal cual: usa globals de módulo (`board`, `current`, `score`…), `document.getElementById`, un listener de `keydown` sin limpieza, un HUD propio en el DOM (puntuación, líneas, nivel), un segundo canvas para la pieza siguiente, un overlay `PAUSA`/`GAME OVER` y un tema claro/oscuro con `localStorage`.

Además Tetris no encaja en el contrato de SPEC 05: el tablero es 300×600 (1:2) y no tiene vidas. Este spec añade dos extensiones **opcionales y retrocompatibles** al contrato (tamaño de canvas por juego y vidas opcionales con estadística extra de líneas). Sin ellas, `asteroides` se comporta exactamente igual.

Por decisión del usuario, `tetris` es una **entrada nueva** del catálogo: el mock `caida` queda intacto (igual que pasó con `asteroides` y `rocas`).

---

## Alcance

**Dentro:**

- Motor en `lib/games/tetris/` sin globals ni `document`, con las mecánicas del original: tablero 10×20, 8 piezas (las 7 clásicas I, O, T, S, Z, J, L más la «tuerca» N de 3×3 con hueco, elegidas al azar con probabilidad uniforme), rotación horaria con wall kicks `[0, -1, 1, -2, 2]`, pieza fantasma, caída por gravedad, bajada suave (↓), caída instantánea (Espacio), eliminación de líneas, puntuación por líneas × nivel, nivel cada 10 líneas y velocidad creciente. Fin de partida cuando una pieza nueva no cabe al aparecer.
- Auto-repeat propio del motor para ← → ↓ mantenidas (retardo inicial 170 ms, cadencia 50 ms), en lugar del auto-repeat del sistema operativo.
- Entrada `tetris: createTetrisEngine` en `ENGINES` de `lib/games/registry.ts`.
- **Extensión del contrato (opcional, retrocompatible):**
  - Tamaño lógico del canvas por juego, en metadatos de `registry.ts`. Por defecto 800×600.
  - `lives?: number` en `GameStats`: si no viene, el HUD oculta VIDAS.
  - `lines?: number` en `GameStats`: si viene, el HUD muestra LÍNEAS.
- Cambios en `components/game-canvas.tsx` (usa el tamaño del juego para `width`, `height` y la proporción) y en `components/game-player.tsx` (marco del canvas con proporción por juego, VIDAS opcional, LÍNEAS opcional).
- Pieza SIGUIENTE dibujada dentro del canvas, en un recuadro lateral a la derecha del tablero. Es el único texto del canvas (la etiqueta `SIGUIENTE`); no hay HUD ni overlays.
- Entrada nueva en `lib/games.ts`: `id: "tetris"`, título `TETRIS`, categoría `PUZZLE`, color `yellow`, textos `short`/`long` en español, y portada nueva `cover-tetris` en `app/globals.css` (distinta de `cover-tetro`).
- Leyenda de teclas en `CONTROLS` de `components/game-player.tsx`.
- Migración `supabase/migrations/<timestamp>_tetris_ranked.sql` que inserta la fila `tetris` en `games` con `ranked = true`, aplicada con `apply_migration`.
- Teclado: ← → mover, ↑ y `X` rotar, ↓ bajar, Espacio caída; `P` y `Esc` alternan la pausa; sin scroll de la página con las teclas de juego.
- Estética vectorial con acentos neón: colores y brillo tomados de los tokens del tema, sobre fondo negro.
- Nota breve en `CLAUDE.md` sobre el juego y las extensiones del contrato.

**Fuera de alcance (specs futuros):**

- Otros juegos (Arkanoid y el resto, cada uno con su spec).
- Cambiar o eliminar el mock `caida`: queda intacto, con su arena mock.
- Controles táctiles o gamepad.
- Hold (guardar pieza), cola de varias piezas siguientes, bolsa de 7 piezas (7-bag), rotación SRS, lock delay y T-spins: no existen en el original.
- Tema claro/oscuro del original (`localStorage["tetris-theme"]`): la plataforma ya tiene su tema.
- Sonido y música: el original no tiene.
- Antitrampas, autenticación y moderación de nombres (siguen como en SPEC 06).
- Tests automatizados (no hay framework configurado).

---

## Modelo de datos

- Sin tablas nuevas: `games` y `scores` ya existen (SPEC 06). El único cambio de datos es una fila nueva en `games` con `ranked = true` para `tetris`.
- Archivos del motor:

```
lib/games/tetris/engine.ts      # createTetrisEngine: bucle, estado, colisiones, input, dibujo
lib/games/tetris/entities.ts    # piezas, rotación, colisión, eliminación de líneas (funciones puras)
lib/games/tetris/constants.ts   # COLS, ROWS, BLOCK, PIECES, LINE_SCORES, DAS/ARR, canvas, colores
```

- Tipos clave del motor:

```ts
// lib/games/tetris/entities.ts
export type Board = number[][]; // ROWS × COLS; 0 = vacío, 1–8 = tipo de pieza
export interface Piece {
  type: number; // 1–8
  shape: number[][];
  x: number;
  y: number;
}
```

- Extensión del contrato (todo opcional; los valores actuales no cambian):

```ts
// lib/games/types.ts
export interface GameStats {
  score: number;
  lives?: number; // si falta, el HUD oculta VIDAS
  level: number;
  lines?: number; // si viene, el HUD muestra LÍNEAS
}

// lib/games/registry.ts
export interface EngineMeta {
  width: number; // por defecto 800
  height: number; // por defecto 600
  lives: boolean; // por defecto true
  lines: boolean; // por defecto false
}
export const ENGINE_META: Record<string, Partial<EngineMeta>> = {
  tetris: { width: 420, height: 600, lives: false, lines: true },
};
```

- Canvas lógico de Tetris: 420×600. Tablero 300×600 a la izquierda (10×20 celdas de `BLOCK = 30`), recuadro lateral de 120×600 a la derecha con la pieza SIGUIENTE (bloques de 24 px). El marco CRT usa `aspect-ratio: 420 / 600` y nunca supera el alto disponible de la ventana.
- `dt` limitado a 50 ms; `lastTime` se reinicia al reanudar.
- Velocidad de caída: `max(100, 1000 − (nivel − 1) × 90)` ms. Nivel: `floor(líneas / 10) + 1`.
- Puntuación:
  - Líneas simultáneas: 1 → 100, 2 → 300, 3 → 500, 4 → 800, multiplicado por el nivel vigente antes de subir.
  - Bajada suave con ↓: +1 por fila.
  - Caída con Espacio: +2 por celda recorrida.
  - La caída por gravedad no suma puntos.
  - Máximo práctico muy por debajo de 10 000 000 (límite del `CHECK` de `scores`).
- Colores: leídos una vez en `start()` con `getComputedStyle(canvas)` (`--cyan`, `--magenta`, `--yellow`, `--ink`), con valores por defecto en `constants.ts`. Con menos tokens que piezas, algunos colores se repiten: la forma identifica la pieza.
- Auto-repeat: el motor guarda qué teclas ← → ↓ están pulsadas y cuándo empezó cada una. Rotar (↑, `X`) y caída (Espacio) actúan solo en la pulsación, ignorando `e.repeat`. Si ↓ bloquea una pieza, la tecla exige una pulsación nueva antes de repetir sobre la pieza siguiente.

---

## Plan de implementación

Antes de cada paso se consulta la guía relevante en `node_modules/next/dist/docs/` (Client Components, `cacheComponents`, rutas dinámicas con `generateStaticParams`). La UI nueva (portada, leyenda, marco del canvas con otra proporción, recuadro SIGUIENTE) se diseña con la skill `/frontend-design`.

1. **Extensión del contrato.** Hacer opcionales `lives` y añadir `lines` en `GameStats`; añadir `ENGINE_META` en `registry.ts` (solo con la entrada de Tetris preparada, `ENGINES` sin cambios todavía); usar el tamaño y la proporción por juego en `GameCanvas` y en el marco de `GamePlayer`; ocultar VIDAS si el juego no las tiene y mostrar LÍNEAS si las tiene. Verificación: `tsc` y `npm run lint` sin errores; `/juegos/asteroides/jugar` se ve y se juega igual (800×600, VIDAS visibles, sin LÍNEAS).
2. **Constantes y entidades.** Crear `lib/games/tetris/constants.ts` y `entities.ts` con las piezas, `rotateCW`, `collide`, wall kicks, `clearLines` y `ghostY` como funciones puras que reciben el tablero por parámetro. Verificación: `tsc`.
3. **Motor.** Crear `lib/games/tetris/engine.ts`: estado en la instancia, bucle `requestAnimationFrame`, gravedad con acumulador, puntuación, nivel, auto-repeat, dibujo del tablero, fantasma y recuadro SIGUIENTE, y las operaciones de `GameEngine`. `onStats` solo cuando cambian puntuación, nivel o líneas; `onGameOver` una sola vez. `preventDefault` solo en teclas de juego y nunca con foco en `button`, `input` o `a`. Registrar `tetris` en `ENGINES`. Verificación: `tsc`.
4. **Catálogo y portada.** Añadir la entrada `tetris` a `lib/games.ts` y `.cover-tetris` a `app/globals.css`. Verificación: `/juegos` muestra la tarjeta nueva junto a `caida` y `/juegos/tetris` abre su ficha.
5. **Leyenda.** Añadir `tetris` a `CONTROLS` en `game-player.tsx` (← → mover · ↑ rotar · ↓ bajar · ESPACIO caída · P pausa). Verificación: `/juegos/tetris/jugar` muestra el canvas 420×600 y la leyenda; `/juegos/caida/jugar` sigue con la arena mock.
6. **Migración `ranked`.** Consultar el mayor `sort_order` de `games` con `execute_sql`, aplicar con `apply_migration` el `insert` de `tetris` (`title 'TETRIS'`, `cat 'PUZZLE'`, `ranked true`, `sort_order` siguiente) y guardar el archivo en `supabase/migrations/`. Verificación: `select id, ranked from public.games order by sort_order;` devuelve `ranked = true` solo para las claves de `ENGINES`; `get_advisors` sin avisos nuevos.
7. **Partida completa.** Jugar hasta el game over, guardar la puntuación y comprobar la fila en `/salon/tetris` y en `/salon`. Verificación: el modal muestra la puntuación real y la fila aparece en ambos rankings.
8. **Pulido y responsive.** Revisar a 375, 768 y 1280 px el marco 420:600, el brillo y el recuadro SIGUIENTE. Verificación: sin scroll horizontal a 375 px y sin que el canvas desborde el alto en 1280×720.
9. **Documentación.** Añadir a `CLAUDE.md` una nota de `lib/games/tetris/`, `ENGINE_META` y los campos opcionales de `GameStats`. Verificación: `git diff` solo contiene archivos de este spec.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] Existen `lib/games/tetris/{engine,entities,constants}.ts` y ninguno referencia `document` ni variables globales de estado.
- [ ] `tetris` está en `ENGINES` y `ranked = true` en `games`; ambos coinciden con las demás claves y filas.
- [ ] `lib/games.ts` contiene la entrada `tetris` (PUZZLE, yellow) y `/juegos` la muestra con la portada `cover-tetris`, distinta de `cover-tetro`.
- [ ] La entrada `caida` no cambia y su pantalla de juego sigue usando la arena mock.
- [ ] `/juegos/tetris/jugar` renderiza el canvas del juego y no la arena mock.
- [ ] El canvas es de 420×600 lógicos y su marco conserva la proporción 420:600.
- [ ] El tablero es de 10×20 y aparecen las 8 piezas, incluida la tuerca N.
- [ ] ← y → mueven la pieza una celda; mantenerlas pulsadas repite tras ~170 ms a ~50 ms por celda.
- [ ] ↑ y `X` rotan en sentido horario; junto a una pared o pieza la rotación aplica el wall kick de ±1 o ±2 si cabe y, si no cabe, no rota.
- [ ] ↓ baja una fila y suma 1 punto; mantenida repite; al bloquear una pieza no baja la siguiente sin una pulsación nueva.
- [ ] Espacio deja caer la pieza al instante, suma 2 puntos por celda recorrida y la bloquea.
- [ ] La pieza fantasma se dibuja translúcida en la posición de aterrizaje.
- [ ] Limpiar 1, 2, 3 y 4 líneas a la vez suma 100, 300, 500 y 800 multiplicado por el nivel.
- [ ] El nivel sube cada 10 líneas y el intervalo de caída pasa a `max(100, 1000 − (nivel − 1) × 90)` ms.
- [ ] El HUD de la plataforma muestra PUNTUACIÓN, NIVEL y LÍNEAS reales al instante, y no muestra VIDAS.
- [ ] El recuadro SIGUIENTE muestra la pieza que aparecerá a continuación y coincide con la siguiente pieza real.
- [ ] El canvas no dibuja HUD ni texto `GAME OVER`; su único texto es la etiqueta `SIGUIENTE`.
- [ ] Cuando una pieza nueva no cabe se abre el modal `FIN DEL JUEGO` con la puntuación real y el motor se detiene.
- [ ] El botón FIN termina la partida con la puntuación actual; `JUGAR DE NUEVO` empieza otra con 0 puntos, nivel 1, 0 líneas y tablero vacío.
- [ ] PAUSA, `P` y `Esc` detienen la caída y el input, y al reanudar la pieza no salta.
- [ ] Las flechas y Espacio durante la partida no hacen scroll de la página ni activan un botón enfocado.
- [ ] `GUARDAR PUNTUACIÓN` inserta una fila en `scores` con `game_id = 'tetris'`, el nombre en mayúsculas y la puntuación real, y no escribe en `localStorage["av_scores"]`.
- [ ] La fila aparece en `/salon/tetris` y suma en `/salon`; hay una pestaña `TETRIS` en el salón.
- [ ] `/juegos` y `/juegos/tetris` muestran `best` y `plays` desde `game_stats`.
- [ ] `/salon/tetris` responde 200 y los ids sin motor (incluido `caida`) siguen en 404.
- [ ] Al salir de la pantalla de juego no quedan listeners ni `requestAnimationFrame`: tras volver, una pulsación de ← mueve la pieza una sola celda.
- [ ] Recargar `/juegos/tetris/jugar` no produce errores de hidratación ni en la consola.
- [ ] A 375 px no hay scroll horizontal y el canvas conserva su proporción.
- [ ] `asteroides` se comporta exactamente igual: canvas 800×600, VIDAS visibles, sin LÍNEAS.
- [ ] `CLAUDE.md` documenta el juego y las extensiones del contrato.

---

## Decisiones

- **Sí:** entrada nueva `tetris` (decisión del usuario), con `caida` intacta. **No:** reutilizar `caida`, que se resolverá en otro spec si hace falta.
- **Sí:** HUD, pausa y modal de la plataforma; el motor solo emite datos. **No:** HUD, overlays `PAUSA`/`GAME OVER` ni reinicio por tecla en el canvas.
- **Sí:** guardado en `scores` solo para juegos con motor. **No:** `localStorage` para este juego.
- **Sí:** estética neón desde los tokens del tema. **No:** copiar la paleta pastel del original ni su tema claro/oscuro.
- **Sí:** tamaño de canvas por juego en `ENGINE_META` (420×600). Evita deformar un tablero 1:2 dentro de 800×600 y deja a Arkanoid usar su tamaño. **No:** mantener 800×600 con el tablero centrado y paneles decorativos.
- **Sí:** `lives?` opcional y `lines?` como estadística extra en el HUD. Tetris no tiene vidas y las líneas son su medida natural de progreso. **No:** vidas ficticias, ni ocultar las líneas, ni dibujarlas en el canvas.
- **Sí:** la pieza SIGUIENTE dentro del canvas, porque el contrato solo ofrece un canvas. **No:** segundo canvas ni campo nuevo del contrato para la pieza siguiente.
- **Sí:** las 8 piezas, con la tuerca N, y elección uniforme al azar como el original. **No:** quitar la tuerca ni pasar a 7-bag.
- **Sí:** auto-repeat propio del motor (170 ms / 50 ms) para cadencia consistente entre equipos. **No:** depender del auto-repeat del sistema.
- **Sí:** reglas del original: wall kicks simples, fantasma, puntuación `100/300/500/800 × nivel`, +1 por fila en bajada suave y +2 por celda en caída. **No:** hold, SRS, lock delay ni T-spins.
- **Sí:** teclado del original más `X` para rotar, y `P`/`Esc` para pausar. **No:** controles táctiles (otro spec).
- **Sí:** fila de `games` creada por la migración de este spec, ya con `ranked = true`. **No:** crear la fila sin ranking y activarla después.
- **Sí:** sin sonido, como el original. **No:** añadir audio.

---

## Riesgos

| Riesgo                                                                   | Mitigación                                                                                                          |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Doble montaje en Strict Mode crea dos motores y dos bucles               | `destroy()` en el cleanup de `GameCanvas`; criterio de aceptación sobre listeners y acción única                    |
| Listeners de teclado persistentes tras salir de la pantalla              | Registrados en `start()` y retirados en `destroy()`; nunca en el módulo                                             |
| `preventDefault` en flechas o Espacio rompe botones o el input del modal | No prevenir si el foco está en `button`, `input` o `a`; el input de nombre debe seguir admitiendo espacios          |
| `ranked` y `ENGINES` se desincronizan                                    | Criterio de aceptación sobre ambos; la migración forma parte del plan                                               |
| Salto de `dt` al pausar o cambiar de pestaña                             | `dt` limitado a 50 ms y `lastTime` reiniciado al reanudar                                                           |
| La extensión del contrato cambia a `asteroides` sin querer               | Todo opcional con valores por defecto iguales a los actuales; verificación explícita al final del paso 1 y criterio |
| Marco 420:600 desborda el alto de pantalla en portátiles o móviles       | Limitar el alto del marco al alto disponible y centrarlo; revisión a 375, 768 y 1280×720 en el paso 8               |
| ↓ mantenida bloquea piezas en cadena sin querer                          | Tras un bloqueo por ↓ se exige una pulsación nueva; criterio de aceptación                                          |
| Partida terminada con 0 puntos choca con el `CHECK` de `scores` (≥ 1)    | Mismo tratamiento que en SPEC 05/06 en el modal de la plataforma; no se reabre en este spec                         |
| Pocos tokens de color para 8 piezas                                      | Colores repetidos permitidos; la forma identifica la pieza y el fantasma mantiene su color                          |
| `shadowBlur` penaliza el rendimiento con 200 celdas                      | Brillo solo en la pieza activa y el fantasma; los bloques fijados con relleno simple                                |

---

## Qué **no** está en este spec

- Otros juegos distintos de Tetris (Arkanoid, etc.).
- Cambios en el mock `caida`.
- Hold, siguientes múltiples, 7-bag, SRS, lock delay y T-spins.
- Tema claro/oscuro propio, sonido y música.
- Controles táctiles o gamepad.
- Autenticación, antitrampas y moderación de nombres.
- Tests automatizados.

Cada uno de ellos, si se aborda, va en su propio spec.
