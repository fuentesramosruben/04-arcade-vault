# Memoria de game-performance-booster

## Punto de partida

- Referencia: `specs/11-rendimiento-de-juegos.md` (implementado). Resultados y metodología: `references/performance-review.md`.
- SPEC 11 ya revisó los 5 motores (frogger, asteroides, tetris, arkanoid, snake) con ✅. Aún ninguna ejecución de este agente.

## Patrones y lecciones (de SPEC 11)

- El navegador de Playwright corre a ~144 Hz: fps y p95 no distinguen nada (suelo 7 ms). Usar `task %` (CDP `Performance.getMetrics`) en móvil CPU ×8, más `cbMeanMs`/`cbP95Ms` de la sonda.
- `<Profiler>` no dispara `onRender` en producción: los renders se cuentan con `usePerfRenders` (`lib/perf.ts`), solo activo si existe `window.__AV_PERF__`.
- Causa principal del coste: `.av-bg` (gridscroll + mask + `mix-blend-mode`), −33 % de hilo principal. `data-playing` en `<html>` lo para durante la partida. `.av-noise`, viñeta, scanlines y `shadowBlur` aportan poco (≈ −5 puntos, dentro del ruido).
- Re-renders descartados como causa (0–1 commits por partida); lo útil fue `memo` en `GameCanvas` + `handleGameOver` estable.
- Picos aislados de `frameMaxMs` (20–140 ms) que no se repiten en las 3 ejecuciones son ruido. Snake tuvo uno por la carga de `fruits.png` (586 KB).
- Arkanoid necesita `keys: ["Space"]` en la sonda para lanzar la bola.
- Medir con `npm run build` + `npm run start -- -p 3100`; matar el proceso después (netstat + taskkill). Nunca `dev`.
- `npm run lint` falla ya por `references/templates/*.jsx` (errores previos): lintar solo los archivos tocados.
- Rutas `/juegos/[id]` y `/jugar` necesitan `export const instant = false` por `cacheComponents`.

## Revisados con este agente

(ninguno todavía)
