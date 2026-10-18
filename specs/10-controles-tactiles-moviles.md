# SPEC 10 — Controles táctiles para jugar en móvil

> **Status:** Aprobado
> **Depends on:** SPEC 05, SPEC 07, SPEC 08, SPEC 09
> **Date:** 2026-10-18
> **Objective:** Permitir jugar a los 4 juegos con motor (asteroides, tetris, arkanoid y snake) en una pantalla táctil mediante botones virtuales bajo el canvas que reutilizan los controles de teclado de los motores, sin modificarlos.

---

## Por qué existe este spec

Hoy los 4 motores solo se controlan con el teclado: escuchan `keydown`/`keyup` en `window` y leen `e.code` (`ArrowLeft`, `Space`, `KeyW`…); Arkanoid añade `mousemove` sobre el canvas. En un móvil no hay teclado, así que ningún juego es jugable. Además la leyenda de teclas bajo el marco CRT no aplica en táctil, y la pausa con `P`/`Esc` no existe (el botón PAUSA de la HUD sí).

Como todos los motores dependen únicamente de `e.code` en `window`, la solución de menor riesgo es una capa de plataforma que despache `KeyboardEvent` sintéticos con los mismos códigos. Los motores, el contrato `GameEngine` y las skins no cambian. Es una decisión del usuario, igual que el esquema de botones virtuales en todos los juegos, el layout bajo el canvas y la detección solo en táctil.

---

## Alcance

**Dentro:**

- Componente `TouchControls` (Client Component) que se renderiza bajo el marco CRT en `GamePlayer` cuando el dispositivo es táctil y el juego tiene motor (`game.id in ENGINES`).
- Botones virtuales por juego, definidos en una tabla de configuración (el equivalente táctil de `CONTROLS`):
  - `asteroides`: ← → (girar), ↑ (propulsar), DISPARO (`Space`).
  - `tetris`: ← → (mover), ↓ (bajar), ↻ (rotar, `ArrowUp`), CAÍDA (`Space`).
  - `arkanoid`: ← → (mover).
  - `snake`: cruz de 4 direcciones (`ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight`).
- Despacho de eventos sintéticos: `pointerdown` → `keydown` en `window` con `code` y `key` del botón; `pointerup`, `pointercancel` y `pointerleave` → `keyup`. Mantener pulsado mantiene la tecla (los motores ya implementan sus auto-repeat con la tecla sostenida); no se disparan `keydown` repetidos desde el componente.
- Multitáctil: cada botón gestiona su propio puntero, así que se pueden mantener ← y DISPARO a la vez (asteroides).
- Detección: los controles solo se muestran con `@media (pointer: coarse)`; en esos dispositivos se oculta la leyenda de teclas (`CONTROLS`). En escritorio no cambia nada.
- Que el toque no interfiera con la página: `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none` y `contextmenu` suprimido en los botones; sin zoom por doble toque ni scroll al pulsarlos.
- Liberar teclas al pausar, terminar la partida, reiniciar y desmontar (se despacha `keyup` de las teclas pulsadas) para que no queden teclas atascadas.
- Estilo de los botones con los tokens neón del tema (`app/globals.css`), diseñado con `/frontend-design`; objetivo táctil mínimo de 48 × 48 px.
- Revisión responsive de la pantalla de juego a 360–430 px de ancho en vertical y en horizontal: HUD, botones PAUSA/FIN/SALIR, marco CRT, controles y modal de fin de partida sin scroll horizontal.
- Nota breve en `CLAUDE.md`.

**Fuera de alcance (specs futuros):**

- Gestos sobre el canvas (deslizar en Snake, arrastrar la pala en Arkanoid): decisión del usuario, solo botones virtuales.
- Extender el contrato `GameEngine` con una API de entrada, o tocar los motores.
- Controles superpuestos al canvas y bloqueo/forzado de orientación.
- Interruptor manual para mostrar u ocultar los controles.
- Hápticos (`navigator.vibrate`), sonido y gamepad.
- Los mocks sin motor (siguen con la arena simulada).
- Rediseño de las demás páginas para móvil (`/`, `/juegos`, `/salon`, `/acerca`, `/auth`) más allá de lo que bloquee la pantalla de juego.
- PWA, pantalla completa y modo offline.
- Tests automatizados (no hay framework configurado).

