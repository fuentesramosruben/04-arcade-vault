# Juegos con skins

Referencia de qué juegos con motor tienen cada skin. Lo mantiene el agente `skin-designer` (`.claude/agents/skin-designer.md`), que aplica **una skin a un juego por ejecución**, los que indique el usuario.

Leyenda: ✅ implementada y verificada · ⬜ pendiente · ⚠️ implementada con observaciones.

`CLÁSICO` es la skin por defecto y equivale a la paleta actual de la plataforma.

## Juego × Skin

| Juego        | CLÁSICO | NEÓN | RETRO | PASTEL | Última actualización |
| ------------ | ------- | ---- | ----- | ------ | -------------------- |
| `asteroides` | ✅      | ✅   | ✅    | ⬜     | 2026-10-18           |
| `tetris`     | ✅      | ⬜   | ⬜    | ⬜     | —                    |
| `arkanoid`   | ✅      | ⬜   | ⬜    | ⬜     | —                    |
| `snake`      | ✅      | ⬜   | ⬜    | ⬜     | —                    |

## Paletas por skin

Los tokens se definen en `app/globals.css` con `.crt[data-skin="<skin>"]` (solo afectan al marco CRT y al canvas, no a la HUD exterior).

**Clásico** (`:root`, intacta): `--cyan #00f5ff`, `--magenta #ff006e`, `--yellow #f5ff00`, `--green #00ff88`, `--ink #e6e9ff`, `--game-bg #000`, `--game-glow 10`, `--game-glow-asteroid 0`. Llama del propulsor: `DEFAULT_PALETTE.flame` (`rgba(255,130,0,.85)`).

**Neón** (synthwave, revisada el 2026-10-18 porque la primera versión era casi idéntica a clásico; reutilizar en los demás juegos):

| Token                  | Valor     | Nota                                                 |
| ---------------------- | --------- | ---------------------------------------------------- |
| `--cyan`               | `#ff2bd6` | rosa eléctrico (nave); el nombre del token no cambia |
| `--magenta`            | `#b6ff00` | lima (power-up)                                      |
| `--yellow`             | `#00ffe1` | turquesa (bala)                                      |
| `--green`              | `#39ff14` |                                                      |
| `--ink`                | `#c9a6ff` | lila (asteroides)                                    |
| `--game-bg`            | `#12002b` | violeta noche                                        |
| `--game-flame`         | `#ff5ad0` | llama del propulsor (opcional, por juego)            |
| `--game-glow`          | `40`      | `shadowBlur` en px (sin unidad) para elementos clave |
| `--game-glow-asteroid` | `16`      | glow de trazos secundarios (asteroides, partículas)  |

Además, `.crt[data-skin="neon"] .crt-screen` añade un brillo interior rosa. Asteroides en neón: nave `--cyan`, bala `--yellow`, asteroide `--ink`, power-up `--magenta`. Contraste sobre `#12002b` calculado a ojo, sin script.

**Retro** (fijada el 2026-10-18, fósforo verde + ámbar, sin glow):

| Token                                  | Valor     | Nota                    |
| -------------------------------------- | --------- | ----------------------- |
| `--cyan` / `--green`                   | `#33ff66` | verde fósforo           |
| `--yellow`                             | `#ffb000` | ámbar                   |
| `--magenta`                            | `#ff6a3d` | naranja rojizo (acento) |
| `--ink`                                | `#d8f5c0` | blanco fósforo          |
| `--game-bg`                            | `#0a0804` | casi negro cálido       |
| `--game-flame`                         | `#ff8a1f` |                         |
| `--game-glow` / `--game-glow-asteroid` | `0` / `0` | sin glow                |

Asteroides en retro: nave verde, bala ámbar, asteroide blanco fósforo, power-up naranja.

## Infraestructura

- `lib/games/skins.ts`: hecho (`SKINS`, `SkinId`, `DEFAULT_SKIN`, `SKIN_LABELS`, `GAME_SKINS`, `getGameSkins`, `getStoredSkin`, `storeSkin`; clave `av_skin_<id>`).
- Token `--game-bg` (más `--game-glow` y `--game-glow-asteroid`) en `:root`; `.crt-screen` usa `--game-bg`. Motores migrados: asteroides. Pendientes: tetris, arkanoid, snake (siguen con `"#000"` fijo).
- `GameEngine.refreshPalette?` en `lib/games/types.ts`; `GameCanvas` la llama al cambiar la prop `skin` (sin reiniciar). Implementada en asteroides.
- Selector en `GamePlayer` (grupo de botones en la HUD, solo si el juego tiene más de una skin en `GAME_SKINS`); pone `data-skin` y `data-game` en `.crt`. La skin guardada se lee tras montar (`useEffect`), por lo que hay un fotograma en clásico antes de aplicar la guardada.

## Historial

Una línea por ejecución: fecha · juego · skin · archivos tocados · observaciones.

- 2026-10-18 · asteroides · neón · `lib/games/skins.ts` (nuevo), `lib/games/types.ts`, `lib/games/asteroids/{constants,entities,engine}.ts`, `components/game-canvas.tsx`, `components/game-player.tsx`, `app/globals.css` · Infraestructura montada. Contraste medido sobre `#000004`: nave 16.7, bala 19.3, asteroide 21.0, power-up 6.6 (todos ≥ 3). Nave/bala/asteroide se distinguen por tono y forma, no por luminancia (ratios entre sí 1.1–1.3). El hook Prettier reformateó todo `app/globals.css` (diff grande solo de formato).
- 2026-10-18 · asteroides · retro · `lib/games/skins.ts`, `app/globals.css` (el motor ya leía todo de tokens, sin cambios) · Contraste sobre `#0a0804`: nave 14.9, bala 10.9, asteroide 16.9, power-up 7.0, llama 8.5; HUD `--ink` sobre `--bg-2` 15.9. Cambio en caliente y persistencia tras recarga verificados; capturas en el scratchpad (`ast-retro.png`, `ast-clasico.png`). Nota: lanzar `npm run build` con el dev server activo dejó el CSS servido obsoleto hasta tocar `globals.css`.
