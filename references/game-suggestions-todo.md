# Sugerencias de juegos (game-planner)

## Pendientes

Ordenadas por puntuación (sobre 30). Los 20 candidatos salen de 4 pasadas en paralelo (shooters, puzzle, arcade, versus), 2026-10-18.

- [ ] **Invasores** (`invasores`, SHOOTER) — 27-28/30, coste M. Reutiliza el mock; encaja sin extensiones (vidas, nivel, 800×600) y aporta un segundo shooter con ritmo distinto a Asteroides. Siguiente: `/add-game invasores`. _(sugerido 2026-10-18)_
- [ ] **Duelo Pixel** (`duelo-pixel`, VERSUS) — 28/30, coste S/M. Pong contra la CPU; única vía para cubrir VERSUS (0 motores). Riesgo: puntuación contra la CPU (farmeo de rebotes; tope de duración o aceleración). Siguiente: `/add-game duelo-pixel`. _(sugerido 2026-10-18)_
- [ ] **2048 Neón** (`dos-mil`, PUZZLE) — 26/30, coste S. Tablero 4×4 con flechas; el más barato. Sin mock (entrada nueva en `lib/games.ts`, portada y migración). Siguiente: `/add-game dos-mil`. _(sugerido 2026-10-18)_
- [ ] **Ranaria** (`ranaria`, ARCADE) — 23-25/30, coste M. Frogger; reutiliza el mock, pero ARCADE ya tiene 2 motores. Siguiente: `/add-game ranaria`. _(sugerido 2026-10-18)_
- [ ] **Aire Hockey** (`aire-hockey`, VERSUS) — 25/30, coste M. Solo después de `duelo-pixel`. Riesgo: física círculo-círculo e IA defensiva. _(sugerido 2026-10-18)_
- [ ] **Defensa de Misiles** (`defensa-misiles`, SHOOTER) — 24/30, coste M. Missile Command; el más distinto de Asteroides. Riesgo: mira con teclado; `lives` como ciudades o `lives: false`. _(sugerido 2026-10-18)_
- [ ] **Gemas** (`gemas`, PUZZLE) — 23/30, coste M. Match-3 con cursor y Espacio. Riesgo: cascadas y regeneración sin jugadas. _(sugerido 2026-10-18)_
- [ ] **Parejas** (`parejas`, PUZZLE) — 23/30, coste S. Memoria con símbolos neón y niveles crecientes. _(sugerido 2026-10-18)_
- [ ] **Salto Neón** (`salto-neon`, ARCADE) — 23/30, coste S. Estilo Flappy, un botón, una vida. Riesgo: `preventDefault` del espacio y paso de tiempo fijo. _(sugerido 2026-10-18)_
- [ ] **Escuadrón Neón** (`nave-vertical`, SHOOTER) — 23/30, coste M/L. Shoot'em up vertical con power-ups y jefe; solapa con Asteroides. Hacerlo tras `invasores` y con alcance recortado. _(sugerido 2026-10-18)_
- [ ] **Topo Neón** (`topo-neon`, ARCADE) — 22/30, coste S. Whack-a-mole con teclas 1-9; ARCADE ya tiene 2 motores. _(sugerido 2026-10-18)_
- [ ] **Minas** (`minas`, PUZZLE) — 22/30, coste M. Buscaminas con teclado (penaliza la entrada); la pausa debe congelar el reloj. _(sugerido 2026-10-18)_
- [ ] **Glotón** (`gloton`, ARCADE) — 22-23/30, coste L. Comecocos; reutiliza el mock pero la IA de fantasmas y el laberinto son el mayor riesgo. _(sugerido 2026-10-18)_
- [ ] **Corredor** (`corredor`, ARCADE) — 22/30, coste S/M. Endless runner; solapa con `salto-neon`, elegir uno. _(sugerido 2026-10-18)_
- [ ] **Arena Twin** (`arena-twin`, SHOOTER) — 22/30, coste M. Twin-stick por oleadas; WASD + flechas es incómodo. _(sugerido 2026-10-18)_
- [ ] **Fortín** (`fortin`, SHOOTER) — 21/30, coste M. Torreta que defiende un núcleo; el menú de mejoras choca con la regla de no texto en canvas. _(sugerido 2026-10-18)_
- [ ] **Autopista** (`autopista`, ARCADE) — 21/30, coste M. Carreras top-down; solapa con `corredor`. _(sugerido 2026-10-18)_
- [ ] **Ritmo Teclas** (`ritmo-teclas`, ARCADE) — 20/30, coste M. Riesgo alto en sincronía y audio con licencia; mejor procedural y sin audio. _(sugerido 2026-10-18)_
- [ ] **Cajas** (`cajas`, PUZZLE) — 20/30, coste M. Sokoban; ranking débil (soluciones fijas llenan el Top 50 de empates). _(sugerido 2026-10-18)_
- [ ] **Tiro Blanco** (`tiro-blanco`, SHOOTER) — 19/30, coste S/M. Depende del ratón; la candidata más débil. _(sugerido 2026-10-18)_

## Implementados

- [x] **Snake** (`snake`) — SPEC 09
- [x] **Asteroides** (`asteroides`) — SPEC 05
- [x] **Tetris** (`tetris`) — SPEC 07
- [x] **Arkanoid** (`arkanoid`) — SPEC 08

## Descartados

- `rocas`, `caida`, `bloque-buster` — duplican los motores de asteroides, tetris y arkanoid.
