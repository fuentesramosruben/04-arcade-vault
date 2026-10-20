# SPEC 11 — Rendimiento de los juegos (FPS y re-renders)

> **Status:** Aprobado
> **Depends on:** SPEC 05, SPEC 07, SPEC 08, SPEC 09, SPEC 10, Frogger (`specs/game-jam/frogger/01-frogger-core.md`)
> **Date:** 2026-10-19
> **Objective:** Medir y corregir los tirones y los re-renders de React en la pantalla de juego de Frogger y de los otros 4 motores hasta cumplir un presupuesto de rendimiento medible, en escritorio y en móvil.

---

## Por qué existe este spec

Frogger va a tirones (bajadas de FPS) en escritorio y en el navegador móvil, y el usuario sospecha que React se re-renderiza demasiado. El código muestra varios candidatos, pero ninguno está medido:

- **Re-renders.** `GameCanvas` pasa `onStats={setStats}` y los 5 motores deduplican con `emitStats()`, así que `GamePlayer` solo debería re-renderizarse cuando cambian puntos, vidas o nivel, no en cada fotograma. Hay que comprobarlo con datos antes de aceptar o descartar esa hipótesis. `GamePlayer` contiene HUD, selector de skin, `TouchControls` y el modal, y se re-renderiza entero con cada cambio de `stats`.
- **Capas CSS bajo y sobre el canvas.** `app/layout.tsx` monta `.av-bg` (rejilla en perspectiva animada con `gridscroll`, `mask-image` y `mix-blend-mode: overlay`) y `.av-noise` (SVG con `feTurbulence`), fijos y visibles detrás del juego. Encima del canvas, `.crt-screen::after` usa `mix-blend-mode: multiply` y `.crt-screen::before` una viñeta; `.crt-screen` lleva `inset box-shadow`. Los `mix-blend-mode` obligan a recomponer toda la pila en cada fotograma del canvas.
- **Canvas.** Frogger aplica `shadowBlur` en cada fotograma a la rana y repinta todo (zonas, carriles, entidades) sin capa de fondo cacheada. Los otros motores usan `shadowBlur` y `getComputedStyle` en distinta medida.
- **Bucle.** `requestAnimationFrame` con `dt` variable (tope `MAX_DT`). Se queda como está (ver Decisiones).

El spec es primero de medición: el plan empieza por una línea base y cada corrección se acepta solo si mejora la métrica. Es una decisión del usuario que el alcance sean la plataforma y los 5 motores, con un presupuesto medible y un informe reproducible.

---

## Alcance

**Dentro:**

- Sonda de medición reproducible `scripts/perf-probe.js`, inyectada con el MCP `playwright` (`browser_evaluate`), sin añadir dependencias. Mide por partida de 20 s: FPS medios, p95 y máximo del tiempo entre fotogramas (`requestAnimationFrame`), `longtask`s del hilo principal y número de renders de `GamePlayer` (contados con el `Profiler` de React solo en la medición, ver Modelo de datos).
- Informe `references/performance-review.md`: matriz juego × entorno (escritorio, móvil 390 × 844 con CPU ×4) con la línea base y el resultado final, al estilo de `references/mobile-review.md`.
- Corrección de **re-renders**: aislar lo que cambia en cada partida del resto de `GamePlayer` (HUD de estadísticas, `TouchControls`, selector de skin, modal) con `memo` y/o separación de componentes, sin reiniciar los motores ni cambiar el contrato `GameEngine`.
- Corrección de **capas CSS** solo durante la partida: en `/juegos/[id]/jugar` con motor se detiene la animación `gridscroll` y se sustituye el `mix-blend-mode` del fondo y del CRT por un equivalente sin mezcla; el aspecto fuera de la pantalla de juego no cambia. Se marca con un atributo `data-playing` en `<html>` puesto por `GamePlayer` con un efecto y retirado al desmontar.
- Corrección de **canvas** en los motores donde la medición lo justifique: capa de fondo estática pre-renderizada (`OffscreenCanvas` o canvas auxiliar) en Frogger, `shadowBlur` solo donde aporte, sin lecturas de `getComputedStyle` fuera de `start()` y `refreshPalette()`.
- Presupuesto de rendimiento (ver Criterios de aceptación) aplicado a los 5 juegos: asteroides, tetris, arkanoid, snake y frogger.
- Nota breve en `CLAUDE.md`.

