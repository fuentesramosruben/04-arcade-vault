# Revisión de rendimiento de juegos

Referencia: `specs/11-rendimiento-de-juegos.md`. Sonda: `scripts/perf-probe.js` (inyectada con el MCP `playwright`).

Metodología: `npm run build && npm run start` (puerto 3100), skin clásica, partida de 20 s sin pausar, cada celda es la **mediana de 3 ejecuciones** recargando la página. Entornos: escritorio 1280 × 800 y móvil 390 × 844 con `hasTouch`, `isMobile` y CPU ×4 (`Emulation.setCPUThrottlingRate`). Arkanoid recibe `Space` cada 200 ms para lanzar la bola; el resto, sin entrada.

Métricas: `fps` medios · `p95` y `max` del tiempo entre fotogramas (ms) · `longTasks` (> 50 ms) · `renders` de `GamePlayer` / `GameCanvas` (commits contados con `usePerfRenders`, ver Desviaciones).

## Línea base (paso 1)

### Escritorio

| Juego      | fps   | p95 ms | max ms | longTasks | renders GamePlayer | renders GameCanvas |
| ---------- | ----- | ------ | ------ | --------- | ------------------ | ------------------ |
| frogger    | 143.6 | 7.1    | 14.0   | 0         | 1                  | 1                  |
| asteroides | 143.7 | 7.1    | 13.9   | 0         | 0                  | 0                  |
| tetris     | 144.0 | 7.1    | 7.8    | 0         | 0                  | 0                  |
| arkanoid   | 143.9 | 7.1    | 13.9   | 0         | 9                  | 9                  |
| snake      | 143.9 | 7.1    | 13.7   | 0         | 1                  | 1                  |

### Móvil (390 × 844, CPU ×4)

| Juego      | fps   | p95 ms | max ms | longTasks | renders GamePlayer | renders GameCanvas |
| ---------- | ----- | ------ | ------ | --------- | ------------------ | ------------------ |
| frogger    | 143.6 | 7.0    | 14.0   | 0         | 1                  | 1                  |
| asteroides | 143.8 | 7.0    | 13.9   | 0         | 1                  | 1                  |
| tetris     | 143.9 | 7.0    | 14.0   | 0         | 0                  | 0                  |
| arkanoid   | 143.8 | 7.0    | 14.1   | 0         | 9                  | 9                  |
| snake      | 142.3 | 7.0    | 34.8   | 0         | 1                  | 1                  |

Snake es el único con picos altos (34.8 / 90.4 / 20.9 ms en sus 3 ejecuciones; el de 90 ms puede ser carga inicial de `fruits.png`, 586 KB).

## Desviaciones y observaciones

- **Contador de renders sin `Profiler`.** React en producción no invoca `onRender` de `<Profiler>` (solo en el build de profiling), así que `lib/perf.ts` cuenta commits con un `useEffect` sin dependencias que solo actúa si existe `window.__AV_PERF__`. Mismo objetivo y misma garantía (sin bandera, no hace nada).
- `GameCanvas` también cuenta commits para poder verificar el criterio "no se re-renderiza al cambiar solo las estadísticas".
- Escritorio mide ~144 fps: el navegador de Playwright no está limitado a 60 Hz, así que los umbrales de escritorio se cumplen de sobra.
- **La línea base ya cumple el presupuesto** en los 5 juegos y los 2 entornos (≥ 142 fps, p95 7 ms; solo `frameMaxMs` de snake en móvil supera 50 ms en una ejecución). El tirón que describe el spec no se reproduce en este equipo/emulación; la CPU ×4 apenas cambia las cifras. Consecuencia: el criterio "Frogger mejora `frameP95Ms`" no es medible con esta sonda (7.0 ms es el suelo de un refresco de 144 Hz). Hay que decidir cómo seguir (ver resumen del paso 1).
- `GameCanvas` se re-renderiza igual que `GamePlayer` (arkanoid: 9 y 9), de modo que hoy un cambio de `stats` re-renderiza el canvas.

## Medición endurecida (opción 2 tras el paso 1)

La cadencia de fotogramas no distingue nada con un refresco de 144 Hz (suelo de 7 ms), así que la sonda añade `cbMeanMs`/`cbP95Ms` (coste del callback de `requestAnimationFrame` del motor, envolviendo `rAF` solo durante la medición) y el ejecutor lee CDP `Performance.getMetrics` antes y después: `task%` (hilo principal ocupado), `script%`, `style%` y `layout%`. Mediana de 3 ejecuciones de 20 s.

