# Juegos con skins

Referencia de qué juegos con motor tienen cada skin. Lo mantiene el agente `skin-designer` (`.claude/agents/skin-designer.md`), que aplica **una skin a un juego por ejecución**, los que indique el usuario.

Leyenda: ✅ implementada y verificada · ⬜ pendiente · ⚠️ implementada con observaciones.

`CLÁSICO` es la skin por defecto y equivale a la paleta actual de la plataforma.

## Juego × Skin

| Juego        | CLÁSICO | NEÓN | RETRO | PASTEL | Última actualización |
| ------------ | ------- | ---- | ----- | ------ | -------------------- |
| `asteroides` | ✅      | ✅   | ✅    | ⬜     | 2026-10-18           |
| `tetris`     | ✅      | ⬜   | ⬜    | ⬜     | —                    |
| `arkanoid`   | ✅      | ⚠️   | ⚠️    | ⬜     | 2026-10-18           |
| `snake`      | ✅      | ⚠️   | ⚠️    | ⬜     | 2026-10-18           |
| `frogger`    | ✅      | ⚠️   | ⚠️    | ⚠️     | 2026-10-19           |

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
- Token `--game-bg` (más `--game-glow` y `--game-glow-asteroid`) en `:root`; `.crt-screen` usa `--game-bg`. Motores migrados: asteroides, snake (fondo `--game-bg`, glow de la cabeza `--game-glow-snake`, opcional, 14 por defecto; `refreshPalette`). arkanoid (fondo `--game-bg`, glow escalado por `--game-glow`, tokens opcionales `--game-red`/`--game-hotpink`/`--game-gray` para los bloques con color fijo; `refreshPalette`). frogger (fondo, glow `--game-glow`, `refreshPalette`; ya venía migrado). Pendiente: tetris (sigue con `"#000"` fijo).
- `GameEngine.refreshPalette?` en `lib/games/types.ts`; `GameCanvas` la llama al cambiar la prop `skin` (sin reiniciar). Implementada en asteroides.
- Selector en `GamePlayer` (grupo de botones en la HUD, solo si el juego tiene más de una skin en `GAME_SKINS`); pone `data-skin` y `data-game` en `.crt`. La skin guardada se lee tras montar (`useEffect`), por lo que hay un fotograma en clásico antes de aplicar la guardada.

## Historial

Una línea por ejecución: fecha · juego · skin · archivos tocados · observaciones.

- 2026-10-18 · asteroides · neón · `lib/games/skins.ts` (nuevo), `lib/games/types.ts`, `lib/games/asteroids/{constants,entities,engine}.ts`, `components/game-canvas.tsx`, `components/game-player.tsx`, `app/globals.css` · Infraestructura montada. Contraste medido sobre `#000004`: nave 16.7, bala 19.3, asteroide 21.0, power-up 6.6 (todos ≥ 3). Nave/bala/asteroide se distinguen por tono y forma, no por luminancia (ratios entre sí 1.1–1.3). El hook Prettier reformateó todo `app/globals.css` (diff grande solo de formato).
- 2026-10-18 · asteroides · retro · `lib/games/skins.ts`, `app/globals.css` (el motor ya leía todo de tokens, sin cambios) · Contraste sobre `#0a0804`: nave 14.9, bala 10.9, asteroide 16.9, power-up 7.0, llama 8.5; HUD `--ink` sobre `--bg-2` 15.9. Cambio en caliente y persistencia tras recarga verificados; capturas en el scratchpad (`ast-retro.png`, `ast-clasico.png`). Nota: lanzar `npm run build` con el dev server activo dejó el CSS servido obsoleto hasta tocar `globals.css`.
- 2026-10-18 · snake · neón · `lib/games/snake/{constants,engine}.ts` (fondo y glow desde tokens, `refreshPalette`), `lib/games/skins.ts`, `app/globals.css` (`.crt[data-skin="neon"][data-game="snake"]` con `--game-glow-snake: 30`; paleta neón reutilizada) · ⚠️ porque `npm run build` no se ejecutó (dev server compartido con otro agente; lint y `tsc` limpios). Contraste sobre `#12002b`: cabeza `#39ff14` 14.6, cuerpo (70 % alfa) ~6.3, rejilla/ink 9.8, fruta de respaldo `#b6ff00` 16.3. Frutas: sprites tal cual (mantienen su color; se distinguen de la serpiente por forma y tono, aunque la kiwi/verde se parece a la serpiente). Cambio en caliente sin reiniciar y persistencia verificados. Capturas: `.playwright-mcp/snake-neon-play.png`, `snake-clasico-play.png`, `snake-neon.png`.