**Fuera de alcance (specs futuros):**

- Paso fijo de simulación e independencia de la frecuencia de refresco (120/144 Hz): decisión del usuario, solo se optimiza lo que mida como coste.
- Cambios en la jugabilidad, velocidades, física o puntuación de cualquier motor.
- Cambios en el contrato `GameEngine` o en `registry.ts`.
- Escalado por `devicePixelRatio` del canvas ni cambios de resolución lógica.
- Rendimiento del resto de páginas del sitio (`/`, `/juegos`, `/salon`, `/acerca`, `/auth`).
- Web Workers, `OffscreenCanvas` en hilo aparte y WebGL.
- Dispositivo físico (queda como prueba manual recomendada) y tests automatizados (no hay framework configurado).

---

## Modelo de datos

No introduce datos persistentes ni cambios en Supabase. Estructuras nuevas, solo de medición, fuera del bundle de producción:

```js
// scripts/perf-probe.js (se inyecta con browser_evaluate; devuelve este objeto tras 20 s)
const result = {
  game: "frogger",
  env: "desktop" | "mobile-cpu4x",
  fps: 0, // fotogramas / segundo, media
  frameP95Ms: 0, // p95 del tiempo entre fotogramas
  frameMaxMs: 0,
  longTasks: 0, // PerformanceObserver "longtask" (> 50 ms)
  playerRenders: 0, // renders de GamePlayer en la ventana
};
```

Archivos:

```
scripts/perf-probe.js              # sonda de medición (sin dependencias)
references/performance-review.md   # matriz juego × entorno, línea base y resultado
components/game-player.tsx         # aislamiento de renders y data-playing
components/game-hud.tsx            # (nuevo, si aplica) HUD de estadísticas memoizado
components/game-canvas.tsx         # solo si la medición lo exige
app/globals.css                    # reglas html[data-playing] para fondo y CRT
lib/games/*/engine.ts              # solo los motores donde la medición lo justifique
```

Convenciones:

- Los renders se cuentan con `<Profiler>` de React activado solo si existe `window.__AV_PERF__`; sin esa bandera no hay coste ni código activo en producción.
- Toda medición se hace con `npm run build && npm run start`, no con `npm run dev` (Turbopack en desarrollo añade renders extra y no es representativo).
- La emulación móvil usa 390 × 844, `hasTouch` y CPU throttling ×4 (CDP `Emulation.setCPUThrottlingRate`).
- Cada juego se mide con la skin clásica y una partida sin pausar, 20 s después de `start()`.

---

## Plan de implementación

Antes de cada paso se consulta la guía relevante en `node_modules/next/dist/docs/` (Client Components, `cacheComponents`).

