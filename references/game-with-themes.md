# Juegos con skins

Referencia de qué juegos con motor tienen cada skin. Lo mantiene el agente `skin-designer` (`.claude/agents/skin-designer.md`), que aplica **una skin a un juego por ejecución**, los que indique el usuario.

Leyenda: ✅ implementada y verificada · ⬜ pendiente · ⚠️ implementada con observaciones.

`CLÁSICO` es la skin por defecto y equivale a la paleta actual de la plataforma.

## Juego × Skin

| Juego        | CLÁSICO | NEÓN | RETRO | PASTEL | Última actualización |
| ------------ | ------- | ---- | ----- | ------ | -------------------- |
| `asteroides` | ✅      | ⬜   | ⬜    | ⬜     | —                    |
| `tetris`     | ✅      | ⬜   | ⬜    | ⬜     | —                    |
| `arkanoid`   | ✅      | ⬜   | ⬜    | ⬜     | —                    |
| `snake`      | ✅      | ⬜   | ⬜    | ⬜     | —                    |

## Paletas por skin

Se rellena la primera vez que se implementa cada skin (hex de cada token).

## Infraestructura

- `lib/games/skins.ts`: pendiente; se crea en la primera ejecución.
- Token `--game-bg` y fondo de motores: pendiente.
- `GameEngine.refreshPalette?` y `GameCanvas`: pendiente.
- Selector de skin en `GamePlayer` (`data-skin` / `data-game` en `.crt`): pendiente.

## Historial

Una línea por ejecución: fecha · juego · skin · archivos tocados · observaciones.

- (sin ejecuciones todavía)
