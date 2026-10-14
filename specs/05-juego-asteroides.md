# SPEC 05 — Juego Asteroides jugable en la plataforma

> **Status:** Implementado
> **Depends on:** SPEC 01
> **Date:** 2026-10-14
> **Objective:** Portar a TypeScript el juego de `references/started-games/02-asteroids` como el juego jugable `asteroides` de Arcade Vault, conectado al HUD, la pausa y el modal de puntuación de `GamePlayer` mediante un contrato de motor reutilizable.

---

## Por qué existe este spec

Hoy `components/game-player.tsx` es una maqueta: suma puntos aleatorios con un `setInterval` y muestra una arena decorativa. Asteroides es el primer juego real. Su código original usa variables globales, `document.getElementById` y listeners de teclado sin limpieza, así que no puede insertarse tal cual en un Client Component de React. Este spec define el portado y fija un contrato mínimo (`GameEngine`) que Tetris y Arkanoid (`references/started-games/03-tetris`, `04-arkanoid`) reutilizarán en sus propios specs.

---

## Alcance

**Dentro:**

- Motor de Asteroides en TypeScript, sin globals ni acceso a `document`, en `lib/games/asteroids/`. Se conservan las mecánicas de `game.js`: nave con rotación, empuje y arrastre, disparo con cooldown, asteroides de 3 tamaños que se dividen, mundo toroidal, partículas de explosión, invencibilidad de 3 s al reaparecer, power-up de triple disparo (5 s, 15 % de probabilidad, garantizado a la 5.ª destrucción) y subida de nivel al limpiar todos los asteroides (`3 + nivel` asteroides).
- Contrato común `GameEngine` en `lib/games/types.ts` (inicio, pausa, reanudación, reinicio, destrucción y callbacks de estado).
- Registro `lib/games/registry.ts` que asocia un `id` de juego con su fábrica de motor. Los ids sin entrada siguen usando la arena mock actual.
- Componente cliente `components/game-canvas.tsx` que monta el `<canvas>` de 800×600 lógicos, crea el motor del juego, escala el canvas con CSS dentro del marco CRT y lo destruye al desmontar.
- Cambios en `components/game-player.tsx`: si el juego tiene motor, el HUD (JUGADOR, PUNTUACIÓN, VIDAS, NIVEL) lee datos reales, los botones PAUSA/FIN/SALIR controlan el motor y el modal `FIN DEL JUEGO` se abre al terminar la partida. Si no tiene motor, el comportamiento actual no cambia.
- Se elimina del canvas el HUD y el overlay `GAME OVER` del original, y el reinicio con Espacio.
- Teclado: ← → giran, ↑ propulsa, Espacio dispara (como el original); `P` y `Esc` alternan la pausa. Se evita el scroll de la página con flechas y Espacio mientras se juega. Leyenda de teclas bajo el marco CRT.
- Estética vectorial con acentos neón: mismas formas y proporciones, con colores y brillo (`shadowBlur`) tomados de los tokens del tema (`--cyan`, `--magenta`, `--yellow`, `--ink`) sobre fondo negro.
- Nueva entrada en `lib/games.ts`: `id: "asteroides"`, título `ASTEROIDES`, categoría `SHOOTER`, color `cyan`, `best: 0`, `plays: "0"`, textos `short`/`long` en español sin mencionar OVNIs, y portada nueva `cover-asteroides` en `app/globals.css`.
- La puntuación se guarda con el mecanismo actual (`localStorage`, clave `av_scores`).
- Nota breve en `CLAUDE.md` sobre `lib/games/*` y el contrato de motor.

**Fuera de alcance (specs futuros):**

- Portar Tetris y Arkanoid (cada uno tendrá su spec y reutilizará `GameEngine`).
- Cambiar o eliminar la entrada `rocas` existente: queda intacta y con el mock.
- Controles táctiles o gamepad.
- OVNIs, nuevos power-ups, sonido y música, ajustes de dificultad: no existen en el original.
- Guardar puntuaciones en Supabase, ranking real y `plays`/`best` reales (siguen en `localStorage` hasta el spec de auth y puntuaciones).
- Conectar `SessionProvider` a Supabase.
- Modo pantalla completa.
- Tests automatizados (no hay framework configurado).

