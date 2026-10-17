# SPEC 03 — Página "Acerca de" y formulario de contacto con Resend

> **Status:** Implementado
> **Depends on:** SPEC 01, SPEC 02
> **Date:** 2026-10-13
> **Objective:** Portar a Next.js la página `references/templates/home-about/about.jsx` como `/acerca` y hacer que su formulario de contacto envíe un correo real mediante Resend desde una Server Action.

---

## Por qué existe este spec

SPEC 02 dejó fuera la página "Acerca de" y el formulario de contacto (`about.jsx`). En la plantilla el envío es una simulación: muestra una terminal de éxito sin enviar nada. Este spec añade la página y conecta el formulario a Resend para que los mensajes lleguen de verdad al equipo.

---

## Alcance

**Dentro:**

- Nueva ruta `/acerca` (`app/acerca/page.tsx`) con las secciones de `about.jsx`:
  - Hero "ACERCA DE ARCADE VAULT" con texto de misión y 3 destacados (corazón, navegador, planta).
  - Banda divisoria animada (2 barras + 24 píxeles).
  - Sección "CONTÁCTANOS" con texto introductorio, 3 "tips" con LED y formulario.
- Formulario con campos NOMBRE, CORREO ELECTRÓNICO y MENSAJE, botón "▶ ENVIAR MENSAJE", animación `shake` ante error de validación y pantalla de éxito estilo terminal "VAULT-OS // TERMINAL" con "ENVIAR OTRO MENSAJE".
- Envío mediante **Server Action** (`app/acerca/actions.ts`) que usa el SDK `resend`.
- Validación **en el servidor** (campos obligatorios, formato de correo, longitudes máximas) y validación ligera en cliente solo para el `shake`.
- Campo **honeypot** oculto anti-bots.
- Estado de **error de envío** en la UI (no existe en la plantilla): mensaje en estilo terminal y el formulario conserva lo escrito para reintentar.
- Estado "enviando" en el botón (deshabilitado + texto) con `useActionState`/`useFormStatus`.
- Nav: añadir el enlace "Acerca de" (`/acerca`) en desktop y panel móvil, con estado activo.
- Variables de entorno `RESEND_API_KEY`, `CONTACT_TO_EMAIL` y `CONTACT_FROM_EMAIL` (por defecto `onboarding@resend.dev`), documentadas en un `.env.example`.
- CSS portado desde `references/templates/home-about/styles.css` (bloques `.about-*`, `.highlight*`, `.hl-*`, `.contact-*`, `.tip*`, `.field`, `.terminal-success`/`.term-*`, `.shake`) a `app/globals.css`, con los tokens existentes.
- Animación `.reveal` reutilizando `components/home/reveal.tsx` de SPEC 02.
- Textos en español, tal cual la plantilla.
- Responsive con los breakpoints ya usados en el proyecto.

**Fuera de alcance (specs futuros):**

- Dominio propio verificado en Resend (se usa `onboarding@resend.dev`, que solo entrega a la cuenta propietaria de Resend).
- Rate limit por IP o captcha (exigiría almacén externo o servicio de terceros).
- Correo de confirmación al usuario que escribe.
- Guardar los mensajes en base de datos o panel de administración.
- Plantillas de correo con React Email (el cuerpo es texto plano / HTML mínimo).
- Cumplimiento legal del formulario (aviso de privacidad, consentimiento).
- Que "SIN SPAM, JAMÁS" y "RESPUESTA EN 24-48H" sean compromisos reales: se portan como copy de maqueta.
- Tests automatizados (no hay framework configurado).

---

## Modelo de datos

No introduce persistencia. Añade tipos del formulario y de la respuesta de la acción:

```ts
// app/acerca/actions.ts  ("use server")
export interface ContactState {
  status: "idle" | "success" | "error";
  name?: string;                                   // nombre enviado, para el saludo del éxito
  error?: "validation" | "send";                   // "validation": datos inválidos; "send": falló Resend o falta configuración
  values?: { name: string; email: string; msg: string }; // se devuelve en error para no perder lo escrito
}

export async function sendContact(prev: ContactState, formData: FormData): Promise<ContactState>;
```

Límites de validación (servidor):

