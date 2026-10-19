# Memoria de mobile-porter

## Punto de partida

- Referencia: `specs/10-controles-tactiles-moviles.md` (implementado). Matriz de progreso: `references/mobile-review.md`.
- Limitaciones aceptadas en SPEC 10: portátil táctil con ratón no ve el panel; en horizontal (844 × 390) el panel queda bajo el pliegue.
- Revisadas: `/juegos/frogger` (ficha) ⚠️ 2026-10-19. Pendientes: `/`, `/juegos`, `/juegos/<id>/jugar`, `/salon`, `/salon/<id>`, `/acerca`, `/auth`.

## Patrones y lecciones

- `npm run dev` (Turbopack) puede servir un CSS obsoleto tras editar `app/globals.css` (ni `touch` lo arregló). Verificar con `npm run build` + `npx next start -p 3100` y matar el proceso después (netstat + taskkill).
- Playwright: `page.context().browser().newContext({viewport, hasTouch, isMobile})` dentro de `browser_run_code_unsafe` permite medir los 4 tamaños de una vez.
- Hay overlay "N Insight" de Next en dev que tapa botones en capturas: ignorar.
- `npm run lint` falla ya por `references/templates/*.jsx` (18 errores previos, no del código de la app); lintar solo los archivos tocados.
- Rutas `/juegos/[id]` y `/jugar` necesitan `export const instant = false` por `cacheComponents` (error de consola en dev si falta).
- Hallazgo global repetido: `Nav` tiene objetivos < 48 px (auth-btn 34, hamburguesa 41x37), el layout no define `viewport`/`theme-color`/`viewport-fit=cover`. Decidir si se corrige en la primera ruta que lo permita o en una pasada de layout.
- Las celdas `.v` en pixel font con "★ ★ ★ ☆ ☆" no caben en 1/3 del ancho a 360 px: usar rejilla 2+1.