---

## Modelo de datos

No hay tablas ni persistencia nueva. Se añaden los tipos del contrato y el motor:

```ts
// lib/games/types.ts
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
  start(): void; // arranca el bucle y los listeners de teclado
  pause(): void;
  resume(): void;
  restart(): void; // nueva partida: score 0, 3 vidas, nivel 1
  end(): void; // termina la partida con la puntuación actual (botón FIN)
  destroy(): void; // cancela requestAnimationFrame y quita listeners
}

export type GameEngineFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameEngineCallbacks,
) => GameEngine;
```

```ts
// lib/games/registry.ts
export const ENGINES: Record<string, GameEngineFactory> = {
  asteroides: createAsteroidsEngine,
};
```

Archivos del motor (clases tipadas equivalentes a las de `game.js`):

```
lib/games/asteroids/engine.ts      # createAsteroidsEngine: bucle, estado, colisiones, input
lib/games/asteroids/entities.ts    # Bullet, Asteroid, PowerUp, Ship, Particle
lib/games/asteroids/constants.ts   # W=800, H=600, RADII, SPEEDS, POINTS, powerups, colores
```

Convenciones:

- Coordenadas con origen arriba a la izquierda; velocidades en px/s; `dt` limitado a 50 ms (igual que el original).
- Los colores neón se leen una vez en `start()` con `getComputedStyle(canvas)` de las variables CSS del tema; si faltan, hay colores por defecto en `constants.ts`.
- El motor no usa React ni globals de módulo: todo el estado vive dentro de la instancia creada por la fábrica.
- Una instancia por montaje; `destroy()` es obligatorio al desmontar.

---

## Plan de implementación

Antes de cada paso se consulta la guía relevante en `node_modules/next/dist/docs/` (Client Components, `cacheComponents` y rutas dinámicas con `generateStaticParams`). La UI nueva (portada, leyenda de teclas, marco del canvas) se diseña con la skill `/frontend-design`.

