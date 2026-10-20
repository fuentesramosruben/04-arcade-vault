# Revisión de seguridad

Informe vivo que mantiene el subagente `security-auditor` (`@security-auditor <db|app|todo>`). Referencias: SPEC 12, SPEC 13 y `security-checklist.md`.

Leyenda: ✅ verificado · ⚠️ con reservas · ❌ incumple · 🟦 riesgo aceptado · — sin revisar

## Base de datos

| Control                                                                  | Estado | Última revisión |
| ------------------------------------------------------------------------ | ------ | --------------- |
| RLS activo en `games`, `scores` y `profiles`                             | ✅     | 2026-10-21      |
| Políticas de `scores` (solo `authenticated`, perfil, `ranked`)           | ✅     | 2026-10-21      |
| Políticas de `profiles` (sin `UPDATE` ni `DELETE`)                       | ✅     | 2026-10-21      |
| `anon` sin `insert` en `scores`                                          | ✅     | 2026-10-21      |
| Grants mínimos de `anon`/`authenticated` (higiene)                       | ⚠️     | 2026-10-21      |
| Funciones `SECURITY DEFINER` sin `EXECUTE` para `anon`/`authenticated`   | ✅     | 2026-10-21      |
| Vistas con `security_invoker = true`                                     | ✅     | 2026-10-21      |
| Event trigger `ensure_rls` activo                                        | ✅     | 2026-10-21      |
| Restricciones (`username` 3–12 mayúsculas único, `score`, `player_name`) | ✅     | 2026-10-21      |
| `games.ranked` coincide con `ENGINES`                                    | ✅     | 2026-10-21      |
| Migraciones aplicadas = `supabase/migrations/`                           | ⚠️     | 2026-10-21      |
| Advisor de seguridad limpio salvo `auth_leaked_password_protection`      | ✅     | 2026-10-21      |
| Logs de auth y API sin anomalías (24 h)                                  | ✅     | 2026-10-21      |

## Aplicación

| Control                                                             | Estado | Última revisión |
| ------------------------------------------------------------------- | ------ | --------------- |
| Secretos fuera del cliente y del repositorio                        | ⚠️     | 2026-10-21      |
| 5 cabeceras de seguridad en `next.config.ts`                        | ✅     | 2026-10-21      |
| `proxy.ts`: sesión, 404 de `/salon/<id>` y redirecciones de `/auth` | ✅     | 2026-10-21      |
| Validación de contraseña en servidor y orden en `signUp`            | ✅     | 2026-10-21      |
| HIBP: k-anonymity, timeout 3 s, falla en abierto                    | ✅     | 2026-10-21      |
| Errores de login genéricos                                          | ✅     | 2026-10-21      |
| `/auth/callback` sin open redirect                                  | ✅     | 2026-10-21      |
| Server Actions con validación de entrada (`sendContact`)            | ✅     | 2026-10-21      |
| Guardado de puntuación con `user_id` de la sesión                   | ✅     | 2026-10-21      |
| Sin `dangerouslySetInnerHTML`/`eval`                                | ✅     | 2026-10-21      |
| `npm audit` de producción                                           | ⚠️     | 2026-10-21      |

## Riesgos aceptados

- 🟦 Sin `Content-Security-Policy`.
- 🟦 `auth_leaked_password_protection` (plan Free); mitigación en `lib/auth/pwned.ts`.
- 🟦 Sin CAPTCHA ni limitador propio.
- 🟦 `HSTS` sin `includeSubDomains`/`preload`.
- 🟦 Antitrampas de puntuación solo por RLS.

## Historial

| Fecha      | Área | Crítico | Alto | Medio | Bajo | Notas                                                                                                                                                                                                                                                                                                         |
| ---------- | ---- | ------- | ---- | ----- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-21 | db   | 0       | 0    | 1     | 1    | Medio: deriva de migraciones (`remove_unimplemented_games` aplicada y ausente del repo; versiones de `frogger_ranked` y `auth_profiles` distintas). Bajo: `anon`/`authenticated` conservan UPDATE/DELETE/TRUNCATE por defecto (RLS los bloquea). Logs 24 h: 7x422 y 1x429 en `/auth/v1/signup`, sin anomalías |
| 2026-10-21 | app  | 0       | 0    | 1     | 2    | Medio: `npm audit` no pudo ejecutarse (sin red, ENOENT al registro): dependencias sin verificar. Bajo: `siteOrigin()` en `app/auth/actions.ts:35` deriva `emailRedirectTo` de `x-forwarded-host`/`host` (Supabase lo limita a su lista de redirecciones); `.env.template` versionado (vacío, incluye `SUPABASE_DB_PW=`; `.env*` ignorado salvo `.env.example`). Resto verificado |
