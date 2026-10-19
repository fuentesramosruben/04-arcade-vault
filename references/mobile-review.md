# Revisión móvil por ruta

Referencia: `specs/10-controles-tactiles-moviles.md`. Una ruta por ejecución del subagente `mobile-porter`.
Leyenda: ✅ revisada y correcta · ⚠️ revisada con pendientes · ⬜ sin revisar.

| Ruta                    | Navegador móvil | App móvil | Fecha      | Notas                                                                                                                                  |
| ----------------------- | --------------- | --------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                     | ⬜              | ⬜        |            |                                                                                                                                        |
| `/juegos`               | ⬜              | ⬜        |            |                                                                                                                                        |
| `/juegos/<id>` (frogger) | ⚠️             | ⚠️        | 2026-10-19 | Contenido de la ficha OK. Pendiente global: objetivos de la cabecera (`Nav`) < 48 px, sin `viewport-fit=cover` ni `theme-color` en layout |
| `/juegos/<id>/jugar`    | ⬜              | ⬜        |            | Cubierta parcialmente por SPEC 10                                                                                                      |
| `/salon`, `/salon/<id>` | ⬜              | ⬜        |            |                                                                                                                                        |
| `/acerca`               | ⬜              | ⬜        |            |                                                                                                                                        |
| `/auth`                 | ⬜              | ⬜        |            |                                                                                                                                        |

## Historial

- 2026-10-19 · `/juegos/frogger`: stat-strip en 2+1 columnas (estrellas sin salto), acciones a todo el ancho con altura ≥ 52 px a ≤ 520 px, y `export const instant = false` en la página para quitar el error de consola de `params` fuera de Suspense. Sin scroll horizontal a 360/390/430/844; escritorio sin cambios. Pendiente (global, fuera de la ruta): `Nav` (auth 34 px, hamburguesa 41 × 37, logo 28 px de alto), `viewport` con `viewport-fit=cover`, `theme-color` y safe areas en `app/layout.tsx`.
