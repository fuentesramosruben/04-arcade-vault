# SPEC XX — Parejas: cartas especiales RELOJ y OJO

> **Status:** Borrador
> **Depends on:** SPEC 05, SPEC 06, SPEC 07, SPEC XX-01
> **Date:** 2026-10-18
> **Objective:** Añadir a `parejas`, desde el nivel 3, parejas especiales RELOJ (+8 s) y OJO (vistazo de 1 s a las cartas ocultas), sin cambiar el tamaño de los tableros ni la puntuación base.

---

## Por qué existe este spec

Con el SPEC XX-01, los seis niveles solo cambian de tamaño y de tiempo: la decisión de qué carta voltear siempre es la misma. Las parejas especiales añaden una decisión de riesgo (¿busco el RELOJ antes de que se acabe el tiempo?) y un alivio en los niveles largos, sin cambiar la estructura del juego.

Las cartas especiales **reemplazan** una pareja normal del nivel (no se suman), así que el número de cartas y la geometría del SPEC XX-01 no cambian. No necesita el ratón ni las animaciones del SPEC XX-02 y puede implementarse antes o después. No hay extensión del contrato ni cambios fuera de `lib/games/parejas/`.

---

## Alcance

**Dentro:**

- Dos caras especiales, ambas en pareja (dos cartas iguales):
  - **RELOJ:** al emparejarlo suma 8 s al tiempo restante, con tope en el tiempo total del nivel.
  - **OJO:** al emparejarlo muestra durante 1 000 ms todas las cartas boca abajo, con el tiempo parado.
- Presencia por nivel (cada pareja especial sustituye a una pareja normal):

| Nivel | Especiales |
| :---: | ---------- |
|   1   | ninguna    |
|   2   | ninguna    |
|   3   | RELOJ      |
|   4   | RELOJ      |
|   5   | RELOJ, OJO |
|   6   | RELOJ, OJO |

- Las parejas especiales puntúan como cualquier pareja (`100 × combo`) y cuentan para el combo.
- Dibujo vectorial de ambas caras con los tokens del tema, con borde `--gold` para distinguirlas de las caras normales una vez volteadas.
- Fase nueva `peek` de 1 000 ms para el OJO.
- Nota breve en `CLAUDE.md`.

**Fuera de alcance (specs futuros):**

- Más tipos de carta especial (congelar, barajar, bomba).
- Cartas especiales sueltas (no emparejables) o con efecto negativo.
- Cambios en el tamaño de los tableros, en los tiempos base o en la fórmula de puntos del SPEC XX-01.
- Ratón y animaciones (SPEC XX-02).
- Sonido y música.
- Cambios en el contrato, la plataforma o la base de datos.
- Antitrampas, autenticación y moderación de nombres.
- Tests automatizados.

---

## Modelo de datos

- Sin tablas, sin migración y sin cambios en `registry.ts`, `lib/games.ts` ni `GameStats`.
- Archivos tocados: `lib/games/parejas/engine.ts`, `entities.ts` y `constants.ts`.
- Tipos y constantes:

```ts
// lib/games/parejas/constants.ts
export type SpecialKind = "clock" | "eye";
export const FACE_CLOCK = 36; // caras 0..35 son las normales
export const FACE_EYE = 37;
export const CLOCK_BONUS_MS = 8000;
export const PEEK_MS = 1000;
// LevelDef gana un campo opcional (los niveles 1 y 2 no lo definen)
export interface LevelDef {
  rows: number;
  cols: number;
  timeSec: number;
  previewMs: number;
  specials?: SpecialKind[];
}

// lib/games/parejas/entities.ts
export function isSpecial(face: number): boolean; // face >= FACE_CLOCK
export function addClockTime(remainingMs: number, totalMs: number): number; // min(totalMs, remainingMs + 8000)
export function buildDeck(
  pairs: number,
  rng: () => number,
  specials?: SpecialKind[],
): Card[];
export type Phase = "preview" | "play" | "reveal" | "peek" | "clear" | "over"; // "peek" es nueva
```

