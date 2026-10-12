# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Arcade Vault: plataforma para jugar online y competir por la mayor cantidad de puntos. Según el README, se desarrolla con Spec Driven Design (comandos `/spec` y `/spec-impl`, skills de `Klerith/fernando-skills`). Actualmente el código es el scaffold de Create Next App sin lógica propia (`app/page.tsx` es la plantilla por defecto).

No hay framework de tests configurado.

## Skills

Usa siempre /frontend-design para diseñar interfaz de usuario.

## Arquitectura / advertencias

- **Next.js 16.4 + React 19.3** con App Router (`app/`). Esta versión tiene cambios incompatibles respecto a lo que se conoce: antes de escribir código, leer la guía relevante en `node_modules/next/dist/docs/` (`01-app`, `02-pages`, `03-architecture`, `04-community`) y respetar los avisos de deprecación (así lo exige `AGENTS.md`).
- `next.config.ts` activa flags experimentales/no estándar: `cacheComponents: true`, `partialPrefetching: true`, `experimental.agentFeedback`. `cacheComponents` cambia el modelo de caché/renderizado (datos dinámicos y Suspense), así que consultar la doc antes de hacer fetching.
- **Tailwind CSS v4** se procesa vía `@tailwindcss/turbopack` configurado en `turbopack.rules` de `next.config.ts` (no hay `postcss.config`). Los tokens de tema están en `app/globals.css` (`@import "tailwindcss"` + `@theme inline`, modo oscuro por `prefers-color-scheme`).
- `app/layout.tsx` usa el tipo global `LayoutProps<"/">` (tipos de rutas generados por Next) y las fuentes Geist vía `next/font/google`.
- `AGENTS.md` es regenerado por `next dev`; no tiene sentido quitarlo de un diff.