---

## Modelo de datos

No introduce datos persistentes ni cambios en Supabase. Estructuras nuevas, solo en cliente:

```ts
// lib/games/touch-controls.ts
export interface TouchButton {
  code: string; // KeyboardEvent.code que entiende el motor, p. ej. "ArrowLeft"
  key: string; // KeyboardEvent.key, p. ej. "ArrowLeft", " "
  label: string; // texto o símbolo visible: "←", "DISPARO"
  ariaLabel: string; // "Girar a la izquierda"
  area: "left" | "right" | "up" | "down" | "action"; // posición en la rejilla del panel
}
export interface TouchLayout {
  buttons: TouchButton[];
}
export const TOUCH_LAYOUTS: Record<string, TouchLayout>; // por id de juego con motor
```

Archivos:

```
lib/games/touch-controls.ts       # TouchButton, TOUCH_LAYOUTS y helper dispatchKey(type, button)
components/touch-controls.tsx     # panel de botones, gestión de punteros y liberación de teclas
components/game-player.tsx        # monta TouchControls y oculta la leyenda en táctil (cambio mínimo)
app/globals.css                   # estilos .touch-controls / .touch-btn
```

Convenciones:

- El panel emite eventos sobre `window` con `new KeyboardEvent("keydown" | "keyup", { code, key, bubbles: true, cancelable: true })`. `e.target` es `window`, y los motores solo comprueban `HTMLElement` en `e.target`, así que no se confunde con un `input`/`button` enfocado.
- Estado interno del componente: un `Map<pointerId, TouchButton["code"]>`; un botón se considera pulsado mientras tenga al menos un puntero. Un `keyup` solo se despacha al soltarse el último puntero de ese botón.
- `pointerdown` llama a `setPointerCapture` para seguir recibiendo `pointerup` aunque el dedo salga del botón; `pointerleave` no libera si el puntero está capturado.
- Layout del panel por rejilla CSS (`grid-template-areas`) que cambia según `data-game` para colocar el D-pad a la izquierda y las acciones a la derecha.
- Los motores no se tocan: `asteroides`, `tetris`, `arkanoid` y `snake` siguen recibiendo los mismos códigos de tecla que con el teclado.

---

## Plan de implementación

Antes de cada paso se consulta la guía relevante en `node_modules/next/dist/docs/` (Client Components, `cacheComponents`). La UI nueva se diseña con la skill `/frontend-design`.

