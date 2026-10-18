# Game jam — PAREJAS

> **Fecha:** 2026-10-18
> **Tema recibido:** juego de memoria "Parejas" (id `parejas`, PUZZLE), sugerido en `references/game-suggestions-todo.md` como "Memoria con símbolos neón y niveles crecientes" (23/30, coste S).
> **Estado de los specs:** `Borrador`

## Juego elegido

**PAREJAS** (`parejas`, `PUZZLE`, color `cyan`): tablero de cartas boca abajo en el que se mueve un cursor con el teclado y se voltean dos cartas por turno. Seis niveles con tableros crecientes (3×4 hasta 6×6), una barra de tiempo por nivel y combos de aciertos seguidos. Una sola partida dura 4 a 8 minutos.

Por qué encaja con la plataforma:

- Encaja en `GameEngine` sin extensiones: canvas 800×600 por defecto y `ENGINE_META.parejas = { lives: false }`, igual que Snake (SPEC 09). Emite `score` y `level`.
- Todo es vectorial: las caras son formas dibujadas con trazos (no hay assets), con colores de los tokens del tema. El canvas no lleva texto; el tiempo se muestra como una barra.
- Equilibra el catálogo: PUZZLE pasa de 1 a 2 motores (Tetris y Parejas) y es el más barato de los puzzles.
- Ranking sano: puntuación entera con tope teórico de unos 50 000, partida corta y con final claro (victoria al limpiar el nivel 6, derrota al agotar el tiempo).

## Candidatos

Puntuación de 1 a 5 por criterio (5 = mejor; en coste, 5 = bajo). Total sobre 30.

| Candidato               | Contrato | Ranking | Catálogo | Reutilización | Estética | Coste/riesgo | Total | Talla |
| ----------------------- | :------: | :-----: | :------: | :-----------: | :------: | :----------: | :---: | :---: |
| **Parejas** (`parejas`) |    5     |    4    |    4     |       3       |    4     |      5       | 25/30 |   S   |
| 2048 Neón (`dos-mil`)   |    5     |    4    |    4     |       2       |    4     |      5       | 24/30 |   S   |
| Gemas (`gemas`)         |    4     |    4    |    4     |       2       |    4     |      3       | 21/30 |   M   |

Notas:

- Parejas sube de 23 (backlog) a 25: el contrato es limpio con `lives: false`, reutiliza el patrón de Snake (rejilla, cursor, nivel, paso con `dt`) y no necesita assets.
- 2048 Neón queda como siguiente puzzle barato, pero compite en PUZZLE con Parejas; mejor en otra ejecución.
- Gemas descartado en esta ejecución: cascadas y regeneración sin jugadas son riesgo M.
- Ids descartados por duplicados: ninguno de los tres existe en `ENGINES`, `lib/games.ts`, `specs/game-jam/` ni en la memoria.
- No hay mock equivalente en el catálogo: se crea una **entrada nueva** (no se reutiliza ni renombra ninguna).

## Specs y orden de implementación

Numeración real propuesta: el siguiente libre en `specs/` es el 10. Mientras estén en `specs/game-jam/parejas/` llevan `XX`.

| Orden | Archivo                             | Número propuesto | Contenido                                                               | Talla |
| :---: | ----------------------------------- | :--------------: | ----------------------------------------------------------------------- | :---: |
|   1   | `01-juego-parejas.md`               |     SPEC 10      | Juego base: motor, 6 niveles, combos, barra de tiempo, ranking, portada |   S   |
|   2   | `02-parejas-raton-y-animaciones.md` |     SPEC 11      | Ratón sobre el canvas, animación de volteo y destello al emparejar      |   S   |
|   3   | `03-parejas-cartas-especiales.md`   |     SPEC 12      | Cartas especiales RELOJ y OJO (tiempo extra y vistazo) desde el nivel 3 |   S   |

Cada spec se implementa por separado con `/spec-impl`. El 02 y el 03 dependen del 01, y son independientes entre sí (el 03 no necesita el ratón ni las animaciones del 02). Al moverlos a `specs/`, sustituir `XX` por el número real y ajustar las referencias cruzadas (`SPEC XX-01` pasa a `SPEC 10`, `XX-02` a `SPEC 11`, `XX-03` a `SPEC 12`).

## Decisiones del agente que conviene revisar

1. **Color `cyan`** para la entrada del catálogo. Tetris es `yellow`; `cyan` y `magenta` están igual de repartidos. Cambiable sin impacto.
2. **Sin vidas, con barra de tiempo.** Se descartó usar los fallos como vidas (en 6×6 un fallo es inevitable). La derrota llega por tiempo agotado. La barra de tiempo es vectorial, sin texto, para no ampliar `GameStats` ni el HUD con un reloj.
3. **Seis niveles y victoria al limpiar el 6.** Mismo patrón que Arkanoid (`onGameOver` al terminar el último nivel), sin pantalla de victoria propia.
4. **Puntuación**: 100 por pareja × combo (máx. ×5), bonus de nivel por segundos sobrantes y bonus de 500 por nivel sin fallos. Todos los valores son propuestas y se ajustan al probar la partida.
5. **Teclado únicamente en el 01**: cursor con ← ↑ ↓ → o WASD (con vuelta al borde) y volteo con Espacio o Enter. El ratón va al 02 para que el 01 sea mínimo.
6. **Caras = forma × color**: 9 formas × 4 colores de tokens (cyan, magenta, yellow, green) dan 36 caras únicas; el motor sortea las del nivel. Se verifica que ningún par comparte forma y color con otro (accesibilidad parcial: forma distinta aunque el color falle).
7. **Vista previa al inicio de cada nivel** (1 s + 100 ms por pareja) con las cartas boca arriba y el tiempo parado.
8. **`sort_order = 12`** en la migración (Arkanoid tiene 11). El spec obliga a comprobar el máximo real antes de aplicarla.
9. **Sin sonido** en los tres specs. Se puede proponer en una ejecución futura (el patrón de Arkanoid usa MP3 y aquí no hay assets).
10. **Dependencia de SPEC 07** (por `ENGINE_META` y `lives: false`), aunque no se extiende el contrato.

## Siguiente paso

Revisar los tres specs. Si se aprueban, moverlos a `specs/10-juego-parejas.md`, `specs/11-parejas-raton-y-animaciones.md` y `specs/12-parejas-cartas-especiales.md`, cambiar `Status` y lanzar `/spec-impl` empezando por el 01.
