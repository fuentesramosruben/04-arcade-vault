## Checklist de seguridad básico

Estado según SPEC 13 (`specs/13-medidas-de-seguridad-basicas.md`).

- [x] RLS: Row Level Security habilitado en ambas tablas: `games` y `scores` (y en `profiles`)
- [x] Minimum password length — mínimo 8 caracteres (servidor y `validatePassword`; además exige minúscula, mayúscula, dígito y símbolo)
- [~] Leaked password protection — (el warning 4): la protección nativa requiere plan Pro y sigue desactivada. Mitigación propia: `lib/auth/pwned.ts` (HaveIBeenPwned, k-anonymity) en `signUp`. El aviso `auth_leaked_password_protection` queda aceptado hasta pasar a Pro
- [x] Max signup rate — limitar signups por IP (anti-bot): 10 registros e inicios de sesión por IP cada 5 minutos (Dashboard > Authentication > Rate Limits)
- [x] Headers de seguridad en Next.js (`next.config.ts`; sin CSP)
- [x] Avisos `anon_/authenticated_security_definer_function_executable`: migración `revoke_rls_auto_enable_execute`
- [x] Protección de rutas con Proxy: `/auth/nombre` exige sesión y `/auth` redirige a `/` con sesión

Ej:

```ts
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

// En la config de Next.js:
headers: async () => [{ source: "/(.*)", headers: securityHeaders }];
```

## Por el ladod e Supabase:

| name                                               | title                                                 | level | facing   | categories   | description                                                                                                                                                                                                              | detail                                                                                                                                                                                                                               | remediation                                                                                                            | metadata                                                                                                 | cache_key                                                                  | observed_at              |
| -------------------------------------------------- | ----------------------------------------------------- | ----- | -------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------ |
| anon_security_definer_function_executable          | Public Can Execute SECURITY DEFINER Function          | WARN  | EXTERNAL | ["SECURITY"] | Detects `SECURITY DEFINER` functions that are callable without signing in. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if it is not meant to be public.       | Function `public.rls_auto_enable()` can be executed by the `anon` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/rls_auto_enable`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional.          | https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable          | {"schema":"public","name":"rls_auto_enable","language":"plpgsql","arguments":"","security_definer":true} | anon_security_definer_function_executable_public_rls_auto_enable_          | 2026-10-20T21:28:43.902Z |
| authenticated_security_definer_function_executable | Signed-In Users Can Execute SECURITY DEFINER Function | WARN  | EXTERNAL | ["SECURITY"] | Detects `SECURITY DEFINER` functions that are callable by signed-in users. Revoke `EXECUTE`, switch the function to `SECURITY INVOKER`, or move it out of your exposed API schema if signed-in users should not call it. | Function `public.rls_auto_enable()` can be executed by the `authenticated` role as a `SECURITY DEFINER` function via `/rest/v1/rpc/rls_auto_enable`. Revoke `EXECUTE` or switch it to `SECURITY INVOKER` if that is not intentional. | https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable | {"schema":"public","name":"rls_auto_enable","language":"plpgsql","arguments":"","security_definer":true} | authenticated_security_definer_function_executable_public_rls_auto_enable_ | 2026-10-20T21:28:43.902Z |
| auth_leaked_password_protection                    | Leaked Password Protection Disabled                   | WARN  | EXTERNAL | ["SECURITY"] | Leaked password protection is currently disabled.                                                                                                                                                                        | Supabase Auth prevents the use of compromised passwords by checking against HaveIBeenPwned.org. Enable this feature to enhance security.                                                                                             | https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection               | {"entity":"Auth","type":"auth"}                                                                          | auth_leaked_password_protection                                            |                          |