1. **Configuración de botones.** Crear `lib/games/touch-controls.ts` con `TouchButton`, `TOUCH_LAYOUTS` para los 4 juegos y `dispatchKey`. Verificación: `tsc` sin errores y cada `code` de la tabla existe en el `GAME_KEYS` / `KEY_DIRECTIONS` del motor correspondiente.
2. **Componente `TouchControls`.** Crear `components/touch-controls.tsx`: render de botones por juego, `pointerdown`/`pointerup`/`pointercancel`, `setPointerCapture`, `Map` de punteros, liberación de teclas en `visibilitychange`, al recibir `released` y en el cleanup. Props: `gameId`, `active` (falso con pausa o game over). Verificación: `tsc`; en una página de prueba, pulsar un botón despacha un `keydown` y soltarlo un `keyup`.
3. **Estilos.** Añadir `.touch-controls` y `.touch-btn` a `app/globals.css` con tokens neón, tamaño mínimo 48 px, `touch-action: none`, `user-select: none`, estado `:active` visible y visibilidad con `@media (pointer: coarse)`. Verificación: en emulación táctil se ve el panel; en escritorio no.
4. **Integración en `GamePlayer`.** Montar `TouchControls` bajo `.crt` solo para juegos con motor, ocultar la leyenda `CONTROLS` en `(pointer: coarse)` y pasar `active = !paused && !over`. Verificación: `/juegos/snake/jugar` en emulación táctil muestra la cruz y la leyenda de teclas desaparece; en escritorio todo igual.
5. **Prueba de juego completa por motor.** Con el MCP `playwright` (emulación de móvil con `hasTouch`) jugar con toques a los 4 juegos: girar, disparar, mover, rotar, caída rápida. Verificación: cada acción tiene el efecto del teclado (la serpiente gira, la nave dispara, la pala se mueve, la pieza rota).
6. **Responsive de la pantalla de juego.** Revisar `GamePlayer` a 360, 390 y 430 px en vertical, y 844 × 390 en horizontal: HUD, botones de cabecera, marco CRT (incluida la proporción 420 × 600 de tetris), panel y modal de fin de partida. Corregir lo que desborde. Verificación: sin scroll horizontal y todo el panel visible sin hacer scroll en vertical a 390 × 844.
7. **Documentación.** Añadir a `CLAUDE.md` una nota de `components/touch-controls.tsx`, `lib/games/touch-controls.ts` y la regla: un juego nuevo con motor debe añadir su entrada a `TOUCH_LAYOUTS`. Verificación: `git diff` solo contiene archivos de este spec.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] Ningún archivo de `lib/games/{asteroids,tetris,arkanoid,snake}/` ni `lib/games/types.ts` ni `lib/games/registry.ts` cambia en el diff.
- [ ] `TOUCH_LAYOUTS` tiene una entrada para cada clave de `ENGINES`, y todos sus `code` los usa el motor correspondiente.
- [ ] En un dispositivo táctil (o emulación con `pointer: coarse`), `/juegos/<id>/jugar` de los 4 juegos con motor muestra el panel de botones bajo el marco CRT.
- [ ] En escritorio con ratón (`pointer: fine`) el panel no se muestra y la leyenda de teclas se sigue viendo, sin cambios visuales.
- [ ] En táctil la leyenda de teclas no se muestra.
- [ ] Pulsar un botón despacha un `keydown` en `window` con el `code` del botón, y soltarlo despacha un único `keyup`; mantener pulsado no despacha `keydown` repetidos.
- [ ] Snake: tocar ↑ ↓ ← → gira la serpiente y respeta la regla de no invertir 180°.
- [ ] Tetris: ← → ↓ mantenidos mueven con el auto-repeat del motor; ↻ rota; CAÍDA hace caída instantánea.
- [ ] Arkanoid: ← → mantenidos mueven la pala y soltar la detiene.
- [ ] Asteroides: se puede mantener ← o → a la vez que DISPARO (multitáctil), y ↑ propulsa.
- [ ] Sacar el dedo del botón sin soltar no deja la tecla atascada: al levantar el dedo se despacha `keyup`.
- [ ] Al pulsar PAUSA, terminar la partida, reiniciar o salir de la pantalla no queda ninguna tecla virtual pulsada.
- [ ] Pulsar los botones no hace scroll de la página, no hace zoom por doble toque, no selecciona texto ni abre el menú contextual.
- [ ] Cada botón mide al menos 48 × 48 px y tiene `aria-label`.
- [ ] A 390 × 844 la pantalla de juego (HUD, canvas, panel) entra sin scroll horizontal, y los botones del panel se ven completos sin tapar el canvas.
- [ ] A 844 × 390 (horizontal) no hay scroll horizontal y el panel y el canvas siguen siendo utilizables.
- [ ] El modal `FIN DEL JUEGO` se ve completo a 360 px de ancho y el campo de nombre abre el teclado del móvil sin que los botones virtuales respondan al teclear.
- [ ] Los botones PAUSA, FIN y SALIR funcionan con el dedo y PAUSA detiene el juego sin `P`/`Esc`.
- [ ] El selector de skin sigue funcionando con el dedo y el panel conserva su estilo con las 4 skins.
- [ ] Los juegos siguen funcionando exactamente igual con teclado en escritorio.
- [ ] Recargar `/juegos/<id>/jugar` no produce errores de hidratación ni en la consola.
- [ ] `CLAUDE.md` documenta el panel táctil y la regla para juegos nuevos.

---

## Decisiones

