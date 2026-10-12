# SPEC 01 — MVP visual de Arcade Vault (5 pantallas)

> **Status:** Aprobado
> **Depends on:** —
> **Date:** 2026-10-12
> **Objective:** Portar a Next.js las 5 pantallas de `references/templates` (biblioteca, detalle, reproductor, auth y salón de la fama) como UI funcional con datos mock, sin implementar ningún juego real.

---

## Por qué existe este spec

El repo es el scaffold de Create Next App. Existe un prototipo en `references/templates` (React 18 por CDN + Babel, router por hash, un único `styles.css`). Este spec traslada ese prototipo a la arquitectura real (App Router, TypeScript, Tailwind v4) para tener una base visual sobre la que construir juegos y backend en specs posteriores.

---

## Alcance

**Dentro:**

- Layout global con `Nav` (desktop + panel móvil con hamburguesa) y footer.
- 5 rutas con App Router: biblioteca, detalle de juego, reproductor, auth y salón de la fama.
- Tema neón/CRT portado desde `references/templates/styles.css`: tokens en `@theme` de `app/globals.css` y CSS por componente para lo complejo (CRT, portadas, podio, glow, animaciones).
- Fuentes `Press Start 2P` y `JetBrains Mono` vía `next/font/google`.
- Datos mock tipados (`GAMES`, `CATS`, `seededScores`) portados desde `data.jsx`.
- Sesión simulada en `localStorage` (clave `av_user`): login, registro e invitado.
- Reproductor con arena decorativa, HUD (puntos simulados, vidas, nivel), pausa, fin de juego y modal de "Guardar puntuación" que persiste en `localStorage` (clave `av_scores`).
- Filtro por texto y por categoría en la biblioteca, con estado vacío.
- Diseño responsive (breakpoints de la plantilla: 720, 840 y 900 px).

**Fuera de alcance (specs futuros):**

- Cualquier juego real (lógica, canvas, input de teclado/táctil del juego).
- Backend, base de datos, autenticación real, OAuth (los botones Google/GitHub son decorativos).
- Validación de formularios, recuperación de contraseña, perfil de usuario.
- Que el salón y el detalle lean las puntuaciones guardadas en `av_scores` (siguen mostrando datos mock).
- Contador de créditos dinámico (`CRÉDITOS · 03` es texto fijo).
- Tests automatizados (no hay framework configurado).
- Modo claro: el tema es oscuro fijo.

---

## Modelo de datos

```ts
// lib/games.ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;          // slug: "bloque-buster", "caida", ...
  title: string;       // "BLOQUE BUSTER"
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;       // clase CSS: "cover-bricks", "cover-tetro", ...
  color: GameColor;
  best: number;
  plays: string;       // "12.4K"
}

export const GAMES: Game[];                       // los 8 juegos de data.jsx
export const CATS: ("TODOS" | GameCategory)[];

// lib/scores.ts
export interface ScoreRow { rank: number; name: string; score: number; date: string } // date: "DD/MM/YYYY"
export function seededScores(seed: number, count?: number): ScoreRow[];

// Persistencia simulada (solo cliente)
// localStorage["av_user"]   -> { name: string }            (null = invitado / sin sesión)
// localStorage["av_scores"] -> { game: string; score: number; name: string; at: number }[]
```

Convenciones:

- Formato de números: `toLocaleString("es-ES")`.
- Nombre de usuario: mayúsculas, máximo 10 caracteres, por defecto `PLAYER1`.
- Textos de la UI en español, tal cual la plantilla.

---

## Plan de implementación

1. **Tema y layout base.** Portar tokens (`--bg`, `--cyan`, `--magenta`, etc.) a `@theme` en `app/globals.css` y el CSS global (fondo, grilla, scanlines, `.pixel`, `.mono`, botones, animaciones). Cargar las fuentes en `app/layout.tsx`. Verificación: `npm run dev` muestra fondo oscuro con la tipografía correcta.
2. **Datos mock.** Crear `lib/games.ts` y `lib/scores.ts` con los tipos y datos de `data.jsx`. Verificación: `npm run lint` y `tsc` sin errores.
3. **Sesión simulada.** Crear `components/session-provider.tsx` (client) con `user`, `login`, `signOut` sobre `av_user`, y montarlo en el layout. Leer `localStorage` tras montar para evitar errores de hidratación.
4. **Nav y footer.** Crear `components/nav.tsx` (client) usando `Link` y `usePathname` para el estado activo, panel móvil y botón de sesión. Montar con el footer en `app/layout.tsx`.
5. **Biblioteca (`/`).** Reemplazar `app/page.tsx`; crear `components/game-card.tsx` (tilt 3D al hover) y `components/library.tsx` (búsqueda, chips, estado vacío) más el CSS de portadas.
6. **Detalle (`/juegos/[id]`).** Crear `app/juegos/[id]/page.tsx` con portada, tags, estadísticas, botones y leaderboard mock. `notFound()` si el id no existe.
7. **Auth (`/auth`).** Crear `app/auth/page.tsx` con pestañas entrar/crear cuenta, botón invitado y botones sociales decorativos. Al enviar: `login` y redirección a `/`.
8. **Salón de la Fama (`/salon`).** Crear `app/salon/page.tsx` con pestañas por juego, podio, tabla y fila "tu mejor marca" si hay sesión.
9. **Reproductor (`/juegos/[id]/jugar`).** Crear `app/juegos/[id]/jugar/page.tsx` y `components/game-player.tsx` (client): HUD, arena CRT decorativa, pausa, fin de juego y modal con guardado en `av_scores`.
10. **Pulido responsive.** Revisar las 5 pantallas en anchos 375, 768 y 1280 px y ajustar CSS.