### Escritorio, sin throttling

| Juego      | fps   | p95 ms | max ms | cb medio / p95 ms | task % | script % | style % |
| ---------- | ----- | ------ | ------ | ----------------- | ------ | -------- | ------- |
| frogger    | 143.4 | 7.1    | 20.7   | 0.08 / 0.2        | 4.8    | 1.3      | 0.4     |
| asteroides | 143.8 | 7.1    | 14.1   | 0.04 / 0.1        | 3.8    | 0.7      | 0.4     |
| tetris     | 143.8 | 7.0    | 14.0   | 0.05 / 0.1        | 3.9    | 0.8      | 0.4     |
| arkanoid   | 143.8 | 7.1    | 20.9   | 0.06 / 0.1        | 3.2    | 0.4      | 0.4     |
| snake      | 143.4 | 7.1    | 14.1   | 0.04 / 0.1        | 2.5    | 0.1      | 0.3     |

### Móvil 390 × 844, CPU ×8

| Juego      | fps   | p95 ms | max ms | cb medio / p95 ms | task % | script % | style % |
| ---------- | ----- | ------ | ------ | ----------------- | ------ | -------- | ------- |
| frogger    | 143.5 | 7.0    | 14.0   | 0.79 / 1.2        | 47.1   | 13.0     | 4.1     |
| asteroides | 143.4 | 7.0    | 27.8   | 0.39 / 0.7        | 37.1   | 7.3      | 3.9     |
| tetris     | 143.9 | 7.0    | 13.9   | 0.52 / 0.8        | 37.2   | 9.3      | 3.2     |
| arkanoid   | 143.8 | 7.0    | 13.9   | 0.61 / 1.0        | 28.4   | 5.3      | 3.4     |
| snake      | 143.6 | 7.0    | 27.8   | 0.36 / 1.0        | 23.3   | 3.1      | 3.3     |

Lectura:

- **Re-renders:** quedan descartados como causa. Una partida de 20 s produce 0–1 commits (arkanoid 9, por los cambios de puntos/nivel con `Space` a 5 Hz). Lo único a mejorar es que `GameCanvas` se re-renderiza junto con `GamePlayer` (el paso 3 lo evita, pero el coste por render es irrelevante).
- **JS de los motores:** < 0.1 ms por fotograma a ×1 y < 0.8 ms a ×8 (el 5 % del presupuesto de 16.7 ms). Frogger es el más caro (≈2× el resto) pero lejos de ser un cuello de botella.
- **Hilo principal:** a ×8 Frogger ocupa el 47 % y el resto un 23–37 %; `script` + `style` explican solo ≈17 % en Frogger, así que ≈30 % es pintado/composición del hilo principal, común a todos los juegos (capas CSS, no el motor).
- **Sin tirones reproducibles:** incluso a ×8 se mantienen ~143 fps y p95 = 7 ms. Los picos de `frameMaxMs` (20–140 ms) son aislados, aparecen en todos los juegos al azar y no se pueden atribuir al código. Si el tirón del usuario es real, es de GPU/composición (los `mix-blend-mode` de `.av-bg`, `.av-noise` y `.crt-screen::after`), que esta emulación en software no refleja bien.

## Atribución del coste de Frogger (paso 2)

A/B sin tocar el código: móvil 390 × 844, CPU ×8, `/juegos/frogger/jugar`, 3 ejecuciones de 10 s por variante (contexto nuevo en cada una). Las capas se desactivan inyectando CSS (`display: none !important`); `shadowBlur` se anula sustituyendo el setter de `CanvasRenderingContext2D.prototype` con un script de inicio. `task %` = hilo principal ocupado (CDP `TaskDuration`), mediana. fps y p95 no cambian en ninguna variante (≈144 / 7 ms).

