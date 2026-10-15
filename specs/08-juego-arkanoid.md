# SPEC 08 — Juego Arkanoid jugable en la plataforma con ranking

> **Status:** Implementado
> **Depends on:** SPEC 05, SPEC 06, SPEC 07
> **Date:** 2026-10-15
> **Objective:** Portar a TypeScript el juego de `references/started-games/04-arkanoid` como el juego `arkanoid` de Arcade Vault, jugable con HUD, pausa y modal de la plataforma, y con leaderboard en `/salon/arkanoid`.

---

## Por qué existe este spec

Hoy el catálogo tiene `bloque-buster`, un mock de rebote de pelota sin juego real. `references/started-games/04-arkanoid` es un Arkanoid completo (5 niveles, 3 vidas, explosiones y sonidos), pero su código no se puede insertar tal cual: usa globals de módulo (`paddle`, `ball`, `blocks`, `score`, `lives`…), `document.getElementById`, listeners de `keydown` y `keyup` en `document` sin limpieza, un HUD dibujado en el canvas (puntuación, nivel y vidas), overlays `PAUSA`/`GAME OVER`/`¡Completaste el juego!` con un selector de nivel clicable, un spritesheet PNG con paleta propia y sonidos creados con `new Audio('assets/…')` sin liberar.

Arkanoid encaja en el contrato actual: canvas 800×600 (valor por defecto), con vidas y nivel. **No hay extensión del contrato.** Por eso no se toca `ENGINE_META` (800×600, `lives: true`, `lines: false` ya son los valores por defecto) y `asteroides` y `tetris` no se ven afectados.

Por decisión del usuario, `arkanoid` es una **entrada nueva** del catálogo: el mock `bloque-buster` queda intacto (igual que pasó con `asteroides`/`rocas` y `tetris`/`caida`).

---

## Alcance

**Dentro:**

- Motor en `lib/games/arkanoid/` sin globals ni `document`, con las mecánicas del original:
  - Pala que se mueve con ← → (400 px/s) y con el ratón sobre el canvas.
  - Una pelota que rebota en paredes izquierda, derecha y techo, y en la pala.
  - Rejilla de bloques de 10 columnas × 6 filas máximo, con 5 niveles de patrones distintos (rectángulo, pirámide, ajedrez, huecos y marco con cruz).
  - Un bloque destruido por frame, con +10 puntos y rebote vertical.
  - Velocidad de la pelota por nivel ×1.00 / ×1.10 / ×1.21 / ×1.33 / ×1.46.
  - 3 vidas: la pelota que cae por debajo del canvas resta una y reaparece sobre la pala.
  - Animación de explosión del bloque de 150 ms.
  - Fin de partida al perder la última vida o al limpiar el nivel 5.
- Sonido: los dos efectos del original (rebote y rotura) copiados a `public/games/arkanoid/sounds/` y reproducidos con `HTMLAudioElement` creado dentro del motor.
- Entrada `arkanoid: createArkanoidEngine` en `ENGINES` de `lib/games/registry.ts`.
- Entrada nueva en `lib/games.ts`: `id: "arkanoid"`, título `ARKANOID`, categoría `ARCADE`, color `magenta`, textos `short`/`long` en español, y portada nueva `cover-arkanoid` en `app/globals.css` (distinta de `cover-bricks`).
- Leyenda de teclas en `CONTROLS` de `components/game-player.tsx`.
- Migración `supabase/migrations/<timestamp>_arkanoid_ranked.sql` que inserta la fila `arkanoid` en `games` con `ranked = true`, aplicada con `apply_migration`.
- Controles: ← → mueven la pala, el ratón la sigue sobre el canvas; `P` y `Esc` alternan la pausa; sin scroll de la página con las flechas.
- Estética vectorial con acentos neón: pala, pelota, bloques y explosiones dibujados con rectángulos y brillo tomados de los tokens del tema, sobre fondo negro.
- Nota breve en `CLAUDE.md` sobre el juego.

**Fuera de alcance (specs futuros):**