| Campo | Regla |
| --- | --- |
| `name` | obligatorio, `trim`, máx. 60 caracteres |
| `email` | obligatorio, formato de correo válido, máx. 120 caracteres |
| `msg` | obligatorio, `trim`, máx. 2000 caracteres |
| `company` (honeypot) | debe llegar vacío; si no, se devuelve `success` sin enviar |

Variables de entorno (solo servidor, nunca `NEXT_PUBLIC_`):

```
RESEND_API_KEY=          # clave de la API de Resend
CONTACT_TO_EMAIL=        # destinatario: correo del propietario de la cuenta de Resend
CONTACT_FROM_EMAIL=      # opcional; por defecto "Arcade Vault <onboarding@resend.dev>"
```

Convenciones del correo:

- `to`: `CONTACT_TO_EMAIL`; `replyTo`: el correo del visitante; `subject`: `Contacto Arcade Vault — <nombre>`.
- Todo texto del usuario se escapa si se interpola en HTML; se prefiere cuerpo en texto plano (`text`).

---

## Plan de implementación

Antes de cada paso se consulta la guía correspondiente en `node_modules/next/dist/docs/` (Next 16 con `cacheComponents`: Server Actions, `useActionState`, formularios y variables de entorno). La UI se diseña con la skill `/frontend-design`, usando `about.jsx` y `styles.css` como referencia visual.

1. **Dependencia y entorno.** Instalar `resend`; crear `.env.example` con las 3 variables (el `.gitignore` ya excluye `.env*`, así que añadir excepción `!.env.example`). Verificación: `npm run lint` sin errores y `.env.example` aparece en `git status`.
2. **CSS.** Portar a `app/globals.css` los bloques de about/contacto, `.terminal-success`, `.shake` y las animaciones necesarias, con `prefers-reduced-motion`. Verificación: `npm run build` sin errores.
3. **Página estática.** Crear `app/acerca/page.tsx` con `metadata`, hero, destacados (`components/about/highlight-icon.tsx`, 3 SVG `aria-hidden`), divisor y la sección de contacto con el formulario aún inerte. Envolver secciones en `Reveal`. Verificación: `/acerca` se ve igual que la plantilla, sin errores en consola.
4. **Nav.** Añadir `"acerca"` a `RouteName`/`activeRoute` en `components/nav.tsx` y el enlace "Acerca de" (desktop y panel móvil). Verificación: el enlace está activo en `/acerca`.
5. **Server Action.** Crear `app/acerca/actions.ts` con `sendContact`: honeypot, validación, lectura de env (si falta `RESEND_API_KEY` o `CONTACT_TO_EMAIL` devuelve `error: "send"` sin lanzar), llamada a `resend.emails.send`, y manejo del `error` devuelto por el SDK. No loguear el contenido del mensaje. Verificación: `tsc` sin errores.
6. **Formulario cliente.** Crear `components/about/contact-form.tsx` (client) con `useActionState(sendContact, ...)`, `shake` ante validación fallida, botón con estado "enviando", pantalla de éxito tipo terminal con `ENVIAR OTRO MENSAJE` y bloque de error con reintento que conserva `values`. Verificación: con claves reales el correo llega.
7. **Pulido responsive.** Revisar `/acerca` a 375, 768 y 1280 px (rejilla de contacto de 2 → 1 columnas, destacados, terminal). Verificación: sin scroll horizontal a 375 px.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] `/acerca` muestra, en este orden: hero "ACERCA DE ARCADE VAULT" con 3 destacados, banda divisoria y sección "CONTÁCTANOS" con 3 tips y el formulario.
- [ ] La nav muestra "Inicio", "Biblioteca", "Salón de la Fama" y "Acerca de" (desktop y panel móvil); "Acerca de" está activo en `/acerca`.
- [ ] Enviar el formulario con un campo vacío no llama a Resend, aplica el `shake` y no muestra la pantalla de éxito.
- [ ] Enviar datos válidos con las variables de entorno correctas entrega un correo a `CONTACT_TO_EMAIL` con asunto `Contacto Arcade Vault — <nombre>`, `replyTo` igual al correo del visitante y el mensaje en el cuerpo.
- [ ] Tras un envío correcto se muestra la terminal con "MENSAJE RECIBIDO… GRACIAS, <NOMBRE EN MAYÚSCULAS>."; "ENVIAR OTRO MENSAJE" vuelve al formulario vacío.
- [ ] Mientras se envía, el botón está deshabilitado y no permite doble envío.
- [ ] Con `RESEND_API_KEY` ausente o inválida se muestra el estado de error, el formulario conserva nombre, correo y mensaje, y no hay excepción sin capturar en el servidor.
- [ ] Un correo con formato inválido, o textos que superan los máximos, se rechazan en el servidor aunque se salte la validación del cliente.
- [ ] Si el campo honeypot `company` llega con valor, la acción responde éxito sin llamar a Resend.
- [ ] `RESEND_API_KEY` no aparece en el bundle del cliente ni en ninguna variable `NEXT_PUBLIC_*`.
- [ ] `.env.example` está versionado y no contiene secretos; `.env.local` no se versiona.
- [ ] Las secciones con `.reveal` aparecen al entrar en pantalla; con `prefers-reduced-motion: reduce` se muestran sin animación.
- [ ] Recargar `/acerca` no produce errores de hidratación ni errores en la consola.
- [ ] A 375 px de ancho `/acerca` no tiene scroll horizontal.