Antes de cada paso se debe consultar la guía correspondiente en `node_modules/next/dist/docs/` (Next 16 con `cacheComponents`; las páginas con `params` dinámicos y las que leen `localStorage` requieren atención a Suspense y componentes cliente). La UI se diseña con la skill `/frontend-design`, usando la plantilla como referencia visual.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/` muestra los 8 juegos; escribir "caí" deja solo CAÍDA; elegir el chip SHOOTER deja INVASORES y ROCAS.
- [ ] Una búsqueda sin coincidencias muestra "NO HAY RESULTADOS".
- [ ] Hacer clic en una tarjeta o en JUGAR navega a `/juegos/<id>`.
- [ ] `/juegos/<id>` muestra título, descripción larga, 4 tags, 3 estadísticas y 10 filas de puntuaciones con las 3 primeras destacadas.
- [ ] `/juegos/no-existe` muestra la página 404.
- [ ] "JUGAR AHORA" navega a `/juegos/<id>/jugar`; "VOLVER AL VAULT" a `/`.
- [ ] En el reproductor la puntuación sube sola; PAUSA la detiene y muestra "EN PAUSA"; REANUDAR la continúa.
- [ ] "FIN" abre el modal con la puntuación final; "GUARDAR PUNTUACIÓN" añade una entrada a `localStorage["av_scores"]` y muestra "PUNTUACIÓN GUARDADA".
- [ ] "JUGAR DE NUEVO" reinicia puntos, vidas (3) y nivel (1); "SALIR" vuelve al detalle.
- [ ] En `/auth`, la pestaña "CREAR CUENTA" muestra el campo de correo; enviar con usuario `kai` guarda `{"name":"KAI"}` en `av_user` y redirige a `/`.
- [ ] Con sesión iniciada, la nav muestra el nombre y al pulsarlo cierra la sesión; sin sesión muestra "Iniciar Sesión".
- [ ] "JUGAR COMO INVITADO" redirige a `/` sin crear `av_user`.
- [ ] `/salon` muestra podio con 3 posiciones, tabla de 12 filas y cambia de datos al elegir otro juego.
- [ ] En `/salon` solo aparece "TU MEJOR MARCA" cuando hay sesión.
- [ ] Recargar cualquier ruta no produce errores de hidratación ni errores en la consola.
- [ ] A 375 px de ancho no hay scroll horizontal y la nav muestra la hamburguesa con panel lateral funcional.
- [ ] Ya no queda código de la plantilla de Create Next App en `app/page.tsx`.

---

## Decisiones

- **Sí:** App Router con rutas reales (`/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/auth`, `/salon`). URLs compartibles y uso real del framework. **No:** router por hash de la plantilla.
- **Sí:** sesión simulada en `localStorage` (`av_user`), igual que la plantilla. Permite probar los estados con y sin sesión. **No:** sin sesión alguna, porque dejaría sin verificar la fila "tu mejor marca" y la nav autenticada.
- **Sí:** tokens en `@theme` y CSS por componente en `globals.css`. Mantiene fidelidad visual con la plantilla sin reescribir cada efecto como utilidades. **No:** copiar `styles.css` entero (poco idiomático con Tailwind v4). **No:** todo en utilidades inline (verboso para CRT, portadas y animaciones).
- **Sí:** mock estático tipado y guardado de puntuaciones en `localStorage` (`av_scores`). Deja listo el punto de integración para un backend. **No:** guardar como no-op.
- **Sí:** mantener `seededScores` determinista para que servidor y cliente generen los mismos datos y no haya mismatches de hidratación.
- **No:** leer `av_scores` en detalle y salón. Mezclar datos reales con mock complica el ranking; va en otro spec junto con el backend.
- **Sí:** textos en español como en la plantilla.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Next 16 con `cacheComponents` y `params` dinámicos exige Suspense / componentes cliente de forma distinta a lo conocido | Leer `node_modules/next/dist/docs/` antes de cada paso y mantener los componentes con `localStorage` como cliente |
| Errores de hidratación al leer `localStorage` | Leer solo tras montar (efecto) y renderizar el estado "sin sesión" en el primer render |
| `localStorage` no disponible (modo privado) | Envolver lecturas y escrituras en `try/catch`; la app sigue funcionando sin persistir |
| Divergencia visual respecto a la plantilla al portar el CSS | Comparar cada pantalla con `references/templates/Arcade Vault.html` abierto en el navegador |
| Rendimiento del efecto CRT/scanlines en móviles | Mantener efectos con CSS puro (sin JS por frame) y respetar `prefers-reduced-motion` |

---

## Qué **no** está en este spec

- Ningún juego jugable (ni lógica, ni canvas, ni controles).
- Backend, base de datos, autenticación o OAuth reales.
- Validación de formularios y recuperación de contraseña.
- Ranking real alimentado por `av_scores`.
- Créditos dinámicos, perfil de usuario, modo claro y tests automatizados.

Cada uno de ellos, si se aborda, va en su propio spec.
