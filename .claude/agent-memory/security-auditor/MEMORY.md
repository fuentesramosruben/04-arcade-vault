# Memoria de security-auditor

## Punto de partida

- Referencia: `specs/12-autenticacion-registro-login.md` y `specs/13-medidas-de-seguridad-basicas.md` (ambos implementados). Checklist en `references/security/security-checklist.md`; informe vivo en `references/security/security-review.md`.
- Última revisión: 2026-10-21, `db` (Medio deriva migraciones, Bajo grants) y `app` (Medio npm audit sin red, Bajo siteOrigin con host header, Bajo .env.template versionado). Todo lo demás ✅.

## Riesgos aceptados (SPEC 13)

- Sin `Content-Security-Policy` (spec futuro).
- `auth_leaked_password_protection` desactivada: requiere plan Pro. Mitigación propia: `lib/auth/pwned.ts` (HIBP, k-anonymity, falla en abierto).
- Sin CAPTCHA ni limitador propio; el límite es el de Supabase Auth (10 registros e inicios de sesión por IP cada 5 minutos, configurado a mano en el Dashboard: no verificable desde el repo).
- `HSTS` sin `includeSubDomains` ni `preload`.
- Antitrampas de puntuación solo por RLS.
- Puntuaciones antiguas con `user_id` nulo (anteriores a SPEC 12).

## Cosas a vigilar

- Cada juego nuevo: `ranked` en `games` debe coincidir con `ENGINES` (2026-10-21: 5 juegos, coinciden).
- Tabla nueva: RLS activo (event trigger `ensure_rls`) y políticas explícitas.
- Función `SECURITY DEFINER` nueva: revocar `EXECUTE` a `anon`/`authenticated` y fijar `search_path`.
- Configuración manual del Dashboard: solo comprobable indirectamente (`weak_password` 422 en `POST /auth/v1/signup`, logs).

## Hallazgos recurrentes

- Deriva de migraciones: la BBDD remota tiene `remove_unimplemented_games` (20261018215411) que no está en `supabase/migrations/`, y `frogger_ranked`/`auth_profiles` tienen otra versión (remota 20261019205458 / 20261020205046 frente a 20261019000000 / 20261020000000 en el repo). Comparar por nombre, no solo por versión.
- Grants por defecto de Supabase: `anon` y `authenticated` tienen UPDATE/DELETE/TRUNCATE/etc. en todas las tablas y vistas de `public` (RLS los neutraliza; PostgREST no emite TRUNCATE). `anon` no tiene INSERT en `scores`. Higiene, severidad Baja.
- El event trigger `rls_auto_enable` lista `evtfoid` como `rls_auto_enable`, activo (`O`).
