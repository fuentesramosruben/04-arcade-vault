import type { BlockColor } from "./entities";
// Canvas lógico (800×600, valores por defecto del contrato)
export const W = 800;
export const H = 600;
export const PADDLE_W = 81;
export const PADDLE_H = 14;
export const PADDLE_Y = 560;
export const PADDLE_SPEED = 400; // px/s
export const BALL_SIZE = 16;
export const BASE_BALL_VX = 200;
export const BASE_BALL_VY = -300;
export const BLOCK_W = 64;
export const BLOCK_H = 24;
export const GRID_COLS = 10;
export const GRID_X = (W - GRID_COLS * BLOCK_W) / 2; // 80
export const GRID_Y = 80;
export const START_LIVES = 3;
export const BLOCK_POINTS = 10;
export const EXPLOSION_MS = 150;
export const MAX_DT = 50; // ms
export interface LevelDef {
  speed: number;
  cells: { col: number; row: number; color: BlockColor }[];
}
const ROWS = 6;
const COLS = GRID_COLS;
function build(
  keep: (col: number, row: number) => BlockColor | null,
): LevelDef["cells"] {
  const cells: LevelDef["cells"] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const color = keep(col, row);
      if (color) cells.push({ col, row, color });
    }
  }
  return cells;
}
const ROW_COLORS_1: BlockColor[] = [
  "red",
  "yellow",
  "cyan",
  "magenta",
  "hotpink",
  "green",
];
const ROW_COLORS_2: BlockColor[] = [
  "gray",
  "cyan",
  "hotpink",
  "yellow",
  "magenta",
  "green",
];
const ROW_COLORS_4: BlockColor[] = [
  "cyan",
  "magenta",
  "green",
  "yellow",
  "hotpink",
  "red",
];
const PYRAMID_START = [4, 3, 2, 1, 0, 0];
const PYRAMID_END = [5, 6, 7, 8, 9, 9];
const GAPS_4 = [
  [2, 5, 8],
  [0, 4, 7, 9],
  [1, 3, 6],
  [2, 5, 8, 9],
  [0, 4, 7],
  [1, 3, 6, 9],
];
// 5 niveles (60, 40, 30, 39 y 39 bloques) con los patrones de levels.js
export const LEVELS: LevelDef[] = [
  // 1: rectángulo
  { speed: 1.0, cells: build((_c, r) => ROW_COLORS_1[r]) },
  // 2: pirámide
  {
    speed: 1.1,
    cells: build((c, r) =>
      c >= PYRAMID_START[r] && c <= PYRAMID_END[r] ? ROW_COLORS_2[r] : null,
    ),
  },
  // 3: ajedrez
  {
    speed: 1.21,
    cells: build((c, r) =>
      (c + r) % 2 === 0 ? (r < 3 ? "yellow" : "magenta") : null,
    ),
  },
  // 4: huecos
  {
    speed: 1.33,
    cells: build((c, r) => (GAPS_4[r].includes(c) ? null : ROW_COLORS_4[r])),
  },
  // 5: marco con cruz
  {
    speed: 1.46,
    cells: build((c, r) => {
      const isFrame = c === 0 || c === COLS - 1 || r === 0 || r === ROWS - 1;
      const isCross = c === 4 || r === 2;
      if (!isFrame && !isCross) return null;
      return isCross && !isFrame ? "hotpink" : "cyan";
    }),
  },
];
export const LEVEL_COUNT = LEVELS.length;
// Variables CSS del tema de las que se leen los colores en start()
export const PALETTE_VARS = {
  cyan: "--cyan",
  magenta: "--magenta",
  yellow: "--yellow",
  green: "--green",
  ink: "--ink",
} as const;
export type ThemeKey = keyof typeof PALETTE_VARS;
export type Palette = Record<BlockColor | "ink", string>;
// Valores por defecto si faltan las variables del tema; red, hotpink y gray son fijos
export const DEFAULT_PALETTE: Palette = {
  red: "#ff3b3b",
  yellow: "#f5ff00",
  cyan: "#00f5ff",
  magenta: "#ff006e",
  hotpink: "#ff69b4",
  green: "#00ff88",
  gray: "#8a8fb5",
  ink: "#e6e9ff",
};
export const SOUND_BOUNCE = "/games/arkanoid/sounds/ball-bounce.mp3";
export const SOUND_BREAK = "/games/arkanoid/sounds/break-sound.mp3";
