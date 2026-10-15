# Complemento de plantilla para specs de juego

Este archivo **no sustituye** a `.claude/skills/spec/template.md`. Indica qué contenido de juego va en cada sección de esa plantilla (títulos en español, como SPEC 05/06). Los marcadores `<…>` se rellenan con las respuestas del usuario; todo lo demás es el patrón fijo. Adáptalo: no copies literalmente lo que no aplique.

---

## Cabecera

```markdown
# SPEC NN — Juego <Título> jugable en la plataforma con ranking

> **Status:** Borrador
> **Depends on:** SPEC 05, SPEC 06<, SPEC XX si extendió el contrato>
> **Date:** <fecha de la sesión>
> **Objective:** Portar <a TypeScript el juego de `references/started-games/<carpeta>` | un juego nuevo> como `<id>` en Arcade Vault, jugable con HUD, pausa y modal de la plataforma, y con leaderboard en `/salon/<id>`.
```

## Por qué existe este spec

Qué hay hoy (mock o nada) y por qué el código original no se puede insertar tal cual (globals, `document`, listeners sin limpieza, HUD y overlays propios). Si extiende el contrato, explica la extensión y por qué.

## Alcance

**Dentro** (ajusta a las respuestas):

- Motor en `lib/games/<id>/` sin globals ni `document`, con las mecánicas conservadas: `<lista concreta>`.
- Entrada en `ENGINES` de `lib/games/registry.ts`.
- `<Entrada nueva | actualización de la entrada existente `<id>`>` en `lib/games.ts` y portada `cover-<id>` en `app/globals.css`.
- Leyenda de teclas en `CONTROLS` de `components/game-player.tsx`.
- Migración `supabase/migrations/<timestamp>_<id>_ranked.sql` con `ranked = true`, aplicada con `apply_migration`.
- Teclado: `<teclas>`; `P` y `Esc` alternan la pausa; sin scroll de página con las teclas de juego.
- Estética vectorial con acentos neón desde los tokens del tema.
- `<Extensión del contrato, si aplica>`.
- Nota breve en `CLAUDE.md`.

**Fuera de alcance:** otros juegos (cada uno con su spec); controles táctiles o gamepad; `<mecánicas del original que se descartan>`; `<sonido o assets si se descartan>`; antitrampas, auth y moderación de nombres (siguen como en SPEC 06); tests automatizados.

## Modelo de datos

- Sin tablas nuevas: `games` y `scores` ya existen (SPEC 06). El único cambio de datos es `ranked = true` para `<id>`.
- Archivos del motor (estructura y tipos clave del juego, en TypeScript corto).
- Tamaño lógico del canvas `<800×600 | WxH>`, unidades y `dt` limitado a 50 ms.
- Puntuación: tabla de puntos del juego, con tope bajo 10 000 000.
- `<Extensión del contrato con su tipo exacto, si aplica>`.

## Plan de implementación

Cada paso deja la app funcional y se verifica. Antes de cada paso se consulta la guía relevante en `node_modules/next/dist/docs/`; la UI nueva (portada, leyenda) se diseña con `/frontend-design`.

1. `<Extensión de contrato, solo si aplica>` Verificación: `tsc` y lint sin errores; `asteroides` no cambia.
2. Constantes y entidades en `lib/games/<id>/`. Verificación: `tsc`.
3. Motor `engine.ts` y registro en `ENGINES`. Verificación: `tsc`.
4. Catálogo y portada. Verificación: `/juegos` muestra la tarjeta y `/juegos/<id>` abre la ficha.
5. Leyenda `CONTROLS`. Verificación: `/juegos/<id>/jugar` muestra canvas y leyenda.
6. Migración `ranked`. Verificación: `execute_sql` confirma `ranked = true` solo para los ids de `ENGINES`; `get_advisors` sin avisos nuevos.
7. Partida completa. Verificación: game over, guardado en `scores` y fila en `/salon/<id>` y `/salon`.
8. Pulido y responsive a 375, 768 y 1280 px.
9. `CLAUDE.md`. Verificación: `git diff` solo contiene archivos de este spec.

