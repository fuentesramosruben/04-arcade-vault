# SPEC 02 — Homepage (landing) de Arcade Vault

> **Status:** Aprobado
> **Depends on:** SPEC 01
> **Date:** 2026-10-13
> **Objective:** Portar a Next.js la landing de `references/templates/home-about/home.jsx` como nueva página de inicio en `/`, moviendo la biblioteca actual a `/juegos`.

---

## Por qué existe este spec

Hoy `/` es la biblioteca (SPEC 01). La plantilla `references/templates/home-about` define una landing de marketing (hero, motivos, juegos destacados, estadísticas, actividad, precios y CTA final) que debe ser la puerta de entrada. Esto obliga a mover la biblioteca de ruta y a actualizar los enlaces que apuntan a `/`.

---

## Alcance

**Dentro:**

- Nueva página `/` con las 7 secciones de `home.jsx`: hero con siluetas flotantes, "¿Por qué Arcade Vault?" (4 tarjetas), "Juegos disponibles ahora" (6 mini-tarjetas), banda de estadísticas, "Actividad en vivo" (últimas puntuaciones + top jugadores), "Precios" (plan único + 3 FAQ) y CTA final.
- Mover la biblioteca de `/` a `/juegos` (`app/juegos/page.tsx`), sin cambios funcionales.
- Actualizar la navegación: añadir el enlace "Inicio" (`/`), mantener "Biblioteca" (`/juegos`) y "Salón de la Fama"; el logo lleva a `/`.
- Actualizar los enlaces internos que apuntaban a la biblioteca en `/` (botón "VOLVER AL VAULT" del detalle, botones de `components/game-player.tsx` y `app/salon/page.tsx` que apunten a la biblioteca).
- Animación de aparición al hacer scroll (`.reveal` → `.in`) mediante un componente cliente con `IntersectionObserver`, respetando `prefers-reduced-motion`.
- CSS de la landing portado desde `references/templates/home-about/styles.css` (bloques `.home-*`, `.feature-*`, `.mini-*`, `.stat-*`, `.activity-*`, `.top-*`, `.price-*`, `.faq-*`, `.final-*`, `.reveal`) a `app/globals.css`, con los tokens ya existentes.
- Datos mock estáticos tipados en `lib/home.ts`; las mini-tarjetas usan `GAMES.slice(0, 6)`.
- Textos en español, tal cual la plantilla (incluidos copys de precios, "12+ JUEGOS", "MILES DE PARTIDAS").
- Responsive con los breakpoints ya usados en el proyecto.

**Fuera de alcance (specs futuros):**

- Página "Acerca de" y formulario de contacto (`about.jsx`); la nav no incluye "Acerca de" hasta que exista su spec.
- Leer `av_scores` o cualquier dato real en "Actividad en vivo" y en "Top jugadores".
- Backend, ranking global real, estadísticas reales o actualización en vivo (los "hace 2 min" son texto fijo).
- Revisión del copy comercial (precios, "sin anuncios", cifras); se porta tal cual como texto de maqueta.
- Cambios al reproductor, al detalle (salvo enlaces), a auth o al salón.
- Contador de créditos dinámico (sigue siendo texto fijo, como en SPEC 01).
- Tests automatizados (no hay framework configurado).

---

## Modelo de datos

No introduce estructuras de persistencia. Añade datos mock tipados de solo lectura:

```ts
// lib/home.ts
import type { GameColor } from "@/lib/games";

export interface Feature { icon: "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET"; title: string; desc: string; color: GameColor }
export interface HomeStat { n: string; unit: string; sub: string }          // "12+" / "JUEGOS" / "Y CONTANDO"
export interface RecentScore { player: string; game: string; score: number; ago: string; color: GameColor } // ago: "hace 2 min"
export interface TopPlayer { rank: number; player: string; score: number }
export interface FaqItem { q: string; a: string }

export const FEATURES: Feature[];       // 4
export const HOME_STATS: HomeStat[];    // 3
export const RECENT_SCORES: RecentScore[]; // 7
export const TOP_PLAYERS: TopPlayer[];  // 5
export const PRICING_PERKS: string[];   // 6
export const FAQ: FaqItem[];            // 3
```

Convenciones:

- Formato de números: `toLocaleString("es-ES")`.
- Los valores salen literalmente de `home.jsx`; los títulos de juego de `RECENT_SCORES` son texto libre (no ids).
- Los iconos pixel (4 de features) y las 8 siluetas son SVG inline en componentes, sin dependencias.

---

## Plan de implementación

Antes de cada paso se consulta la guía correspondiente en `node_modules/next/dist/docs/` (Next 16 con `cacheComponents`). La UI se diseña con la skill `/frontend-design`, usando `home.jsx` y `styles.css` como referencia visual.

1. **Mover la biblioteca a `/juegos`.** Crear `app/juegos/page.tsx` renderizando `<Library />`. Cambiar temporalmente `app/page.tsx` a un placeholder con enlace a `/juegos`. Actualizar `activeRoute` en `components/nav.tsx` para que `/juegos` (y subrutas) sea "biblioteca" y `/` sea "inicio". Verificación: `/juegos` muestra la biblioteca y filtra igual que antes.
2. **Actualizar enlaces.** Cambiar a `/juegos` los enlaces a la biblioteca en `app/juegos/[id]/page.tsx`, `components/game-player.tsx` y `app/salon/page.tsx`; añadir "Inicio" a la nav (desktop y panel móvil). El logo y la redirección tras login/invitado en `app/auth/page.tsx` se mantienen en `/`. Verificación: ningún enlace a biblioteca cae en el placeholder.
3. **Datos mock.** Crear `lib/home.ts` con los tipos y constantes. Verificación: `npm run lint` y `tsc` sin errores.
4. **CSS de la landing.** Portar a `app/globals.css` los bloques de la landing, incluidos `.reveal` / `.reveal.in` y las animaciones `float`, `pulse`, `blink`, con `@media (prefers-reduced-motion: reduce)`. Verificación: `npm run build` sin errores.
5. **Iconos y siluetas.** Crear `components/home/silhouettes.tsx` (8 SVG, `aria-hidden`) y `components/home/feature-icon.tsx` (4 iconos). Verificación: se renderizan en una página temporal sin errores.
6. **Reveal.** Crear `components/home/reveal.tsx` (client): envuelve secciones, añade `.in` con `IntersectionObserver` (umbral 0.12) y muestra todo directamente si no hay `IntersectionObserver` o si hay `prefers-reduced-motion`. Verificación: al hacer scroll las secciones aparecen una vez.
7. **Hero y "Por qué".** Reemplazar `app/page.tsx` por la landing; crear `components/home/hero.tsx` y la sección de 4 tarjetas con `transitionDelay` escalonado. CTAs con `Link`: "EXPLORAR JUEGOS" → `/juegos`, "CREAR CUENTA" → `/auth`.
8. **Juegos destacados y estadísticas.** Crear `components/home/mini-card.tsx` (enlace a `/juegos/<id>`) y la sección con el botón "VER TODOS LOS JUEGOS →" a `/juegos`; añadir la banda de estadísticas.
9. **Actividad en vivo.** Crear la sección con el ticker de 7 filas (animación escalonada) y el top 5 con barras de ancho `100 - i*16 %`; enlace "VER SALÓN →" a `/salon`.
10. **Precios y CTA final.** Crear la tarjeta de plan único (sello "FREE PLAY"), las 3 FAQ y el CTA "INSERTAR MONEDA →" a `/juegos`; el botón "EMPEZAR GRATIS →" a `/auth`.
11. **Pulido responsive.** Revisar `/` a 375, 768 y 1280 px y ajustar CSS (rejilla de 4 → 2 → 1 columnas, hero, precios).

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/` muestra, en este orden: hero, "¿POR QUÉ ARCADE VAULT?", "JUEGOS DISPONIBLES AHORA", estadísticas, "ACTIVIDAD EN VIVO", "PRECIOS" y "¿LISTO PARA JUGAR?".
- [ ] El hero muestra el título "EL ARCADE / CLÁSICO ESTÁ / DE VUELTA", 8 siluetas flotantes y los botones "EXPLORAR JUEGOS" y "CREAR CUENTA".
- [ ] "EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS →" e "INSERTAR MONEDA →" navegan a `/juegos`.
- [ ] "CREAR CUENTA" y "EMPEZAR GRATIS →" navegan a `/auth`; "VER SALÓN →" navega a `/salon`.
- [ ] La sección de juegos muestra exactamente 6 mini-tarjetas y cada una navega a `/juegos/<id>`.
- [ ] "POR QUÉ" muestra 4 tarjetas; "ACTIVIDAD" muestra 7 filas de últimas puntuaciones y 5 de top jugadores; "PRECIOS" muestra 6 ventajas y 3 preguntas.
- [ ] `/juegos` muestra los 8 juegos y conserva el filtro por texto, chips y estado vacío del SPEC 01.
- [ ] La nav muestra "Inicio", "Biblioteca" y "Salón de la Fama"; el enlace activo es "Inicio" en `/` y "Biblioteca" en `/juegos` y `/juegos/<id>`. No hay enlace a "Acerca de".
- [ ] "VOLVER AL VAULT" en el detalle navega a `/juegos`; el logo navega a `/`.
- [ ] Enviar el formulario de `/auth` o pulsar "JUGAR COMO INVITADO" redirige a `/`.
- [ ] Las secciones con `.reveal` aparecen al entrar en pantalla; con `prefers-reduced-motion: reduce` se muestran sin animación.
- [ ] Recargar `/` no produce errores de hidratación ni errores en la consola.
- [ ] A 375 px de ancho `/` no tiene scroll horizontal.
- [ ] `/` no importa ni lee `localStorage`.
- [ ] No existe ninguna ruta `/acerca` ni formulario de contacto.

---

## Decisiones

- **Sí:** biblioteca en `/juegos`. Es hermana natural de `/juegos/[id]` y libera `/` para la landing. **No:** `/biblioteca` (rompe la simetría de rutas) ni dejar la landing en `/inicio` (la entrada principal seguiría siendo la biblioteca).
- **Sí:** solo el home en este spec. Cumple la petición literal; "Acerca de" tiene estado de formulario y pantalla de terminal, y merece su propio spec. **No:** incluir `about.jsx` ni un enlace "Acerca de" sin página.
- **Sí:** datos mock estáticos en `lib/home.ts`, coherente con SPEC 01. **No:** mezclar `av_scores` en la actividad; SPEC 01 ya descartó mezclar datos reales con mock.
- **Sí:** portar el copy tal cual. Es texto de maqueta y se revisará antes de producción (ver riesgos). **No:** reescribirlo ahora sin criterio del usuario.
- **Sí:** `Link` de Next para los CTA en lugar de `button` + `navigate`. Da prefetch y semántica de enlace. **No:** `router.push` en un `onClick`.
- **Sí:** el login y el modo invitado siguen redirigiendo a `/`. Es la página de inicio. **No:** redirigir a `/juegos`.
- **Sí:** componentes del home como Server Components salvo `reveal.tsx`, que necesita `IntersectionObserver`. **No:** marcar toda la página como cliente.
- **Sí:** CSS de la landing en `app/globals.css`, como en SPEC 01. **No:** CSS Modules ni un `styles.css` separado.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Next 16 con `cacheComponents` exige tratar distinto lo dinámico y los componentes cliente | Leer `node_modules/next/dist/docs/` antes de cada paso; la página es estática y solo `reveal.tsx` es cliente |
| El contenido oculto por `.reveal` queda invisible si falla el JS o el observer | Mostrar el contenido por defecto sin `IntersectionObserver` y con `prefers-reduced-motion`; añadir la clase de ocultación solo desde el cliente |
| Copys que prometen lo que el producto aún no es (12+ juegos, ranking global, "sin anuncios", precios) | Se portan tal cual como maqueta; revisar antes de publicar |
| Enlaces rotos al mover la biblioteca | Paso 2 del plan y criterios de aceptación de navegación; buscar con grep `href="/"` y `push("/")` |
| Coste de render de 8 siluetas animadas y brillos en móviles | Animaciones solo con CSS, `will-change` limitado y reducción en `prefers-reduced-motion` |

---

## Qué **no** está en este spec

- Página "Acerca de" y formulario de contacto.
- Datos reales (`av_scores`, backend, ranking global, estadísticas en vivo).
- Revisión del copy comercial y de los precios.
- Créditos dinámicos, perfil de usuario, modo claro y tests automatizados.

Cada uno de ellos, si se aborda, va en su propio spec.