- Otros juegos (cada uno con su spec).
- Cambiar o eliminar el mock `bloque-buster`: queda intacto, con su arena mock.
- Spritesheet `spritesheet-breakout.png` y `spritesheet.js`: no se portan; todo se redibuja en vectorial.
- Selector de nivel de la pausa (`Saltar al nivel`): era una ayuda de desarrollo y se descarta.
- Ángulo de rebote según el punto de impacto en la pala, power-ups, bloques de varios golpes, bonus por vidas restantes y saque manual de la pelota: no existen en el original.
- Controles táctiles o gamepad.
- Música (el original solo tiene dos efectos).
- Antitrampas, autenticación y moderación de nombres (siguen como en SPEC 06).
- Tests automatizados (no hay framework configurado).

---

## Modelo de datos

- Sin tablas nuevas: `games` y `scores` ya existen (SPEC 06). El único cambio de datos es una fila nueva en `games` con `ranked = true` para `arkanoid`.
- Sin extensión del contrato: `GameStats` se emite con `score`, `lives` y `level`; no se usa `lines`.
- Archivos del motor:

```
lib/games/arkanoid/engine.ts      # createArkanoidEngine: bucle, estado, colisiones, input, sonido, dibujo
lib/games/arkanoid/entities.ts    # tipos Paddle, Ball, Block, Explosion y funciones puras (colisión AABB, construcción de niveles)
lib/games/arkanoid/constants.ts   # canvas, tamaños, velocidades, LEVELS, colores por defecto, rutas de sonido
public/games/arkanoid/sounds/ball-bounce.mp3
public/games/arkanoid/sounds/break-sound.mp3
```

- Tipos clave del motor:

```ts
// lib/games/arkanoid/entities.ts
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Ball extends Rect {
  vx: number;
  vy: number;
}
export interface Block extends Rect {
  color: BlockColor;
  alive: boolean;
}
export interface Explosion extends Rect {
  color: BlockColor;
  elapsed: number;
} // ms
export type BlockColor =
  "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green" | "gray";

// lib/games/arkanoid/constants.ts
export interface LevelDef {
  speed: number;
  cells: { col: number; row: number; color: BlockColor }[];
}
export const LEVELS: LevelDef[]; // 5 niveles, mismos patrones que levels.js
```

- Canvas lógico 800×600 (por defecto del contrato). Origen arriba a la izquierda, unidades en píxeles lógicos. `dt` limitado a 50 ms y `lastTime` reiniciado al reanudar.
- Geometría (la del original): pala 81×14 en `y = 560`, pelota 16×16, bloque 64×24, rejilla de 10 columnas centrada (`x₀ = 80`) desde `y = 80`.
- Pelota: velocidad base `vx = 200`, `vy = −300` multiplicada por la velocidad del nivel. Al empezar partida, al cambiar de nivel y al perder una vida aparece centrada sobre la pala y se mueve de inmediato (como el original).
- Bloques por nivel: 60, 40, 30, 39 y 39 (208 en total).
- Puntuación: +10 por bloque destruido, sin bonus. Máximo posible 2 080, muy por debajo de 10 000 000 (límite del `CHECK` de `scores`).
- Nivel emitido en `onStats` = nivel 1–5 vigente. `restart()` deja score 0, 3 vidas y nivel 1.
- Colores: las claves de color de bloque se asignan a los tokens del tema leídos una vez en `start()` con `getComputedStyle(canvas)` (`--cyan`, `--magenta`, `--yellow`, `--green` si existe, `--ink`), con valores por defecto en `constants.ts`. `red`, `hotpink` y `gray` se derivan o se fijan en `constants.ts` si el tema no los define. Los colores repetidos son aceptables: el patrón del nivel y la fila identifican los bloques.
- Sonido: dos `HTMLAudioElement` creados en `start()` con URL `/games/arkanoid/sounds/…`. Cada reproducción usa `cloneNode()` (varias a la vez) o reinicia `currentTime`. No se reproduce nada en pausa. En `destroy()` se pausan y se sueltan las referencias. Los fallos de carga o `play()` rechazado se capturan y se ignoran.
- Ratón: `mousemove` registrado sobre el canvas en `start()` y retirado en `destroy()`; convierte `clientX` a coordenadas lógicas con `getBoundingClientRect()` y limita la pala a `[0, 800 − w]`. Se ignora en pausa.

