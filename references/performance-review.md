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