- `buildDeck` con `specials` reserva una pareja por cada especial y completa el resto con caras normales distintas; sin `specials` se comporta exactamente como en el SPEC XX-01. El número total de parejas del nivel no cambia (por ejemplo, el nivel 5 tiene 15: 13 normales y 2 especiales).
- Resolución de una pareja especial, tras sumar sus puntos:
  - **RELOJ:** `restante = addClockTime(restante, timeSec × 1000)`. La barra de tiempo sube de forma visible.
  - **OJO:** fase `peek` de 1 000 ms. Las cartas `down` se dibujan como boca arriba, el tiempo está parado y el volteo se ignora. Al terminar vuelven a `down` y la fase pasa a `play`.
  - Si la pareja especial es la última del nivel, el nivel termina por la rama normal (`clear`): el OJO no abre `peek` y el RELOJ cuenta para el bonus de tiempo.
- Caras especiales (dibujo, con `--gold` en el borde de la carta y trazo de 4 px):
  - RELOJ: círculo de radio `0.32 × S` con dos agujas (de 12 y de 3 horas) desde el centro, en `--yellow`.
  - OJO: elipse horizontal de semiejes `0.40 × S` y `0.22 × S` con una pupila circular de radio `0.10 × S`, en `--cyan`.
- Puntuación: sin cambios. Máximo teórico del SPEC XX-01 (~54 000) sin alteración relevante: el tope de tiempo del RELOJ impide superar el tiempo total del nivel en el bonus (como mucho 22 550 en total).
- La barra de tiempo se calcula con `restante / (timeSec × 1000)`, así que tras un RELOJ vuelve a su color según el nuevo porcentaje.
- Pausa y `dt`: los 1 000 ms del `peek` avanzan solo con `dt` (limitado a 50 ms), así que la pausa los congela.

---

## Plan de implementación

Antes de cada paso se consulta la guía relevante en `node_modules/next/dist/docs/` si se toca algo de Next.

1. **Constantes y entidades.** Añadir `SpecialKind`, `FACE_CLOCK`, `FACE_EYE`, `CLOCK_BONUS_MS`, `PEEK_MS`, `specials` en los niveles 3 a 6, `isSpecial`, `addClockTime` y el parámetro opcional de `buildDeck`. Verificación: `tsc`; `buildDeck(15, Math.random, ["clock", "eye"])` devuelve 30 cartas con 13 caras normales y las caras 36 y 37 dos veces cada una.
2. **Dibujo de las caras especiales.** Añadir RELOJ y OJO al dibujo de cartas. Verificación: en el nivel 3, al voltear la pareja especial se ve el reloj con borde dorado, y el nivel 1 no cambia.
3. **Efecto RELOJ.** Sumar 8 s al emparejarlo con tope en el total. Verificación: con 20 s restantes pasa a 28 s; con 3 s por debajo del total, queda en el total.
4. **Efecto OJO.** Añadir la fase `peek` de 1 000 ms con tiempo parado y volteo ignorado. Verificación: tras emparejar el OJO se ven todas las cartas ocultas durante 1 s y la barra no baja; la pausa lo congela.
5. **Comprobaciones de regresión.** Jugar los niveles 1 y 2 y comparar con el SPEC XX-01. Verificación: sin diferencias; puntos, tiempos y tableros idénticos.
6. **Documentación.** Nota en `CLAUDE.md`. Verificación: `git diff` solo contiene archivos de este spec.

---

## Criterios de aceptación

