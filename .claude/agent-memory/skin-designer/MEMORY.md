# Memoria de skin-designer

Fuente de verdad del progreso: `references/game-with-themes.md`.

## Paletas decididas

- Neón (2026-10-18, revisada): synthwave. cyan `#ff2bd6` (nave), magenta `#b6ff00` (power-up), yellow `#00ffe1` (bala), green `#39ff14`, ink `#c9a6ff`, game-bg `#12002b`, flame `#ff5ad0`, glow 40 (asteroid glow 16). La primera versión (cian puro sobre negro) era casi igual a clásico: una skin debe diferir en tono y fondo, no solo en saturación.
- Retro (2026-10-18): cyan/green `#33ff66`, yellow `#ffb000`, magenta `#ff6a3d`, ink `#d8f5c0`, game-bg `#0a0804`, flame `#ff8a1f`, glow 0/0. Hecho en asteroides.
- Pastel (2026-10-19): cyan #8fd0ff, magenta #ff9fc2, yellow #ffcba4, green #8ff0b8, ink #cfc3ff, game-bg #1b1633, glow 4/0. Hecho en frogger.

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

## Snake (2026-10-18, neón)

- Snake migrado: `--game-bg`, `--game-glow-snake` (opcional, 14 por defecto; neón 30 vía `[data-game="snake"]`), `refreshPalette`. Serpiente = `--green`, rejilla = `--ink`, fruta de respaldo = `--magenta`; frutas sprite sin filtro.
- Neón de snake queda ⚠️: no se pudo correr `npm run build` (dev server compartido con otro agente).
- Lección: el hook ESLint --fix convierte `let` en `const` si aún no hay reasignación; añadir la declaración y su uso en ediciones consecutivas puede romper (hacerlo en orden: reasignaciones primero o releer).
- Lección: el navegador Playwright es compartido entre agentes paralelos; usar pestaña propia (`page.context().newPage()`), guardar capturas en `.playwright-mcp/`, y localStorage de skin es compartido.
- Arkanoid neón (2026-10-18): bloques con colores fijos (red/hotpink/gray) ahora son tokens opcionales `--game-red/-hotpink/-gray` (neón: #ff7a1a/#4f8bff/#ffd60a). Glow del motor = base × escala de `--game-glow` (≤10 lineal, >10 1+(g-10)/15). Build no ejecutado por dev server compartido -> ⚠️. Selector de skin es un `combobox "Skin"`.

## Snake retro (2026-10-18)

- Solo CSS: `[data-skin="retro"][data-game="snake"] { --game-glow-snake: 0 }` + `GAME_SKINS`. Sin build -> ⚠️. Fruta respaldo vs serpiente solo 2.1 de luminancia (distingue el tono). Sprites sin filtro.
- Arkanoid retro (2026-10-18): override en [data-game=arkanoid] --green #b5e61d, red #c8321f, hotpink #ffe9a8, gray #a89878 (cyan==green en retro base). Build no ejecutado -> ⚠️.

## Frogger (2026-10-19)

- Motor ya migrado; solo CSS + GAME_SKINS. Overrides: neón --magenta #ff7a1a (carretera), retro --green #b5e61d. Sin build -> las 3 en ⚠️. Capturas salen con modal de game over si no se juega. No hay Python: usar node para editar docs.