---

## Decisiones

- **Sí:** ruta `/acerca`. Coherente con `/juegos` y `/salon` y con el texto de la nav. **No:** `/about` (rompe la convención en español).
- **Sí:** Server Action. Menos código, tipada, secretos solo en servidor y sin endpoint público que mantener. **No:** Route Handler `/api/contacto` (más boilerplate; solo valdría si otro cliente lo consumiera).
- **Sí:** remitente `onboarding@resend.dev` y destino en `CONTACT_TO_EMAIL`. Sin dominio propio es lo único que Resend permite, y al ir en variables de entorno pasar a un dominio verificado no toca código. **No:** exigir dominio verificado ahora.
- **Sí:** validación en servidor + honeypot + estado de error, sin dependencias extra. Cubre el abuso básico y el caso de fallo de Resend. **No:** rate limit ni captcha (exigen almacén externo o terceros; spec futuro si hay spam real). **No:** validación mínima como la plantilla (dejaría el envío abierto a cualquiera).
- **Sí:** `replyTo` con el correo del visitante en lugar de usarlo como `from`. Resend solo permite remitentes verificados y así se puede responder directamente. **No:** suplantar el remitente.
- **Sí:** devolver `values` en el error para no perder el mensaje. **No:** limpiar el formulario ante un fallo.
- **Sí:** el honeypot responde éxito silencioso para no dar pistas al bot. **No:** devolver un error distinto.
- **Sí:** reutilizar `Reveal` de SPEC 02 y mantener la página como Server Component salvo el formulario. **No:** marcar `/acerca` entera como cliente.
- **Sí:** CSS en `app/globals.css`, como en SPEC 01 y 02. **No:** CSS Modules.
- **Sí:** copy portado tal cual (incluidos "RESPUESTA EN 24-48H" y "SIN SPAM, JAMÁS"). **No:** reescribirlo sin criterio del usuario.

---

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `onboarding@resend.dev` solo entrega a la cuenta propietaria de Resend; `CONTACT_TO_EMAIL` distinto fallaría | Documentarlo en `.env.example`; el estado de error cubre el rechazo de la API |
| Filtración de `RESEND_API_KEY` | Solo se lee en la Server Action, sin prefijo `NEXT_PUBLIC_`, `.env*` en `.gitignore`; verificar el bundle del cliente |
| Spam / abuso del formulario (sin rate limit) | Honeypot + límites de longitud; si hay abuso, spec futuro con rate limit o captcha |
| Inyección de HTML o de cabeceras con los datos del usuario | Cuerpo en texto plano; `subject` sin saltos de línea (se normaliza el nombre) |
| Next 16 con `cacheComponents` cambia el comportamiento de Server Actions y formularios | Leer `node_modules/next/dist/docs/` antes de cada paso |
| Copys que prometen lo que el producto no garantiza ("24-48H", "SIN SPAM, JAMÁS") | Se portan como maqueta; revisar antes de publicar |
| Falta de configuración en local o en despliegue (variables no definidas) | La acción devuelve `error: "send"` sin lanzar; `.env.example` lista las variables |

---

## Qué **no** está en este spec

- Dominio verificado, correo de confirmación al usuario ni plantillas React Email.
- Rate limit, captcha o almacenamiento de mensajes.
- Aviso de privacidad y cumplimiento legal.
- Revisión del copy de la página.
- Tests automatizados.

Cada uno de ellos, si se aborda, va en su propio spec.
