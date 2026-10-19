export interface TouchButton {
  code: string; // KeyboardEvent.code que entiende el motor, p. ej. "ArrowLeft"
  key: string; // KeyboardEvent.key, p. ej. "ArrowLeft", " "
  label: string; // texto o símbolo visible: "←", "DISPARO"
  ariaLabel: string; // "Girar a la izquierda"
  area: "left" | "right" | "up" | "down" | "action"; // posición en la rejilla del panel
}
export interface TouchLayout {
  buttons: TouchButton[];
}
const LEFT: TouchButton = {
  code: "ArrowLeft",
  key: "ArrowLeft",
  label: "←",
  ariaLabel: "Mover a la izquierda",
  area: "left",
};
const RIGHT: TouchButton = {
  code: "ArrowRight",
  key: "ArrowRight",
  label: "→",
  ariaLabel: "Mover a la derecha",
  area: "right",
};
// Cruceta de cuatro direcciones (snake y frogger)
const DPAD = (verb: string): TouchButton[] => [
  {
    code: "ArrowUp",
    key: "ArrowUp",
    label: "↑",
    ariaLabel: `${verb} hacia arriba`,
    area: "up",
  },
  {
    code: "ArrowDown",
    key: "ArrowDown",
    label: "↓",
    ariaLabel: `${verb} hacia abajo`,
    area: "down",
  },
  { ...LEFT, ariaLabel: `${verb} a la izquierda` },
  { ...RIGHT, ariaLabel: `${verb} a la derecha` },
];
// Un layout por cada clave de ENGINES (los códigos son los que lee el motor)
export const TOUCH_LAYOUTS: Record<string, TouchLayout> = {
  asteroides: {
    buttons: [
      { ...LEFT, ariaLabel: "Girar a la izquierda" },
      { ...RIGHT, ariaLabel: "Girar a la derecha" },
      {
        code: "ArrowUp",
        key: "ArrowUp",
        label: "↑",
        ariaLabel: "Propulsar",
        area: "up",
      },
      {
        code: "Space",
        key: " ",
        label: "DISPARO",
        ariaLabel: "Disparar",
        area: "action",
      },
    ],
  },
  tetris: {
    buttons: [
      LEFT,
      RIGHT,
      {
        code: "ArrowDown",
        key: "ArrowDown",
        label: "↓",
        ariaLabel: "Bajar la pieza",
        area: "down",
      },
      {
        code: "ArrowUp",
        key: "ArrowUp",
        label: "↻",
        ariaLabel: "Rotar la pieza",
        area: "up",
      },
      {
        code: "Space",
        key: " ",
        label: "CAÍDA",
        ariaLabel: "Caída instantánea",
        area: "action",
      },
    ],
  },
  arkanoid: { buttons: [LEFT, RIGHT] },
  snake: { buttons: DPAD("Girar") },
  frogger: { buttons: DPAD("Saltar") },
};
// Despacha el evento en window: su target no es un HTMLElement, así que los
// motores no lo confunden con un input o botón enfocado
export function dispatchKey(type: "keydown" | "keyup", button: TouchButton) {
  window.dispatchEvent(
    new KeyboardEvent(type, {
      code: button.code,
      key: button.key,
      bubbles: true,
      cancelable: true,
    }),
  );
}