1. **Sonda y línea base.** Crear `scripts/perf-probe.js` y la bandera `window.__AV_PERF__` con el `Profiler` en `GamePlayer`. Medir los 5 juegos en los 2 entornos con `build` + `start` y volcar la tabla de línea base en `references/performance-review.md`. Verificación: la tabla tiene 10 filas con las 5 métricas, y el código de producción sin la bandera no cambia de comportamiento.
2. **Atribución del coste.** Repetir la medición de Frogger desactivando por turnos, vía DevTools/`browser_evaluate` y sin tocar el código, `.av-bg`, `.av-noise`, `.crt-screen::after` y el `shadowBlur`; anotar qué capa explica cada milisegundo en el informe. Verificación: el informe nombra al menos una causa con su efecto en `frameP95Ms`, y si `playerRenders` ya es bajo, la hipótesis de re-renders queda descartada por escrito.
3. **Re-renders.** Separar el HUD de estadísticas en `components/game-hud.tsx` (memoizado) y memoizar `TouchControls` y los controles de la cabecera, estabilizar los callbacks con `useCallback` y comprobar que `GameCanvas` no se re-renderiza al cambiar `stats`. Hacerlo aunque el paso 2 muestre pocos renders solo si el recuento por partida de 20 s baja; si ya es mínimo, omitir este paso y registrarlo en Decisiones. Verificación: `playerRenders` ≤ cambios reales de `score`/`lives`/`level` + 2 en una partida de 20 s.
4. **Capas CSS.** Añadir `data-playing` en `<html>` desde `GamePlayer` (efecto con cleanup) y las reglas `html[data-playing]` en `app/globals.css`: sin animación `gridscroll`, sin `mix-blend-mode` en `.av-bg::after` y `.crt-screen::after` (scanlines con alfa fija), `.av-noise` oculto. Verificación: capturas antes y después de `/juegos/frogger/jugar` casi idénticas; `/`, `/juegos` y `/salon` sin ningún cambio visual.
5. **Canvas de Frogger.** Pre-renderizar a un canvas auxiliar el fondo estático (zonas, líneas de carril y marcos de las metas) que se copia con un único `drawImage` por fotograma, y limitar `shadowBlur` a la rana. Se repinta ese fondo en `refreshPalette()`. Verificación: Frogger se ve igual con las 3 skins y baja `frameP95Ms` respecto al paso 1.
6. **Canvas de los demás motores.** Aplicar a asteroides, tetris, arkanoid y snake solo los cambios que el paso 1 mida como necesarios (fondo estático cacheado, `shadowBlur` acotado). Los motores que ya cumplen el presupuesto no se tocan. Verificación: los 5 juegos juegan igual con teclado y con los controles táctiles del SPEC 10.
7. **Medición final y documentación.** Repetir la medición del paso 1, completar la columna "resultado" de `references/performance-review.md` y añadir a `CLAUDE.md` una nota sobre `scripts/perf-probe.js`, `data-playing` y la regla de medir con `build` + `start`. Verificación: `git diff` solo contiene archivos de este spec.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `references/performance-review.md` contiene la línea base y el resultado final de los 5 juegos en escritorio y en móvil (390 × 844, CPU ×4) con las 5 métricas.
- [ ] En escritorio (60 Hz), cada juego tiene al menos 55 FPS medios y un `frameP95Ms` ≤ 22 ms en una partida de 20 s.
- [ ] En emulación móvil con CPU ×4, cada juego tiene al menos 45 FPS medios y ningún fotograma supera 50 ms (`frameMaxMs` ≤ 50) fuera de la carga inicial.
- [ ] Frogger mejora `frameP95Ms` respecto a su línea base en ambos entornos.
- [ ] En una partida de 20 s, `playerRenders` no supera el número de cambios reales de `score`, `lives` o `level` más 2.
- [ ] `GameCanvas` no se re-renderiza cuando cambian solo las estadísticas.
- [ ] `<html>` tiene `data-playing` mientras `GamePlayer` con motor está montado y lo pierde al salir de la pantalla de juego.
- [ ] `/`, `/juegos`, `/juegos/[id]` y `/salon` se ven idénticos a antes del spec (sin `data-playing`).
- [ ] La partida y el resultado de cada juego son los mismos: ningún cambio en los archivos de constantes de velocidad, física o puntos de los motores.
- [ ] Ningún archivo de `lib/games/types.ts` ni `lib/games/registry.ts` cambia en el diff.
- [ ] Frogger, y los demás motores que se hayan tocado, se ven igual con las skins clásico, neón, retro y pastel, y el cambio de skin sigue repintando sin reiniciar la partida.
- [ ] Los juegos siguen funcionando con teclado en escritorio y con el panel táctil en móvil (SPEC 10).
- [ ] Sin la bandera `window.__AV_PERF__` el `Profiler` no añade renders ni logs.
- [ ] Recargar `/juegos/<id>/jugar` no produce errores de hidratación ni en la consola.
- [ ] `CLAUDE.md` documenta la sonda, `data-playing` y la regla de medir con `build` + `start`.

---

## Decisiones

