# Memoria de game-jam

## Temas y juegos generados

Formato: `AAAA-MM-DD` · tema · `id` (TÍTULO, CAT) · carpeta · specs · estado (`borrador`, `aceptado`, `rechazado`, `implementado`)

- 2026-10-18 · memoria "Parejas" (sugerido en `references/game-suggestions-todo.md`) · `parejas` (PAREJAS, PUZZLE, color cyan) · `specs/game-jam/parejas/` · `01-juego-parejas.md` (SPEC 10 propuesto), `02-parejas-raton-y-animaciones.md` (SPEC 11), `03-parejas-cartas-especiales.md` (SPEC 12) + `README.md` · borrador
  - Diseño: 6 niveles 3×4 a 6×6, barra de tiempo vectorial, combo ×5, `lives: false`, canvas 800×600, sin sonido, `sort_order` previsto 12.
  - Candidatos descartados en la misma ejecución: `dos-mil` (24/30), `gemas` (21/30); quedan libres para otra jam.

## Notas de proceso

- `P`/`Esc` los gestiona `GamePlayer` (components/game-player.tsx), no el motor.
- Último `sort_order` conocido: 11 (arkanoid). Verificar siempre con `select max(sort_order)`.
- Numeración real de specs: siguiente libre al 2026-10-18 era el 10.
- `references/started-games/` estaba vacío en esa fecha.

## Rechazos y motivos

- Ninguno.
