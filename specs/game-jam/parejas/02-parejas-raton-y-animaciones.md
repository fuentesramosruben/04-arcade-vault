# SPEC XX — Parejas: ratón, animación de volteo y destellos

> **Status:** Borrador
> **Depends on:** SPEC 05, SPEC 06, SPEC 07, SPEC XX-01
> **Date:** 2026-10-18
> **Objective:** Añadir a `parejas` el control con ratón sobre el canvas, una animación de volteo de 150 ms y un destello al emparejar, sin cambiar reglas, tiempos ni puntuación.

---

## Por qué existe este spec

El SPEC XX-01 deja `parejas` jugable solo con teclado y con cambios de estado instantáneos: una carta pasa de boca abajo a boca arriba de un fotograma a otro. En un juego de cartas el ratón es lo natural (Arkanoid ya lo admite) y el volteo instantáneo se lee mal en los fallos de 700 ms. Este spec lo mejora sin tocar la lógica: la animación es solo visual y el ratón dispara las mismas acciones que el teclado.

No hay extensión del contrato ni cambios fuera de `lib/games/parejas/`. El resto de juegos y el resultado de una partida con teclado (puntos, fases y tiempos) son exactamente los del SPEC XX-01.

---

## Alcance

**Dentro:**

- Ratón sobre el canvas:
  - Mover el ratón sobre una carta mueve el cursor a esa carta.
  - Clic izquierdo equivale a Espacio sobre la carta bajo el puntero.
  - El teclado sigue funcionando y puede combinarse con el ratón.
- Animación de volteo: la carta se estrecha en horizontal (`scaleX` 1 → 0) en 75 ms y se ensancha mostrando la otra cara en otros 75 ms (150 ms en total). Se aplica al voltear, al volver boca abajo tras un fallo y en la vista previa.
- Destello al emparejar: sobre cada carta de la pareja, 8 rayos cortos que salen del centro durante 400 ms y se desvanecen, con el color de la cara.
- Estado visual independiente de la lógica: las animaciones no bloquean el input ni alargan ninguna fase.
- Leyenda de teclas en `CONTROLS`: se añade "CLIC · voltear" si el diseño de la leyenda lo admite sin cambiar su estructura.
- Nota breve en `CLAUDE.md`.

**Fuera de alcance (specs futuros):**

- Cartas especiales (SPEC XX-03).
- Sonido y música.
- Controles táctiles, gestos o gamepad (el evento `pointer` táctil no se trata de forma específica).
- Partículas en otros eventos (fin de nivel, fin de partida, fallo).
- Cambios en reglas, tiempos, niveles o puntuación del SPEC XX-01.
- Cambios en `GameCanvas`, `GamePlayer` o el contrato.
- Antitrampas, autenticación y moderación de nombres.
- Tests automatizados.

---

## Modelo de datos

- Sin tablas, sin migración y sin cambios en `registry.ts` ni en `lib/games.ts`.
- Archivos tocados: `lib/games/parejas/engine.ts`, `entities.ts` y `constants.ts`.
- Tipos nuevos:

```ts
// lib/games/parejas/entities.ts
export interface CardAnim {
  flip: number; // 0..1, progreso de la animación de volteo; 1 = terminada
  flipTo: "up" | "down"; // cara que se está mostrando al final
  burst: number; // ms restantes del destello; 0 = sin destello
}
export function cardAt(x: number, y: number, layout: BoardLayout): number; // índice o -1
export function flipScale(progress: number): number; // |1 − 2 × progress|

// lib/games/parejas/constants.ts
export const FLIP_MS = 150;
export const BURST_MS = 400;
export const BURST_RAYS = 8;
```

- `CardAnim` vive en un array paralelo a `cards` dentro de la instancia del motor; `Card` no cambia.
- `BoardLayout` es el objeto ya calculado por el SPEC XX-01 para dibujar (origen, lado `S`, separación 12 px, filas y columnas); se extrae a una función pura `getLayout(level)` en `entities.ts` para compartirlo entre dibujo y ratón.
- Conversión del puntero: `x = (clientX − rect.left) × canvas.width / rect.width` y análogo en `y`, con `rect = canvas.getBoundingClientRect()`. Funciona con cualquier escala del marco CRT.
- Animación de volteo: `flipScale(p)` es 1 en `p = 0`, 0 en `p = 0.5` y 1 en `p = 1`. El ancho dibujado es `S × flipScale(p)`, centrado en la carta. Para `p < 0.5` se dibuja la cara anterior y para `p ≥ 0.5` la nueva. `p` avanza `dt / FLIP_MS` y se limita a 1.
- Destello: 8 rayos a ángulos `k × 45°`, de longitud `S × (0.15 + 0.35 × t)` con `t = 1 − burst / BURST_MS`, trazo de 3 px y opacidad `1 − t`, `shadowBlur` 8. Como máximo 2 destellos simultáneos por pareja (16 rayos) y solo hasta 400 ms.
- Listeners: `mousemove` y `mousedown` registrados sobre el `canvas` en `start()` y retirados en `destroy()`. Solo el botón 0. No se llama a `preventDefault` en `mousemove`; en `mousedown` solo para evitar la selección de texto y nunca si el foco previo está en `button`, `input` o `a`.
- El clic y el movimiento se ignoran en las fases donde el teclado no permite voltear (`preview`, `reveal`, `clear`, `over`); el cursor sí sigue al ratón en `reveal`.
- Los tiempos de fase del SPEC XX-01 (700 ms de fallo, 800 ms de transición, vista previa) no cambian: el motor decide por estado lógico y la animación solo lo dibuja con retraso visual de como máximo 150 ms.

---

## Plan de implementación