---

## Plan de implementación

Antes de cada paso se consulta la guía relevante en `node_modules/next/dist/docs/` (Client Components, `public/`, `cacheComponents`, rutas dinámicas con `generateStaticParams`). La UI nueva (portada, leyenda) se diseña con la skill `/frontend-design`.

1. **Constantes y entidades.** Crear `lib/games/arkanoid/constants.ts` (geometría, velocidades, `LEVELS` con los 5 patrones de `levels.js`, colores por defecto, rutas de sonido) y `entities.ts` (tipos y funciones puras: `collideAABB`, construcción de los bloques de un nivel). Verificación: `tsc` sin errores.
2. **Sonidos.** Copiar `ball-bounce.mp3` y `break-sound.mp3` de `references/started-games/04-arkanoid/assets/sounds/` a `public/games/arkanoid/sounds/`. Verificación: `/games/arkanoid/sounds/ball-bounce.mp3` responde 200 con el servidor de desarrollo.
3. **Motor.** Crear `lib/games/arkanoid/engine.ts`: estado en la instancia, bucle `requestAnimationFrame`, movimiento de pala por teclado y ratón, pelota, colisiones, explosiones, niveles, vidas, sonido y dibujo vectorial (bloques, pala, pelota, explosiones, fondo negro, sin HUD ni overlays). Implementar `start`/`pause`/`resume`/`restart`/`end`/`destroy`. `onStats` solo cuando cambian puntuación, vidas o nivel; `onGameOver` una sola vez (0 vidas, limpiar el nivel 5 o `end()`). `preventDefault` solo en ← → y nunca con foco en `button`, `input` o `a`. Verificación: `tsc`.
4. **Registro.** Añadir `arkanoid: createArkanoidEngine` a `ENGINES` en `lib/games/registry.ts` (sin tocar `ENGINE_META`). Verificación: `tsc`; `asteroides` y `tetris` siguen igual.
5. **Catálogo y portada.** Añadir la entrada `arkanoid` a `lib/games.ts` y `.cover-arkanoid` a `app/globals.css`. Verificación: `/juegos` muestra la tarjeta nueva junto a `bloque-buster` y `/juegos/arkanoid` abre su ficha.
6. **Leyenda.** Añadir `arkanoid` a `CONTROLS` en `game-player.tsx` (← → o RATÓN mover · P pausa). Verificación: `/juegos/arkanoid/jugar` muestra el canvas 800×600 y la leyenda; `/juegos/bloque-buster/jugar` sigue con la arena mock.
7. **Migración `ranked`.** Consultar el mayor `sort_order` de `games` con `execute_sql`, aplicar con `apply_migration` el `insert` de `arkanoid` (`title 'ARKANOID'`, `cat 'ARCADE'`, `ranked true`, `sort_order` siguiente) y guardar el archivo en `supabase/migrations/`. Verificación: `select id, ranked from public.games order by sort_order;` devuelve `ranked = true` solo para las claves de `ENGINES`; `get_advisors` sin avisos nuevos.
8. **Partida completa.** Jugar hasta el game over, guardar la puntuación y comprobar la fila en `/salon/arkanoid` y en `/salon`. Verificación: el modal muestra la puntuación real y la fila aparece en ambos rankings.
9. **Pulido y responsive.** Revisar a 375, 768 y 1280 px el marco 4:3, el brillo y la legibilidad de la pelota. Verificación: sin scroll horizontal a 375 px.
10. **Documentación.** Añadir a `CLAUDE.md` una nota de `lib/games/arkanoid/` y de `public/games/arkanoid/`. Verificación: `git diff` solo contiene archivos de este spec.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] Existen `lib/games/arkanoid/{engine,entities,constants}.ts` y ninguno referencia `document` ni variables globales de estado.
- [ ] `arkanoid` está en `ENGINES` y `ranked = true` en `games`; ambos coinciden con las demás claves y filas.
- [ ] `lib/games.ts` contiene la entrada `arkanoid` (ARCADE, magenta) y `/juegos` la muestra con la portada `cover-arkanoid`, distinta de `cover-bricks`.
- [ ] La entrada `bloque-buster` no cambia y su pantalla de juego sigue usando la arena mock.
- [ ] `/juegos/arkanoid/jugar` renderiza el canvas del juego y no la arena mock.
- [ ] El canvas es de 800×600 lógicos y no hay entrada de `arkanoid` en `ENGINE_META`.
- [ ] ← y → mueven la pala a 400 px/s sin salir del canvas; el ratón sobre el canvas la sigue con la misma limitación.
- [ ] La pelota rebota en las paredes izquierda, derecha y techo y en la pala, y una pelota que baja de `y = 600` resta una vida.
- [ ] Destruir un bloque suma exactamente 10 puntos, lo elimina e invierte la velocidad vertical de la pelota; en un frame se destruye como máximo un bloque.
- [ ] Al destruir un bloque se ve una explosión de unos 150 ms en su posición y luego desaparece.
- [ ] Los 5 niveles tienen 60, 40, 30, 39 y 39 bloques con los patrones de `levels.js`, y la velocidad de la pelota es ×1.00, ×1.10, ×1.21, ×1.33 y ×1.46 la base.
- [ ] Al destruir el último bloque de un nivel (1 a 4) se carga el siguiente con la pelota sobre la pala y el HUD muestra el nivel nuevo.
- [ ] Al destruir el último bloque del nivel 5 se abre el modal `FIN DEL JUEGO` con la puntuación real y el motor se detiene.
- [ ] El HUD de la plataforma muestra PUNTUACIÓN, VIDAS (empieza en 3) y NIVEL reales al instante, y no muestra LÍNEAS.
- [ ] Al perder la tercera vida se abre el modal `FIN DEL JUEGO` con la puntuación real y el motor se detiene.
- [ ] El botón FIN termina la partida con la puntuación actual; `JUGAR DE NUEVO` empieza otra con 0 puntos, 3 vidas, nivel 1 y el nivel 1 completo.
- [ ] PAUSA, `P` y `Esc` detienen la pelota, la pala, las explosiones y el sonido, y al reanudar la pelota no salta; el ratón no mueve la pala en pausa.
- [ ] Las flechas durante la partida no hacen scroll de la página ni activan un botón enfocado.
- [ ] El rebote y la rotura de bloques reproducen su sonido; si los archivos no cargan o el navegador bloquea el audio, la partida sigue sin errores en consola.
- [ ] El canvas no dibuja HUD, texto `GAME OVER`/`PAUSA` ni selector de nivel; no contiene texto.
- [ ] `GUARDAR PUNTUACIÓN` inserta una fila en `scores` con `game_id = 'arkanoid'`, el nombre en mayúsculas y la puntuación real, y no escribe en `localStorage["av_scores"]`.
- [ ] La fila aparece en `/salon/arkanoid` y suma en `/salon`; hay una pestaña `ARKANOID` en el salón.
- [ ] `/juegos` y `/juegos/arkanoid` muestran `best` y `plays` desde `game_stats`.
- [ ] `/salon/arkanoid` responde 200 y los ids sin motor (incluido `bloque-buster`) siguen en 404.
- [ ] Al salir de la pantalla de juego no quedan listeners (teclado ni ratón), audio ni `requestAnimationFrame`: tras volver, una pulsación de ← mueve la pala una sola vez por frame.
- [ ] Recargar `/juegos/arkanoid/jugar` no produce errores de hidratación ni en la consola.
- [ ] A 375 px no hay scroll horizontal y el canvas conserva su proporción.
- [ ] `asteroides` y `tetris` se comportan exactamente igual.
- [ ] `CLAUDE.md` documenta el juego.

