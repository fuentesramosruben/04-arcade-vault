// Canvas lógico (800×600, valores por defecto del contrato)
export const W = 800;
export const H = 600;
export const COLS = 20;
export const ROWS = 15;
export const CELL = 40;
export const START_LENGTH = 3;
export const START_COL = 5;
export const START_ROW = 7;
export const FRUIT_POINTS = 10;
export const FRUITS_PER_LEVEL = 5;
export const BASE_STEP_MS = 150;
export const STEP_DECREASE_MS = 10;
export const MIN_STEP_MS = 70;
export const MAX_TURN_QUEUE = 2;
export const MAX_DT = 50; // ms
export const SPRITE_MARGIN = 2; // px dentro de la celda
export const FRUIT_SHEET_URL = "/games/snake/fruits.png";
export interface SpriteRect {
  x: number;
  y: number;
  w: number;
  h: number;
}
// Fila pixel-art de fruits.png (3790×442), coordenadas de sprites.js
export const FRUIT_SPRITES: Record<string, SpriteRect> = {
  banana: { x: 34, y: 136, w: 110, h: 160 },
  orange: { x: 186, y: 136, w: 150, h: 160 },
  grape: { x: 378, y: 136, w: 110, h: 160 },
  garlic: { x: 540, y: 136, w: 130, h: 160 },
  eggplant: { x: 712, y: 136, w: 130, h: 160 },
  strawberry: { x: 894, y: 136, w: 110, h: 160 },
  cherry: { x: 1066, y: 136, w: 110, h: 160 },
  carrot: { x: 1228, y: 136, w: 130, h: 160 },
  mushroom: { x: 1400, y: 136, w: 130, h: 160 },
  broccoli: { x: 1582, y: 136, w: 110, h: 160 },
  watermelon: { x: 1734, y: 136, w: 150, h: 160 },
  pepper: { x: 1906, y: 136, w: 150, h: 160 },
  kiwi: { x: 2068, y: 136, w: 170, h: 160 },
  lemon: { x: 2250, y: 136, w: 140, h: 160 },
  peach: { x: 2432, y: 136, w: 130, h: 160 },
  peanut: { x: 2604, y: 136, w: 130, h: 160 },
  apple: { x: 2786, y: 136, w: 110, h: 160 },
  tomato: { x: 2948, y: 136, w: 130, h: 160 },
  berries: { x: 3110, y: 136, w: 150, h: 160 },
  grapes2: { x: 3302, y: 136, w: 110, h: 160 },
  pineapple: { x: 3454, y: 136, w: 150, h: 160 },
  melon: { x: 3637, y: 136, w: 130, h: 160 },
};
export const FRUIT_KEYS = Object.keys(FRUIT_SPRITES);
// Colores por defecto; el motor los sustituye por los tokens del tema en start()
export const DEFAULT_COLORS = {
  bg: "#0a0a12",
  grid: "rgba(255,255,255,0.05)",
  snake: "#39ff14",
  fruit: "#ff2bd6",
};