| Variante                                   | task % | Δ task | style % | script % |
| ------------------------------------------ | ------ | ------ | ------- | -------- |
| base                                       | 47.6   | —      | 3.9     | 14.0     |
| sin `.av-bg`                               | 32.0   | −15.6  | 0.0     | 12.9     |
| sin `.av-noise`                            | 46.2   | −1.4   | 4.0     | 13.4     |
| sin `.crt-screen::after` (multiply)        | 42.9   | −4.7   | 3.2     | 13.8     |
| sin `.crt-screen::before` (viñeta)         | 41.8   | −5.8   | 3.3     | 11.7     |
| sin `shadowBlur`                           | 42.4   | −5.2   | 3.2     | 13.6     |
| todo apagado (bg, noise, ::before/::after, shadow) | 34.1 | −13.5 | 0.0 | 14.7 |

Conclusiones:

- **Causa principal: `.av-bg`** (rejilla con `gridscroll`, `mask-image` y `mix-blend-mode`): −15.6 puntos de hilo principal (−33 %) y el `style %` cae a 0. Es una animación que se recalcula en cada fotograma detrás del canvas. Justifica el paso 4 (detenerla durante la partida).
- **`.crt-screen::after`, `::before` y `shadowBlur`:** ≈ −5 puntos cada uno, dentro del ruido entre ejecuciones (una de las tres de `noAfter` y de `noShadow` sale a 52/49). Efecto pequeño y no demostrado por separado.
- **`.av-noise`:** −1.4, sin efecto apreciable.
- **No son aditivos:** "todo apagado" (34.1) no mejora a "sin `.av-bg`" (32.0); una vez parada la rejilla, el resto no aporta de forma medible.
- **Re-renders:** `playerRenders` = 1 en una partida de 20 s (paso 1 y medición endurecida), así que la hipótesis queda **descartada**. El paso 3 solo se justifica por `GameCanvas`, que se re-renderiza con cada commit de `GamePlayer`, y por el resto de `stats`.
- **Canvas (`shadowBlur`, fondo estático):** apoyo débil (≈ −5 puntos, dentro del ruido). El paso 5 no está respaldado con estos datos por encima de lo que hace el CSS.

## Re-renders (paso 3, versión mínima)

Cambio: `GameCanvas` envuelto en `memo` y `handleGameOver` con `useCallback` (`onStats={setStats}` ya era estable). No se separa el HUD en `game-hud.tsx`: con 0–1 commits por partida de 20 s no hay ganancia medible (ver Decisiones del spec: no memoizar por costumbre).

Comprobación con `build` + `start` (escritorio, 15 s con teclas sintéticas a 5 Hz):

| Juego    | renders `GamePlayer` | renders `GameCanvas` | HUD final (puntos) |
| -------- | -------------------- | -------------------- | ------------------ |
| arkanoid | 9                    | 0 (antes: 9)         | 70                 |
| frogger  | 5                    | 0                    | 50                 |
| snake    | 0                    | 0                    | 0                  |

`GameCanvas` ya no se re-renderiza cuando cambian solo las estadísticas. Pausa (`P`) y cambio de skin siguen funcionando sin reiniciar la partida.

## Capas CSS (paso 4)

Cambio: `GamePlayer` con motor pone `data-playing` en `<html>` (efecto con cleanup) y `app/globals.css` añade reglas `html[data-playing]`: sin animación `gridscroll` en `.av-bg::before`, `mix-blend-mode: normal` en `.av-bg::after` y `.crt-screen::after` (multiply con negro equivale a negro con alfa fija, sin cambio de color) y `.av-noise` oculto.

Comprobación con `build` + `start`:

- `data-playing`: presente en `/juegos/frogger/jugar`; ausente en `/`, `/juegos` y `/salon`; tras pulsar SALIR desde `/juegos/snake/jugar` se retira. Sin errores de consola.
- Capturas de `/juegos/frogger/jugar` antes y después (animaciones en pausa): iguales salvo la posición de las entidades del juego. `/`, `/juegos` y `/salon` no cambian: las reglas solo aplican con `data-playing`.
- Frogger, móvil 390 × 844, CPU ×8, 10 s, 3 ejecuciones: `task %` 35.7 / 38.7 / 31.6 (mediana 35.7) frente a 47.6 de la base; `style %` 0 frente a 3.9. Mejora ≈ −12 puntos (−25 %).

## Resultado final (paso 7)

Misma metodología que la línea base (`build` + `start`, skin clásica, 20 s, mediana de 3 ejecuciones), con los cambios de los pasos 3 y 4. Los pasos 5 y 6 se omiten (ver Decisiones). `renders` = commits de `GamePlayer` / `GameCanvas`.