- **Sí:** `KeyboardEvent` sintéticos en `window` (decisión del usuario). **No:** extender `GameEngine` con una API de entrada ni que cada motor escuche `touch`/`pointer`; habría que tocar los 4 motores y duplicar lógica.
- **Sí:** botones virtuales en todos los juegos (decisión del usuario). **No:** gestos sobre el canvas (deslizar en Snake, arrastrar en Arkanoid); se pueden añadir en un spec futuro si los botones no se sienten bien.
- **Sí:** panel bajo el marco CRT, sin superponer ni forzar orientación (decisión del usuario). **No:** `screen.orientation.lock`, que no funciona en iOS Safari.
- **Sí:** mostrar los controles solo con `(pointer: coarse)` (decisión del usuario). **No:** interruptor manual; añade estado y UI que nadie ha pedido. Limitación aceptada: un portátil con pantalla táctil y ratón (`pointer: fine`) no ve el panel.
- **Sí:** una tabla `TOUCH_LAYOUTS` por id de juego. **No:** deducir los botones de `CONTROLS` (texto de la leyenda, no códigos de tecla).
- **Sí:** botones sostenidos con `setPointerCapture` y `keyup` al soltar. **No:** disparar `keydown` repetidos desde el componente; Tetris y Arkanoid ya implementan su propio auto-repeat con la tecla sostenida.
- **Sí:** Arkanoid solo con ← → sobre el panel. **No:** arrastrar el dedo sobre el canvas para mover la pala (gesto), aunque el motor ya soporta ratón.
- **Sí:** liberar siempre las teclas virtuales al pausar, terminar o desmontar. **No:** confiar en que el usuario suelte el botón, para evitar teclas atascadas.
- **Sí:** probar con la emulación táctil de Playwright. **No:** exigir un dispositivo físico en este spec; queda como prueba manual recomendada.
- **Sí:** el botón PAUSA existente cubre la pausa en móvil. **No:** botón de pausa propio en el panel.

---

## Riesgos

| Riesgo                                                                              | Mitigación                                                                                                                  |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Tecla atascada si el navegador pierde el `pointerup` (cambio de pestaña, alerta)    | `setPointerCapture`, `pointercancel` y `visibilitychange` liberan todas las teclas; también al pausar, terminar y desmontar |
| Los motores comprueban `isInteractive(e.target)` y los eventos sintéticos no llegan | Se despachan en `window` (target no es `HTMLElement`); criterio de aceptación sobre cada juego en emulación táctil          |
| Un botón enfocado reacciona a `Space` del motor (Tetris/asteroides)                 | Los botones usan `tabIndex={-1}`, `onPointerDown` con `preventDefault` y se desenfocan; no se manejan por `click`           |
| `touch-action` y scroll de página hacen que el dedo desplace la pantalla            | `touch-action: none` en el panel y `overscroll-behavior` en la pantalla de juego; criterio de aceptación sobre scroll       |
| iOS Safari: zoom por doble toque, selección y menú contextual en pulsación larga    | `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none` y `contextmenu` suprimido en los botones           |
| `(pointer: coarse)` no detecta algunos híbridos (portátil con táctil)               | Limitación aceptada y documentada en Decisiones; si molesta, spec futuro con interruptor manual                             |
| Tetris 420 × 600 en vertical deja poco espacio para el panel                        | Revisión responsive en el plan (paso 6); el marco ya limita su ancho al alto de la ventana y el panel se apila debajo       |
| Teclado virtual del móvil al editar el nombre en el modal activa botones            | El panel pasa a `active = false` en game over (no se renderiza); criterio de aceptación sobre el modal                      |
| Un juego nuevo con motor queda sin controles táctiles                               | Regla en `CLAUDE.md` y criterio de aceptación sobre `TOUCH_LAYOUTS` frente a `ENGINES`                                      |

---

## Qué **no** está en este spec

- Gestos sobre el canvas, hápticos, sonido y gamepad.
- Cambios en los motores, en el contrato `GameEngine` o en el esquema de Supabase.
- Controles superpuestos, bloqueo de orientación e interruptor manual de controles.
- Optimización móvil del resto de páginas del sitio.
- PWA, pantalla completa y modo offline.
- Autenticación, antitrampas y moderación de nombres.
- Tests automatizados.

Cada uno de ellos, si se aborda, va en su propio spec.