- **Sí:** medir antes de optimizar, con la línea base como paso 1. **No:** aplicar las optimizaciones sospechosas a ciegas; el código sugiere que los re-renders por fotograma no existen gracias a `emitStats()`, y la causa real puede ser el CSS o el canvas.
- **Sí:** alcance plataforma + 5 motores con un presupuesto común (decisión del usuario). **No:** solo Frogger ni solo CSS; el CSS compartido afecta a todos y los motores comparten patrones.
- **Sí:** presupuesto numérico (55 FPS / p95 ≤ 22 ms en escritorio; 45 FPS / máximo 50 ms en móvil con CPU ×4) (decisión del usuario). **No:** "que se note fluido", que no es verificable. Los umbrales se fijaron por criterio de partida y se pueden ajustar tras ver la línea base, dejando constancia en este spec.
- **Sí:** pausar o simplificar el fondo y las capas de mezcla solo durante la partida (decisión del usuario). **No:** simplificar el aspecto de toda la web ni mantener todos los efectos intactos.
- **Sí:** script de sonda en `scripts/perf-probe.js` inyectado con el MCP `playwright`, y el informe en `references/` (decisión del usuario). **No:** añadir `playwright` o `@playwright/test` como dependencia, ni un overlay FPS permanente en la app.
- **Sí:** medir con `build` + `start`. **No:** `npm run dev`, porque el modo de desarrollo añade renders y no refleja producción.
- **Sí:** contar renders con `Profiler` tras una bandera `window.__AV_PERF__`. **No:** `console.log` en producción ni librerías de terceros como `why-did-you-render`.
- **No (fuera de alcance, decisión del usuario):** paso fijo de simulación e independencia del refresco. Tocar la simulación de 5 motores sin medir arriesga regresiones de jugabilidad; si en pantallas de 120/144 Hz se nota, va en otro spec.
- **Sí:** pre-renderizar el fondo estático del canvas en Frogger solo si el paso 2 lo respalda. **No:** `devicePixelRatio`, WebGL ni workers; cambian la resolución lógica o la arquitectura.
- **Sí:** el paso 3 puede omitirse si la medición muestra que los renders ya son los mínimos, registrándolo en el informe. **No:** memoizar por costumbre.

---

## Riesgos

| Riesgo                                                                     | Mitigación                                                                                                                       |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| La emulación de CPU ×4 en Playwright no refleja un móvil real              | Se compara siempre con la misma metodología antes y después; prueba manual en dispositivo físico recomendada, fuera del criterio |
| Mediciones ruidosas (otras pestañas, temperatura) que enmascaran la mejora | Cada celda se mide 3 veces y se anota la mediana en el informe; mismo equipo y navegador para línea base y resultado             |
| Quitar `mix-blend-mode` cambia el aspecto del CRT                          | Capturas antes y después en el paso 4; las scanlines pasan a alfa fija con un color calibrado para imitar el resultado           |
| `data-playing` queda puesto al navegar fuera del juego (cleanup omitido)   | Efecto con cleanup en `GamePlayer`; criterio de aceptación sobre `/juegos` tras salir de la partida                              |
| El fondo pre-renderizado de Frogger queda desfasado al cambiar de skin     | `refreshPalette()` regenera el fondo cacheado; criterio de aceptación con las 4 skins                                            |
| La memoización introduce valores obsoletos en el HUD o en el modal         | Solo se memoizan componentes de presentación con props primitivas; criterio de aceptación sobre HUD, pausa y game over           |
| El `Profiler` o la sonda alteran la medición                               | La sonda solo observa (`PerformanceObserver`, `rAF`); `Profiler` activo únicamente con `window.__AV_PERF__`                      |
| Los umbrales de FPS resultan inalcanzables en el CI/equipo de medición     | Se revisan tras la línea base (paso 1) y el ajuste queda anotado en Decisiones antes de aprobar el spec                          |

---

## Qué **no** está en este spec

- Paso fijo de simulación e independencia de la frecuencia de refresco.
- Cambios de jugabilidad, físicas, velocidades o puntuaciones.
- Cambios en el contrato `GameEngine`, en `registry.ts` o en el esquema de Supabase.
- `devicePixelRatio`, WebGL, Web Workers y `OffscreenCanvas` en otro hilo.
- Rendimiento del resto de páginas del sitio.
- Nuevas dependencias de medición (Playwright como paquete, Lighthouse CI) y tests automatizados.
- PWA, pantalla completa y modo offline.

Cada uno de ellos, si se aborda, va en su propio spec.