## Criterios de aceptación

Comunes (todos booleanos, ajusta los nombres):

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] Existen los archivos del motor y ninguno referencia `document` ni estado global.
- [ ] `<id>` está en `ENGINES` y `ranked = true` en `games`; ambos coinciden.
- [ ] `/juegos/<id>/jugar` renderiza el canvas, no la arena mock.
- [ ] El HUD de la plataforma refleja puntuación `<, vidas> y nivel` reales al instante.
- [ ] `<Una línea por mecánica y por regla de puntuación del juego>`.
- [ ] Al terminar la partida se abre el modal `FIN DEL JUEGO` con la puntuación real y el motor se detiene.
- [ ] El botón FIN termina la partida; `JUGAR DE NUEVO` empieza otra desde cero.
- [ ] PAUSA, `P` y `Esc` detienen el juego sin salto de tiempo al reanudar.
- [ ] Las teclas de juego no hacen scroll de la página.
- [ ] El canvas no dibuja HUD ni texto `GAME OVER`.
- [ ] `GUARDAR PUNTUACIÓN` inserta una fila en `scores` con el nombre en mayúsculas y no escribe en `localStorage["av_scores"]`.
- [ ] La fila aparece en `/salon/<id>` y suma en `/salon`; hay una pestaña `<TÍTULO>` en el salón.
- [ ] `/juegos` y `/juegos/<id>` muestran `best` y `plays` desde `game_stats`.
- [ ] `/salon/<id>` responde 200 y los demás ids sin motor siguen en 404.
- [ ] Al salir de la pantalla de juego no quedan listeners ni `requestAnimationFrame`: tras volver, una pulsación produce una sola acción.
- [ ] Recargar `/juegos/<id>/jugar` no da errores de hidratación ni en consola.
- [ ] A 375 px no hay scroll horizontal y el canvas conserva su aspecto.
- [ ] `<Si reutiliza mock: no se crea entrada duplicada | si no: la entrada mock `<id-mock>` no cambia>`.
- [ ] `<Si extiende el contrato: `asteroides` se comporta exactamente igual>`.
- [ ] `CLAUDE.md` documenta el juego y las extensiones.

## Decisiones

Incluye siempre, con su motivo:

- **Sí:** `<entrada nueva | reutilizar mock>` (decisión del usuario). **No:** `<la alternativa>`.
- **Sí:** HUD, pausa y modal de la plataforma; el motor solo emite datos. **No:** HUD u overlays en el canvas.
- **Sí:** guardado en `scores` solo para juegos con motor. **No:** localStorage para este juego.
- **Sí:** estética neón desde los tokens del tema. **No:** copiar la paleta del original.
- **Sí / No** de cada mecánica, asset y sonido conservado o descartado.
- **Sí / No** de la extensión del contrato, si aplica.

## Riesgos

Incluye los que apliquen:

| Riesgo                                               | Mitigación                                                            |
| ---------------------------------------------------- | --------------------------------------------------------------------- |
| Doble montaje en Strict Mode crea dos motores        | `destroy()` en el cleanup; criterio sobre listeners y acción única    |
| Listeners de teclado persistentes                    | Registrados en `start()`, retirados en `destroy()`                    |
| `preventDefault` rompe botones o el input del modal  | No prevenir si el foco está en `button`, `input` o `a`                |
| `ranked` y `ENGINES` se desincronizan                | Criterio de aceptación sobre ambos; la migración forma parte del plan |
| Salto de `dt` al pausar o cambiar de pestaña         | `dt` limitado a 50 ms y `lastTime` reiniciado al reanudar             |
| `shadowBlur` penaliza el rendimiento                 | Brillo solo en los elementos principales                              |
| `<Específicos: assets, sonido, aspecto del canvas…>` | `<mitigación>`                                                        |

## Qué **no** está en este spec

Repite lo de "Fuera de alcance": otros juegos, cambios en el mock no reutilizado, controles táctiles, auth y antitrampas, moderación, tests automatizados. Cada uno, si se aborda, va en su propio spec.
