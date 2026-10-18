# Memoria de skin-designer

Fuente de verdad del progreso: `references/game-with-themes.md`.

## Paletas decididas

- Neón (2026-10-18, revisada): synthwave. cyan `#ff2bd6` (nave), magenta `#b6ff00` (power-up), yellow `#00ffe1` (bala), green `#39ff14`, ink `#c9a6ff`, game-bg `#12002b`, flame `#ff5ad0`, glow 40 (asteroid glow 16). La primera versión (cian puro sobre negro) era casi igual a clásico: una skin debe diferir en tono y fondo, no solo en saturación.
- Retro (2026-10-18): cyan/green `#33ff66`, yellow `#ffb000`, magenta `#ff6a3d`, ink `#d8f5c0`, game-bg `#0a0804`, flame `#ff8a1f`, glow 0/0. Hecho en asteroides.
- Pastel: pendiente.

## Infraestructura (hecha)

- Tokens numéricos `--game-glow` / `--game-glow-asteroid` (px sin unidad, leídos con parseFloat) además de `--game-bg` y opcional `--game-flame`; motor lee todo en `readPalette` y `refreshPalette` repinta si no hay rAF.
- `GameCanvas` prop `skin` dispara `refreshPalette`; `GamePlayer` lee la skin guardada en `useEffect` (hidratación).

## Decisiones a revisar

- Neón en asteroides: nave/bala/asteroide con luminancia similar; se distinguen por tono y forma.
- Flame no es token del tema global, solo `--game-flame` opcional.

## Lecciones

- No ejecutar `npm run build` con el dev server activo: el CSS servido queda obsoleto (la skin nueva no aparece); se arregla tocando `app/globals.css` y recargando.
- Añadir una skin a un juego ya migrado (asteroides) solo requiere bloque CSS + `GAME_SKINS`.

- El hook de formato (Prettier) reformatea todo `app/globals.css` en la primera edición (diff enorme); tras la primera edición hay que releer la región antes de editar (indentada 2 espacios dentro de `@layer components`).
- `npm run lint` global falla por `references/templates` (preexistente); lintear `app components lib`.
- Dev server suele estar ya en `localhost:3000`; el reproductor está en `/juegos/<id>/jugar`.
- El error de consola "params outside Suspense" en `/juegos/[id]/jugar` es preexistente.
- Asteroides: tokens `--cyan`(nave), `--yellow`(bala), `--ink`(asteroide), `--magenta`(power-up).
