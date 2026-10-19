---
name: spec-impl-game
description: Implementa un spec de juego aprobado siguiendo /spec-impl y, al terminar, lanza en secuencia los subagentes skin-designer y mobile-porter para ese juego.
disable-model-invocation: true
argument-hint: <NN-juego-id>
allowed-tools: Read, Glob, Grep, Edit, Write, Agent, AskUserQuestion, Bash(git status:*), Bash(git branch:*), Bash(git checkout:*), Bash(git log:*), Bash(git diff:*), Bash(git stash:*), Bash(cat:*), Bash(ls:*)
---

# /spec-impl-game — Implementación de un juego + skins + vista móvil

Capa sobre `/spec-impl` para specs de juego (`specs/NN-juego-<id>.md`). No duplica su lógica: la reutiliza y añade, al final, dos subagentes.

## Instrucciones

El argumento recibido es: `$ARGUMENTS`

### Fase A — Implementación (delegada en /spec-impl)

1. Lee `.claude/skills/spec-impl/SKILL.md` y ejecuta **todas sus fases** (1 a 4) con el mismo `$ARGUMENTS`, tal cual están escritas: identificar el spec, validar que esté aprobado, rama `spec-NN-slug`, resumen del spec y un paso del plan por vez con pausa para revisar el diff. Ejecuta tú mismo sus comandos de contexto (`git status --short`, `git branch --show-current`, `ls specs/`, `cat specs/.spec-config.yml`).
2. Si `/spec-impl` y este archivo chocan, manda `/spec-impl`.
3. Si `/spec-impl` se detiene (spec no aprobado, argumento vacío o inexistente, cambios sin confirmar, ambigüedad sin resolver, usuario que pausa), **para aquí**: no lances ningún subagente.
4. Sin commits automáticos, igual que en `/spec-impl`.

### Fase B — Subagentes (solo tras terminar la implementación)

Solo cuando hayas emitido el mensaje final de `/spec-impl` ("All steps of the plan are implemented"):

1. Obtén el `<id>` del juego: el spec se llama `NN-juego-<id>`, así que `<id>` es lo que sigue a `juego-` (p. ej. `07-juego-tetris` → `tetris`). Debe coincidir con la clave en `ENGINES`; si no puedes deducirlo con certeza, pregunta al usuario.
2. Lanza **en secuencia, nunca en paralelo** (una llamada a `Agent` por mensaje, esperando el resultado de la anterior):
   1. `Agent` con `subagent_type: "skin-designer"`, prompt: `<id>` (las tres skins del juego). Espera a que termine.
   2. Solo si el anterior terminó sin error: `Agent` con `subagent_type: "mobile-porter"`, prompt: `/juegos/<id>` (una ruta por ejecución).
3. Si `skin-designer` falla o queda bloqueado, no lances `mobile-porter`; informa al usuario y espera su decisión.
4. Al final resume en pocas líneas: qué hizo cada subagente, ficheros tocados y qué actualizaron (`references/game-with-themes.md`, `references/mobile-review.md`). Recuerda al usuario verificar los criterios de aceptación, marcar el spec como `Implementado` y hacer el commit.

## Resumen

```
/spec-impl-game 10-juego-pong

  Fase A  →  /spec-impl 10-juego-pong (validación, rama, pasos con pausas)
  Fase B  →  skin-designer pong  →  (termina)  →  mobile-porter /juegos/pong
```