- 2026-10-18 · arkanoid · neón · `lib/games/arkanoid/{constants,engine}.ts`, `lib/games/skins.ts`, `app/globals.css` (bloque `.crt[data-skin="neon"][data-game="arkanoid"]` con `--game-red #ff7a1a`, `--game-hotpink #4f8bff`, `--game-gray #ffd60a`, porque esos tres colores de bloque eran fijos y chocaban con la paleta neón) · ⚠️ porque `npm run build` no se ejecutó (dev server activo; lint y `tsc` limpios). Contraste sobre `#12002b`: naranja 7.6, turquesa 15.5, rosa 6.2, lima 16.3, azul 6.1, verde 14.6, dorado 14.0, pelota `#c9a6ff` 9.8, HUD `--ink` sobre `--bg-2` 15.9. Filas distinguibles por tono (hues 25/173/312/77/220/111). Glow: `shadowBlur` base × escala de `--game-glow` (clásico ×1, intacto; neón ×3) y glow de bloques solo si glow > 10. Cambio en caliente sin reiniciar y persistencia verificados. Capturas: `scratchpad/ark-neon.png`, `ark-clasico.png`. Nota: el CSS servido quedó obsoleto hasta tocar `globals.css`.
- 2026-10-18 · snake · retro · `lib/games/skins.ts`, `app/globals.css` (`.crt[data-skin="retro"][data-game="snake"]` con `--game-glow-snake: 0`; paleta retro reutilizada, motor sin cambios) · ⚠️ porque `npm run build` no se ejecutó (dev server compartido). Contraste sobre `#0a0804`: cabeza `#33ff66` 14.9, cuerpo (70 % alfa) 7.4, fruta de respaldo `#ff6a3d` 7.0, ink 16.9; rejilla decorativa 1.1. Fruta de respaldo vs serpiente: 2.1 de luminancia, se distinguen por tono (naranja/verde) y forma (círculo/segmentos). Frutas sprite tal cual (sin filtro); la kiwi/verdes se parecen a la serpiente. Selector, persistencia tras recarga y `data-skin` verificados; el cambio en caliente usa `refreshPalette` ya validado en neón. Capturas: `.playwright-mcp/snake-retro.png`, `snake-clasico-retro-check.png`.
- 2026-10-18 · arkanoid · retro · `lib/games/skins.ts`, `app/globals.css` (bloque `.crt[data-skin="retro"][data-game="arkanoid"]`: `--green #b5e61d` porque en retro `--cyan` y `--green` eran ambos `#33ff66`, `--game-red #c8321f`, `--game-hotpink #ffe9a8`, `--game-gray #a89878`; el motor no cambió) · ⚠️ porque `npm run build` no se ejecutó (dev server activo; eslint limpio). Contraste sobre `#0a0804`: cyan 14.9, verde lima 13.6, ámbar 10.9, naranja 7.0, rojo ladrillo 3.7, crema 16.7, tan ~7, pelota/ink 16.9. Filas distinguibles por tono y luminancia (el rojo ladrillo es el más oscuro; cyan y lima son los más próximos). Cambio en caliente sin reiniciar (puntuación 20 a 50 al alternar) y persistencia tras recarga verificados. Capturas: `.playwright-mcp/ark-retro.png`, `ark-clasico-r.png`. El CSS servido quedó obsoleto hasta editar `globals.css`.
- 2026-10-19 · frogger · neón, retro y pastel · `lib/games/skins.ts`, `app/globals.css` (bloque base `.crt[data-skin="pastel"]` nuevo; overrides `[data-game="frogger"]`: neón `--magenta #ff7a1a` porque la carretera lima se confundía con la rana verde, retro `--green #b5e61d` porque río y rana eran ambos `#33ff66`; motor sin cambios, ya leía todo de tokens) · Las tres ⚠️ porque `npm run build` no se ejecutó (dev server compartido; eslint y `tsc` limpios). Contraste sobre el fondo (rana/carretera/río/oro/ink): neón 14.6/7.6/6.2/15.5/9.8, retro 13.6/7.0/14.9/10.9/16.9, pastel 12.7/9.1/10.4/11.9/10.7; HUD `--ink` sobre `--bg-2` 15.9. Pastel: luminancias casi iguales entre sí, solo el tono distingue; entidades algo apagadas por los alfas del motor. Cambio de skin en caliente y persistencia tras recarga (pastel) verificados. Capturas: `.playwright-mcp/frogger-{clasico,neon,retro,pastel}.png` (con el modal de fin de partida abierto: la rana murió sin entrada).