### Escritorio, sin throttling

| Juego      | fps   | p95 ms | max ms | cb medio / p95 ms | task % | renders |
| ---------- | ----- | ------ | ------ | ----------------- | ------ | ------- |
| frogger    | 141.5 | 7.1    | 14.0   | 0.10 / 0.2        | 4.0    | 1 / 0   |
| asteroides | 141.9 | 7.1    | 20.8   | 0.05 / 0.1        | 3.1    | 1 / 0   |
| tetris     | 141.9 | 7.1    | 14.1   | 0.05 / 0.2        | 2.9    | 0 / 0   |
| arkanoid   | 143.7 | 7.1    | 14.0   | 0.06 / 0.1        | 2.1    | 9 / 0   |
| snake      | 144.0 | 7.1    | 7.2    | 0.04 / 0.1        | 1.4    | 1 / 0   |

### Móvil 390 × 844, CPU ×4 (el entorno del presupuesto)

| Juego      | fps   | p95 ms | max ms | cb medio / p95 ms | task % | renders |
| ---------- | ----- | ------ | ------ | ----------------- | ------ | ------- |
| frogger    | 144.0 | 7.0    | 7.1    | 0.62 / 1.1        | 22.2   | 1 / 0   |
| asteroides | 144.0 | 7.0    | 7.5    | 0.30 / 0.6        | 18.5   | 1 / 0   |
| tetris     | 144.0 | 7.0    | 7.1    | 0.46 / 0.8        | 21.2   | 0 / 0   |
| arkanoid   | 144.0 | 7.0    | 7.2    | 0.44 / 0.8        | 11.8   | 9 / 0   |
| snake      | 144.0 | 7.0    | 7.1    | 0.29 / 0.5        | 6.9    | 1 / 0   |

### Móvil 390 × 844, CPU ×8, antes → después

| Juego      | task % antes → después | style % antes → después | fps  | p95 ms | max ms |
| ---------- | ---------------------- | ----------------------- | ---- | ------ | ------ |
| frogger    | 47.1 → 35.7 (−11.4)    | 4.1 → 0.0               | 144.0 | 7.0   | 7.1    |
| asteroides | 37.1 → 29.7 (−7.4)     | 3.9 → 0.0               | 143.9 | 7.0   | 13.8   |
| tetris     | 37.2 → 33.3 (−3.9)     | 3.2 → 0.0               | 144.0 | 7.0   | 7.2    |
| arkanoid   | 28.4 → 19.6 (−8.8)     | 3.4 → 0.0               | 143.9 | 7.0   | 13.9   |
| snake      | 23.3 → 14.4 (−8.9)     | 3.3 → 0.0               | 143.9 | 7.0   | 14.0   |

Notas:

- **Cumple el presupuesto** en los 5 juegos: escritorio ≥ 141 fps y p95 7.1 ms; móvil ×4 ≥ 144 fps y `frameMaxMs` ≤ 7.5 ms. A ×8 hay un pico aislado en una de las tres ejecuciones de arkanoid (41.6 ms) y de snake (69.6 ms); las medianas son 13.9 y 14.0 ms.
- **Frogger:** `frameP95Ms` no mejora porque 7.0 ms es el suelo de 144 Hz (el criterio original no es medible aquí). La métrica sustitutiva, el hilo principal ocupado en móvil ×8, baja de 47.1 % a 35.7 %.
- **Todos los juegos mejoran** (−4 a −11 puntos), porque `data-playing` y el `memo` de `GameCanvas` son comunes.
- **`GameCanvas`: 0 renders** en todos los juegos y entornos (antes igualaba a `GamePlayer`).
- **Escritorio**: fps de frogger, asteroides y tetris ≈ 141.5–142 frente a ≈ 143.5 en la línea base. Con `cb` y `task %` por debajo de la base no se atribuye a un empeoramiento real; es variación del navegador entre sesiones.
- **`cbMeanMs` a ×8** sube respecto a la medición endurecida (p. ej. frogger 0.79 → 1.00 ms) aunque el `task %` total baja. No se ha investigado: el JS de los motores sigue por debajo de 1.1 ms por fotograma, un 6 % del presupuesto de 16.7 ms.
- Móvil ×4 no tenía columna `task %` en la línea base (se midió después), por eso la comparación antes/después se hace a ×8.