---

## Decisiones

- **Sí:** entrada nueva `arkanoid` (decisión del usuario), con `bloque-buster` intacto. **No:** reutilizar `bloque-buster`, que se resolverá en otro spec si hace falta.
- **Sí:** HUD, pausa y modal de la plataforma; el motor solo emite datos. **No:** HUD, overlays `PAUSA`/`GAME OVER`/`¡Completaste el juego!` ni reinicio en el canvas.
- **Sí:** guardado en `scores` solo para juegos con motor. **No:** `localStorage` para este juego.
- **Sí:** estética neón vectorial desde los tokens del tema, sin spritesheet (decisión del usuario). **No:** portar `spritesheet-breakout.png` ni copiar la paleta del original; evita un PNG de 30 KB, un estado de carga y una estética distinta del resto de la plataforma.
- **Sí:** sin extensión del contrato; Arkanoid usa 800×600, vidas y nivel como `asteroides`. **No:** tocar `ENGINE_META` ni `GameStats`.
- **Sí:** portar los dos efectos de sonido a `public/games/arkanoid/sounds/` (decisión del usuario), con `HTMLAudioElement` dentro del motor, silencio en pausa y liberación en `destroy()`. **No:** música, `AudioContext` ni un gestor de sonido global.
- **Sí:** control con ← → y con ratón (decisión del usuario), manteniendo el comportamiento del original. **No:** táctil ni gamepad.
- **Sí:** completar el nivel 5 termina la partida con `onGameOver` y la puntuación (decisión del usuario). **No:** niveles infinitos más rápidos ni pantalla de victoria propia en el canvas.
- **Sí:** física idéntica al original: rebote vertical invertido en bloque y pala, `vx` constante, un bloque por frame. **No:** ángulo según el impacto en la pala (puede ser otro spec).
- **Sí:** reglas del original: 3 vidas, +10 por bloque, sin bonus. **No:** bonus por vidas, power-ups ni bloques resistentes.
- **Sí:** la pelota se mueve de inmediato al aparecer, como el original. **No:** saque manual con tecla.
- **Sí:** descartar el selector de nivel de la pausa; es una ayuda de desarrollo y rompería el ranking (permitiría saltar al nivel 5). **No:** portarlo.
- **Sí:** fila de `games` creada por la migración de este spec, ya con `ranked = true`. **No:** crear la fila sin ranking y activarla después.