Antes de cada paso se consulta la guía relevante en `node_modules/next/dist/docs/` si se toca algo de Next. La leyenda se diseña con `/frontend-design`.

1. **Disposición compartida.** Extraer `getLayout(level)` y `cardAt` a `entities.ts`; el dibujo existente usa `getLayout`. Verificación: `tsc`; el tablero se ve idéntico al del SPEC XX-01 en los 6 niveles.
2. **Animación de volteo.** Añadir `CardAnim`, `flipScale` y el array de animaciones al motor; disparar al voltear, al ocultar y en la vista previa. Verificación: al voltear una carta se ve el estrechamiento en unos 150 ms y el fallo de 700 ms sigue durando 700 ms (medir con el temporizador del motor, sin tocar su valor).
3. **Destello.** Dibujar el destello al emparejar con los valores de `BURST_*`. Verificación: tras una pareja aparecen 8 rayos por carta que se desvanecen en 400 ms y no quedan restos.
4. **Ratón.** Registrar `mousemove` y `mousedown` en el canvas con la conversión de coordenadas. Verificación: el cursor sigue al puntero y el clic voltea; en 375 px el clic cae sobre la carta correcta.
5. **Leyenda y limpieza.** Ajustar `CONTROLS` si procede y comprobar `destroy()`. Verificación: al salir y volver, un clic produce un solo volteo.
6. **Documentación.** Nota en `CLAUDE.md`. Verificación: `git diff` solo contiene archivos de este spec.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] Mover el ratón sobre una carta lleva el cursor a esa carta; el teclado sigue moviéndolo.
- [ ] Clic izquierdo sobre una carta boca abajo la voltea; el clic derecho y el central no hacen nada.
- [ ] Clic en `preview`, `reveal` o `clear`, sobre una carta ya boca arriba o fuera de las cartas, no tiene efecto.
- [ ] El clic sobre una carta funciona en 375, 768 y 1280 px (la carta volteada es la que está bajo el puntero).
- [ ] El volteo se anima en 150 ms y las cartas vuelven boca abajo con la misma animación.
- [ ] La animación no retrasa ni bloquea el volteo de la segunda carta ni cambia la duración de ninguna fase.
- [ ] Al emparejar sale un destello de 8 rayos por carta de 400 ms con el color de la cara, y desaparece del todo.
- [ ] Una partida con teclado da la misma puntuación que con el SPEC XX-01 para la misma secuencia de aciertos y fallos.
- [ ] PAUSA, `P` y `Esc` congelan también las animaciones y el destello; al reanudar no hay salto.
- [ ] El canvas sigue sin contener texto.
- [ ] Al salir de la pantalla de juego no quedan listeners de teclado ni de ratón: tras volver, un clic produce un solo volteo.
- [ ] Recargar `/juegos/parejas/jugar` no produce errores de hidratación ni en la consola.
- [ ] No hay cambios en `registry.ts`, `lib/games.ts`, migraciones ni componentes de la plataforma; `asteroides`, `tetris`, `arkanoid` y `snake` se comportan exactamente igual.
- [ ] `CLAUDE.md` documenta el ratón y las animaciones.

---

## Decisiones

- **Sí:** el ratón ejecuta las mismas acciones que el teclado (propuesta del agente, revisar). **No:** reglas distintas por dispositivo.
- **Sí:** animación puramente visual con 150 ms. **No:** esperar a que acabe para aceptar la siguiente acción: haría más lento a quien juega rápido.
- **Sí:** la lógica decide por estado y el dibujo se retrasa como mucho 150 ms. **No:** mover los temporizadores de fase a la animación, que alteraría puntos y tiempo respecto al SPEC XX-01.
- **Sí:** destello de 8 rayos vectoriales solo al emparejar. **No:** partículas con física o sprites.
- **Sí:** `cardAt` y `getLayout` como funciones puras. **No:** duplicar la geometría en dibujo y ratón.
- **Sí:** el cursor sigue al ratón con hover. **No:** exigir clic para seleccionar la carta.
- **Sí:** solo botón izquierdo. **No:** tratar el clic derecho o el táctil de forma especial.
- **Sí:** sin sonido. **No:** sumar efectos en este spec.

---

## Riesgos

| Riesgo                                                   | Mitigación                                                                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Coordenadas erróneas por la escala del marco CRT         | Conversión con `getBoundingClientRect` y criterio de aceptación en 375, 768 y 1280 px                  |
| Listeners de ratón persistentes                          | Registrados en `start()` sobre el canvas y retirados en `destroy()`                                    |
| `preventDefault` en `mousedown` rompe el foco de botones | No prevenir con foco en `button`, `input` o `a`; no prevenir en `mousemove`                            |
| La animación desincroniza lo que se ve con lo que cuenta | Estado lógico instantáneo; la animación solo dibuja; retraso visual máximo de 150 ms                   |
| Animaciones que siguen tras una pausa o un nuevo nivel   | Progreso con `dt` (se congela en pausa) y reinicio del array de animaciones al empezar nivel o partida |
| Rendimiento con 36 cartas animadas y destellos           | Máximo 16 rayos simultáneos por pareja y `shadowBlur` 8 solo en destellos                              |
| Cambio accidental de reglas respecto al SPEC XX-01       | Criterio de aceptación de puntuación idéntica con teclado                                              |

---

## Qué **no** está en este spec

- Cartas especiales (SPEC XX-03).
- Sonido y música.
- Controles táctiles, gestos o gamepad.
- Cambios de reglas, niveles, tiempos o puntuación.
- Cambios en el contrato, en la plataforma o en otros juegos.
- Autenticación, antitrampas y moderación de nombres.
- Tests automatizados.

Cada uno de ellos, si se aborda, va en su propio spec.
