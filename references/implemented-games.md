# Juegos implementados

Juegos con motor propio (`lib/games/<id>/`) y ranking en Supabase (`ranked = true`). Datos de la tabla `games` y del catálogo `lib/games.ts`.

| Orden | Juego      | ID           | Categoría | Spec                                  |
| ----- | ---------- | ------------ | --------- | ------------------------------------- |
| 3     | Snake      | `snake`      | ARCADE    | [09](../specs/09-juego-snake.md)      |
| 7     | Asteroides | `asteroides` | SHOOTER   | [05](../specs/05-juego-asteroides.md) |
| 10    | Tetris     | `tetris`     | PUZZLE    | [07](../specs/07-juego-tetris.md)     |
| 11    | Arkanoid   | `arkanoid`   | ARCADE    | [08](../specs/08-juego-arkanoid.md)   |

## Detalle

### Snake

Una serpiente de luz recorre una rejilla de 20×15. Cada fruta suma `10 × nivel` puntos y la alarga; cada cinco subes de nivel y ganas velocidad. Chocar con la pared o con tu cola termina la partida. Una sola vida.

### Asteroides

Gira, propulsa y dispara tu nave en un campo sin bordes. Cada roca se parte en fragmentos más rápidos y un power-up de triple disparo puede salvarte. Limpia el campo para subir de nivel.

### Tetris

Ocho piezas (incluida una tuerca con hueco) caen sobre un pozo de 10 columnas. Rota, desliza y deja caer al instante con la sombra de aterrizaje como guía. Cada diez líneas sube el nivel. Canvas 420×600.

### Arkanoid

Mueve la pala con las flechas o el ratón y no dejes caer la pelota. Cinco niveles de muros distintos, con la pelota más rápida en cada uno, y tres vidas. Limpiar el nivel 5 termina la partida.

## Estado en la base de datos

| Juego      | Partidas guardadas | Mejor puntuación |
| ---------- | ------------------ | ---------------- |
| Asteroides | 4                  | 4180             |
| Tetris     | 2                  | 851              |
| Arkanoid   | 2                  | 230              |
| Snake      | 2                  | 150              |

## Pendientes (solo mock, sin motor ni ranking)

Están en el catálogo pero con la arena de demostración, `ranked = false`: Bloque Buster, Caída, Glotón, Invasores, Rocas, Ranaria y Duelo Pixel.
