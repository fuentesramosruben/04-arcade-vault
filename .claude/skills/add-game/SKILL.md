---
name: add-game
description: Genera el spec de un juego nuevo para Arcade Vault (portado desde references/started-games o diseñado desde cero) con motor GameEngine, entrada de catálogo, leaderboard y migración ranked. Se apoya en la skill /spec y no escribe código.
disable-model-invocation: true
argument-hint: "<id-del-juego | carpeta de references/started-games, p. ej. tetris>"
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(grep:*)
---

# /add-game — Spec de un juego nuevo con ranking

## Contexto de sesión

Fecha de hoy (úsala en la cabecera del spec, nunca la adivines):
!`date +%F`

Specs existentes:
!`ls specs/ 2>/dev/null || echo "No existe la carpeta specs/"`

Juegos de referencia disponibles:
!`ls references/started-games/ 2>/dev/null || echo "No existe references/started-games/"`

Juegos que ya tienen motor (registro `ENGINES`):
!`cat lib/games/registry.ts`

Ids del catálogo actual:
!`grep -o 'id: "[^"]*"' lib/games.ts`

---

`/add-game` es una capa específica de juegos sobre `/spec`. Genera el archivo `specs/NN-juego-<id>.md` que luego se implementa con `/spec-impl`. **No escribes código ni aplicas migraciones aquí**: el SQL y los fragmentos de código van dentro del spec como descripción.

## Base obligatoria: la skill /spec

Antes de preguntar nada, y de nuevo justo antes de escribir el archivo:

1. Lee `.claude/skills/spec/SKILL.md` y `.claude/skills/spec/template.md` con Read.
2. Sigue sus fases (1 contexto, 2 preguntas, 3 redactar, 4 guardar), sus reglas duras y sus convenciones: preguntas en bloques de 3 a 5 con `AskUserQuestion`, escritura de una vez si no falta información, numeración `NN-slug`, estado inicial sin aprobar, comprobación de `Depends on`, siembra de `specs/.spec-config.yml` si falta, confirmación final y parar.
3. Si `/add-game` y `/spec` chocan, manda `/spec`, salvo en lo propio de juegos descrito aquí.
4. Lee también `reference.md` y `template.md` de esta carpeta (mapa de integración, contrato, reglas de portado y partes fijas del spec), más `specs/05-juego-asteroides.md` y `specs/06-leaderboard-y-catalogo-de-juegos.md` como ejemplo canónico del resultado.

Responde en el idioma del usuario (español por defecto en este repo).

## Fases (mapeadas a /spec)

### Fase 1 — Contexto (= Fase 1 de /spec)

1. Lee `CLAUDE.md` y los archivos indicados arriba.
2. Resuelve `$ARGUMENTS`:
   - Si coincide con una carpeta de `references/started-games/` (nombre completo, número o slug: `tetris` → `03-tetris`), léela entera: `CLAUDE.md`, `README.md`, `index.html`, `game.js` y el resto (`levels.js`, `assets/`, `style.css`). Haz un inventario: tamaño del canvas, mecánicas, puntuación, vidas, niveles, controles, HUD y overlays que hay que quitar del canvas, globals y listeners, assets y sonido.
   - Si no coincide, es un juego desde cero: las mecánicas se definen en las preguntas.
   - Si no hay argumento, pide el id o la carpeta en una frase.
3. Si el id ya está en `ENGINES`, avisa y para: ese juego ya tiene motor.
4. Detecta si existe un mock equivalente en `lib/games.ts` (ver "Notas por referencia" en `reference.md`).

### Fase 2 — Preguntas (= Fase 2 de /spec)

Usa `AskUserQuestion`, con tu recomendación primero. No preguntes lo que ya se pueda leer del código de la referencia. Categorías que siempre debes cubrir:

- **Catálogo:** id (slug), título, `cat`, `color`, textos `short`/`long`. Si hay mock equivalente, **pregunta siempre** si se reutiliza su id (el mock pasa a tener motor y `ranked = true`) o se crea una entrada nueva (el mock queda intacto, como pasó con `asteroides` y `rocas`).
- **Mecánicas:** qué se conserva y qué se descarta del original; escala de puntos (debe caber en 1 a 10 000 000, el `CHECK` de `scores`).
- **Contrato:** resolución y aspecto del canvas, si hay vidas y niveles. Si no encaja en el contrato actual, propón las extensiones opcionales y retrocompatibles de `reference.md`.
- **Controles:** teclas del juego (`P` y `Esc` siempre pausan) y leyenda de `CONTROLS`.
- **Assets y sonido:** portar a `public/games/<id>/`, redibujar en vectorial, o fuera de alcance.
- **Estética:** tokens neón del tema y portada `cover-<id>` (el diseño visual se hace con `/frontend-design` durante la implementación).
- **Decisiones cerradas:** lo que ya vive en SPEC 05/06 no se reabre (ver reglas duras).

Para cuando puedas responder sin suponer: qué archivos cambian, cuál es el primer y el último paso, y cómo se verifica.

### Fase 3 — Redactar (= Fase 3 de /spec)

Usa la estructura y el orden de secciones de `.claude/skills/spec/template.md`, con los títulos en español de SPEC 05/06, y rellena con las partes fijas de `template.md` de esta carpeta solo lo variable del juego. Si hay extensión de contrato, añade sus pasos, criterios y decisiones, incluido el criterio "Asteroides sigue funcionando igual".

Si falta información, usa el modo sección por sección de `/spec`.

### Fase 4 — Guardar (= Fase 4 de /spec)

Vuelve a leer la Fase 4 de `.claude/skills/spec/SKILL.md` y aplícala:

- Archivo: `specs/NN-juego-<id>.md`, con `NN` el siguiente número libre.
- Estado `Borrador` (el término que usan los specs del repo; nunca `Aprobado`).
- `Depends on: SPEC 05, SPEC 06`, más el spec que haya extendido el contrato si existe. Comprueba que cada dependencia existe en `specs/`.
- Fecha: la del contexto de sesión.
- Siembra `specs/.spec-config.yml` si falta.
- Confirma la ruta, recuerda que está en `Borrador` y que el siguiente paso es `/spec-impl NN-juego-<id>`. **Para ahí.**

## Reglas duras

- No escribas código ni apliques migraciones; solo el `.md` del spec (y `.spec-config.yml` si falta).
- No reabras decisiones de SPEC 05/06: HUD, pausa y modal de la plataforma (el motor solo emite datos), guardado en `scores` con RLS, Top 50 sin paginación, nombre libre sin auth, `best`/`plays` desde `game_stats`, estado vacío real sin seed.
- Un juego por spec. Si piden varios, propón un spec por juego.
- No propongas implementar tras guardar el spec.
- Una extensión del contrato nunca puede cambiar el comportamiento de los juegos que ya tienen motor.