---

## Riesgos

| Riesgo                                                                     | Mitigación                                                                                                              |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Doble montaje en Strict Mode crea dos motores, dos bucles y dos audios     | `destroy()` en el cleanup de `GameCanvas`; criterio de aceptación sobre listeners y acción única                        |
| Listeners de teclado y ratón persistentes tras salir de la pantalla        | Registrados en `start()` y retirados en `destroy()`; nunca en el módulo                                                 |
| `preventDefault` en flechas rompe botones o el input del modal             | No prevenir si el foco está en `button`, `input` o `a`; el input de nombre debe seguir admitiendo flechas               |
| `ranked` y `ENGINES` se desincronizan                                      | Criterio de aceptación sobre ambos; la migración forma parte del plan                                                   |
| Salto de `dt` al pausar o cambiar de pestaña (la pelota atraviesa bloques) | `dt` limitado a 50 ms y `lastTime` reiniciado al reanudar                                                               |
| El navegador bloquea el audio hasta la primera interacción                 | El primer sonido llega tras pulsar una tecla o mover el ratón; `play()` rechazado se captura y se ignora                |
| Ratón y teclado compiten por la pala                                       | Gana la última entrada: el ratón fija `x` en `mousemove` y las flechas suman desplazamiento por frame, como el original |
| Partida terminada con 0 puntos choca con el `CHECK` de `scores` (≥ 1)      | Mismo tratamiento que en SPEC 05/06/07 en el modal de la plataforma; no se reabre en este spec                          |
| Muchos `cloneNode()` de audio acumulados                                   | Reutilizar los clones solo mientras suenan y soltarlos en `destroy()`; los efectos duran menos de un segundo            |
| `shadowBlur` penaliza el rendimiento con hasta 60 bloques                  | Brillo solo en pala, pelota y explosiones; los bloques con relleno simple                                               |
| Paleta del tema sin rojo, verde o rosa para las 6 filas                    | Valores por defecto en `constants.ts`; colores repetidos aceptables                                                     |

---

## Qué **no** está en este spec

- Otros juegos distintos de Arkanoid.
- Cambios en el mock `bloque-buster`.
- Spritesheet, selector de nivel, power-ups, ángulo de rebote por impacto, bonus por vidas y saque manual.
- Música y gestor de sonido global.
- Controles táctiles o gamepad.
- Autenticación, antitrampas y moderación de nombres.
- Tests automatizados.

Cada uno de ellos, si se aborda, va en su propio spec.