- [ ] `npm run build` y `npm run lint` terminan sin errores.
- [ ] Los niveles 1 y 2 no contienen cartas especiales y se comportan exactamente como en el SPEC XX-01.
- [ ] Los niveles 3 y 4 contienen exactamente 2 cartas RELOJ y ninguna OJO; los niveles 5 y 6 contienen 2 RELOJ y 2 OJO.
- [ ] El número de cartas de cada nivel no cambia (20, 24, 30 y 36 respectivamente).
- [ ] Emparejar los dos RELOJ suma 8 s al tiempo restante y nunca lo deja por encima del tiempo total del nivel.
- [ ] Emparejar los dos OJO muestra todas las cartas boca abajo durante 1 000 ms, sin que baje la barra de tiempo, y vuelven a ocultarse.
- [ ] Durante `peek` el volteo (teclado) no tiene efecto y el cursor se puede mover.
- [ ] PAUSA, `P` y `Esc` durante `peek` congelan el temporizador y, al reanudar, la fase dura lo que faltaba.
- [ ] Una pareja especial suma `100 × combo` y un fallo con una carta especial rompe el combo como cualquier otro.
- [ ] Si la última pareja del nivel es RELOJ u OJO, el nivel se cierra sin `peek` y el bonus de tiempo usa el tiempo restante incluyendo el RELOJ.
- [ ] Las caras especiales se distinguen de las normales por el borde dorado una vez volteadas, y sus reversos son idénticos al resto.
- [ ] El canvas sigue sin contener texto.
- [ ] No hay cambios en `registry.ts`, `lib/games.ts`, migraciones ni componentes de la plataforma; `asteroides`, `tetris`, `arkanoid` y `snake` se comportan exactamente igual.
- [ ] La puntuación máxima posible sigue siendo inferior a 10 000 000.
- [ ] `CLAUDE.md` documenta las cartas especiales.

---

## Decisiones

- **Sí:** las especiales sustituyen a una pareja normal (propuesta del agente, revisar). **No:** añadirlas encima: cambiaría la geometría del SPEC XX-01 y los tableros dejarían de ser rectángulos completos.
- **Sí:** especiales siempre en pareja y puntuando como cualquier pareja. **No:** cartas sueltas con efecto inmediato: romperían la lógica de pareja y el contador de parejas del nivel.
- **Sí:** RELOJ de +8 s con tope en el tiempo total. **No:** tiempo ilimitado acumulable, que haría trivial el ranking.
- **Sí:** OJO como vistazo de 1 s con tiempo parado. **No:** vistazo que gasta tiempo, que anularía su valor.
- **Sí:** empezar en el nivel 3 y añadir el OJO en el 5. **No:** especiales desde el nivel 1: el tablero de 12 cartas no las necesita.
- **Sí:** borde `--gold` como señal visual y reversos idénticos. **No:** reverso distinto, que delataría su posición.
- **Sí:** sin efectos negativos. **No:** cartas trampa; si se quieren, otro spec.
- **Sí:** puntuación base sin cambios. **No:** puntos extra por especial: el beneficio ya es el efecto.
- **Sí:** sin sonido. **No:** añadir efectos en este spec.

---

## Riesgos

| Riesgo                                                        | Mitigación                                                                                                                     |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `buildDeck` con especiales rompe el sorteo de caras distintas | Parámetro opcional; sin él, mismo comportamiento que en el SPEC XX-01; verificación del paso 1                                 |
| El RELOJ en la última pareja da bonus inflado                 | Tope en el tiempo total del nivel; el bonus máximo del SPEC XX-01 no se supera                                                 |
| `peek` deja las cartas visibles tras una pausa o un reinicio  | Temporizador con `dt`; `restart()` reinicia fase y cartas                                                                      |
| `peek` y el volteo de la segunda carta pendiente              | `peek` solo se abre tras resolver la pareja, nunca con una carta `up` sin resolver                                             |
| El borde dorado delata dónde están las especiales             | Solo se dibuja con la carta boca arriba; el reverso es idéntico                                                                |
| Doble montaje en Strict Mode y listeners persistentes         | Sin listeners nuevos; los de teclado siguen en `start()`/`destroy()` del SPEC XX-01                                            |
| Cambio accidental de comportamiento en niveles 1 y 2          | Criterios de regresión y paso 5 del plan                                                                                       |
| Conflicto con el SPEC XX-02 al implementarse ambos            | Cambios en zonas distintas (dibujo de caras y fases frente a ratón y animación); resolver el merge en el orden que se aprueben |

---

## Qué **no** está en este spec

- Más tipos de carta especial, cartas sueltas o con efecto negativo.
- Cambios en tableros, tiempos base o fórmula de puntos del SPEC XX-01.
- Ratón y animaciones (SPEC XX-02).
- Sonido y música.
- Cambios en el contrato, la plataforma o la base de datos.
- Autenticación, antitrampas y moderación de nombres.
- Tests automatizados.

Cada uno de ellos, si se aborda, va en su propio spec.