1. **Contrato y registro.** Crear `lib/games/types.ts` y `lib/games/registry.ts` con `ENGINES` vacío. Verificación: `tsc` y `npm run lint` sin errores; nada cambia en pantalla.
2. **Entidades y constantes.** Crear `lib/games/asteroids/constants.ts` y `entities.ts` portando `Bullet`, `Asteroid`, `PowerUp`, `Ship` y `Particle` con `ctx` e input recibidos por parámetro (sin globals). Verificación: `tsc` sin errores.
3. **Motor.** Crear `lib/games/asteroids/engine.ts` con estado, bucle `requestAnimationFrame`, colisiones, niveles, power-up, input por `keydown`/`keyup` (con `preventDefault` en flechas y Espacio) y las operaciones de `GameEngine`; sin HUD ni overlay en el canvas. Registrarlo en `ENGINES`. Verificación: `tsc` sin errores.
4. **Catálogo y portada.** Añadir la entrada `asteroides` a `lib/games.ts` y `.cover-asteroides` a `app/globals.css`. Verificación: `/juegos` muestra la tarjeta nueva con su portada y `/juegos/asteroides` abre su ficha; `/juegos/asteroides/jugar` sigue mostrando el mock.
5. **Canvas.** Crear `components/game-canvas.tsx` (client): monta el canvas 800×600, crea el motor con `ENGINES[game.id]`, expone control por `ref` o props (`paused`, `runKey`) y llama a `destroy()` en el cleanup del efecto. Escala con CSS manteniendo 4:3. Verificación: el juego se ve y responde al teclado en una página de prueba o ya dentro del marco CRT.
6. **Integración en `GamePlayer`.** Si `ENGINES[game.id]` existe, renderizar `GameCanvas` en lugar de la arena mock; alimentar el HUD con `onStats`, conectar PAUSA/REANUDAR, FIN, SALIR y `P`/`Esc`, abrir el modal con `onGameOver(finalScore)`, y que `JUGAR DE NUEVO` llame a `restart()`. El `setInterval` mock y el nivel calculado por puntuación solo se usan sin motor. Verificación: partida completa en `/juegos/asteroides/jugar` hasta game over y guardado de puntuación; `/juegos/caida/jugar` sigue con el mock.
7. **Leyenda y pulido.** Añadir la leyenda de teclas (← → girar · ↑ propulsar · ESPACIO disparar · P pausa) y revisar el escalado a 375, 768 y 1280 px. Verificación: sin scroll horizontal a 375 px.
8. **Documentación.** Añadir a `CLAUDE.md` una nota sobre `lib/games/types.ts`, `registry.ts` y `lib/games/asteroids/`. Verificación: `git diff` solo contiene archivos de este spec.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] Existen `lib/games/types.ts`, `lib/games/registry.ts` y `lib/games/asteroids/{engine,entities,constants}.ts`, y ninguno referencia `document` ni variables globales de estado.
- [ ] `lib/games.ts` contiene la entrada `asteroides` (SHOOTER, cyan, `best: 0`, `plays: "0"`) y `/juegos` la muestra con la portada `cover-asteroides`, distinta de `cover-rocas`.
- [ ] La entrada `rocas` no cambia y su pantalla de juego sigue usando el mock.
- [ ] En `/juegos/asteroides/jugar` se renderiza el canvas del juego y no la arena mock; en los demás ids se sigue viendo la arena mock con puntuación simulada.
- [ ] La nave gira con ← →, propulsa con ↑ y dispara con Espacio; con el cooldown de 0,2 s un Espacio mantenido no dispara en ráfaga continua (el original dispara solo en la pulsación, igual que ahora).
- [ ] Pulsar flechas o Espacio durante la partida no hace scroll de la página.
- [ ] Destruir un asteroide grande suma 20, uno mediano 50 y uno pequeño 100, y el HUD de la plataforma lo refleja al instante.
- [ ] Los asteroides grandes y medianos se dividen en dos del tamaño inferior; los pequeños desaparecen.
- [ ] Al chocar la nave con un asteroide el HUD baja una vida; la nave reaparece a los 2 s con 3 s de invencibilidad (parpadeo).
- [ ] El HUD de la plataforma muestra vidas reales (3 al inicio), puntuación real y nivel real (1 al inicio); al limpiar todos los asteroides el nivel sube y aparecen `3 + nivel` asteroides nuevos.
- [ ] El power-up de triple disparo aparece (con garantía a la 5.ª destrucción sin haber aparecido), al recogerlo la nave dispara 3 balas durante 5 s.
- [ ] El canvas no dibuja HUD ni texto `GAME OVER`.
- [ ] Al llegar a 0 vidas se abre el modal `FIN DEL JUEGO` con la puntuación final real y el motor se detiene.
- [ ] El botón FIN termina la partida y abre el modal con la puntuación actual.
- [ ] `JUGAR DE NUEVO` inicia una partida nueva con 0 puntos, 3 vidas y nivel 1; Espacio por sí solo no reinicia una partida terminada.
- [ ] PAUSA y las teclas `P`/`Esc` detienen el juego (nave, asteroides y power-up quietos) y muestran el overlay `EN PAUSA`; reanudar continúa sin salto de tiempo visible.
- [ ] `GUARDAR PUNTUACIÓN` escribe en `localStorage["av_scores"]` una entrada con `game: "asteroides"` y la puntuación real.
- [ ] Al salir de la pantalla de juego (SALIR o navegación) no quedan listeners de teclado ni bucle `requestAnimationFrame` activos: tras volver a entrar, una pulsación de Espacio crea una sola bala.
- [ ] Recargar `/juegos/asteroides/jugar` no produce errores de hidratación ni errores en la consola.
- [ ] A 375 px de ancho la pantalla de juego no tiene scroll horizontal y el canvas conserva la proporción 4:3.
- [ ] `CLAUDE.md` documenta el contrato de motor y el registro.

---

## Decisiones

- **Sí:** entrada nueva `asteroides` en el catálogo. Decisión explícita del usuario. **No:** reutilizar `rocas`, que queda intacta y se resuelve en otro spec.
- **Sí:** HUD, pausa y modal de la plataforma como única interfaz; el motor solo emite datos. Evita duplicar HUD y reutiliza el guardado de puntuación existente. **No:** conservar el HUD y el overlay del canvas.
- **Sí:** portado a TypeScript con contrato `GameEngine` y registro por `id`. Tetris y Arkanoid ya están en `references/started-games/` y se integrarán igual. **No:** embeber `game.js` en un iframe (sin comunicación limpia de puntuación ni limpieza de listeners). **No:** motor acoplado a Asteroides.
- **Sí:** el contrato es mínimo (start/pause/resume/restart/end/destroy + `onStats`/`onGameOver`). Se ajustará cuando llegue el segundo juego real si hace falta. **No:** abstraer ahora entradas, audio o niveles que solo Asteroides conoce.
- **Sí:** estética vectorial con acentos neón desde los tokens del tema. Encaja en el marco CRT. **No:** blanco puro sobre negro como el original.
- **Sí:** el resto de juegos sigue con la arena mock hasta tener motor. Mantiene la app funcional en cada paso. **No:** retirar el mock ni exigir motor para todos los ids.
- **Sí:** teclado original más `P`/`Esc` para pausa. **No:** controles táctiles (diseño de UI propio, otro spec).
- **Sí:** fin de partida solo por el modal de la plataforma (se elimina el reinicio con Espacio). Una única vía de reinicio evita reinicios accidentales al disparar.
- **Sí:** `best: 0` y `plays: "0"` en la nueva entrada. **No:** inventar cifras de actividad que no existen.
- **Sí:** puntuaciones en `localStorage` como hasta ahora. **No:** adelantar la escritura en Supabase (esquema, RLS y auth tienen spec propio).

---

## Riesgos

| Riesgo                                                                        | Mitigación                                                                                                                                              |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Doble montaje en desarrollo (React Strict Mode) crea dos motores y dos bucles | El efecto de `GameCanvas` crea el motor al montar y llama a `destroy()` en el cleanup; criterio de aceptación sobre listeners y bala única              |
| Listeners de teclado persistentes tras salir de la pantalla                   | Registrados en `start()` y retirados en `destroy()`; nunca en el módulo                                                                                 |
| `preventDefault` en Espacio rompe botones enfocados (PAUSA, FIN)              | Solo se previene durante la partida y no si el foco está en un `button`, `input` o `a`; el input de iniciales del modal debe seguir admitiendo espacios |
| Salto de `dt` al pausar o al cambiar de pestaña                               | `dt` limitado a 50 ms; al reanudar se reinicia `lastTime`                                                                                               |
| Canvas borroso o mal escalado en pantallas HiDPI o pequeñas                   | Resolución lógica fija 800×600 escalada con CSS manteniendo 4:3; revisión a 375, 768 y 1280 px                                                          |
| `shadowBlur` en cada trazo penaliza el rendimiento en equipos modestos        | Aplicar el brillo solo a nave, balas y power-up; asteroides y partículas con trazo simple                                                               |
| Next 16 con `cacheComponents` y rutas con `generateStaticParams`              | La página de juego sigue siendo Server Component; el motor solo existe en el Client Component; leer `node_modules/next/dist/docs/` antes del paso 6     |
| `GamePlayer` mezcla camino mock y camino con motor y crece en complejidad     | Aislar el camino con motor en `GameCanvas`; `GamePlayer` solo decide cuál renderizar                                                                    |
| `localStorage` guarda puntuaciones sin validar contra el motor                | Aceptado: es el comportamiento actual hasta el spec de puntuaciones en Supabase                                                                         |

---

## Qué **no** está en este spec

- Tetris, Arkanoid y cualquier otro juego distinto de Asteroides.
- Cambios en la entrada `rocas`.
- Controles táctiles, gamepad, sonido, OVNIs o nuevas mecánicas.
- Puntuaciones, ranking o `best`/`plays` reales en Supabase.
- Autenticación real y reemplazo de `SessionProvider`.
- Tests automatizados.

Cada uno de ellos, si se aborda, va en su propio spec.
