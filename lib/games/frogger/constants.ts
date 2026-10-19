// Canvas lógico (640×560): rejilla de 16×14 celdas de 40 px
export const COLS = 16;
export const ROWS = 14;
export const CELL = 40;
export const W = COLS * CELL;
export const H = ROWS * CELL;
// Zonas (índice de fila, 0 = arriba)
export const ROW_GOALS = 0;
export const ROW_RIVER_TOP = 1;
export const ROW_RIVER_BOT = 6;
export const ROW_SAFE_MID = 7;
export const ROW_ROAD_TOP = 8;
export const ROW_ROAD_BOT = 12;
export const ROW_START = 13;
export const START_COL = COLS / 2;
// Bocas destino: 5 bocas de 2 columnas cada una (columna inicial de cada una)
export const GOAL_WIDTH = 2;
export const GOAL_STARTS = [1, 4, 7, 10, 13] as const;
export const LIVES = 3;
export const JUMP_MS = 120;
export const HITBOX_MARGIN = 0.15; // celdas recortadas a cada lado de la rana
export const MAX_DT = 50; // ms
// Tiempo de ronda (ms), reducido en niveles altos
export const ROUND_TIME_MS = 15000;
export const ROUND_TIME_STEP_MS = 500;
export const MIN_ROUND_TIME_MS = 8000;
// Velocidad de los carriles (celdas/s): +15 % por nivel
export const LEVEL_SPEED_FACTOR = 0.15;
// Longitud del bucle de cada carril: COLS + el ancho máximo de una entidad (4),
// así una entidad que sale por un borde reaparece fuera de pantalla por el otro
export const LANE_LOOP = COLS + 4;
// Tortugas: ciclo de inmersión
export const TURTLE_VISIBLE_MS = 3000;
export const TURTLE_SUBMERGED_MS = 1500;
// Puntuación
export const ROW_POINTS = 10;
export const GOAL_POINTS = 50;
export const ROUND_POINTS = 200;
export const TIME_BONUS_PER_SECOND = 10;
// Tokens del tema que lee el motor en start() y sus valores por defecto
export const COLOR_VARS = {
  ink: "--ink",
  frog: "--green",
  road: "--magenta",
  river: "--cyan",
  gold: "--yellow",
} as const;
export type ColorKey = keyof typeof COLOR_VARS;
export type Colors = Record<ColorKey, string>;
export const DEFAULT_COLORS: Colors = {
  ink: "#e6e9ff",
  frog: "#00ff88",
  road: "#ff006e",
  river: "#00e5ff",
  gold: "#ffd60a",
};
export const BG_COLOR = "#000"; // valor por defecto de --game-bg
export const BG_VAR = "--game-bg";
export const GLOW_VAR = "--game-glow"; // px sin unidad
export const DEFAULT_GLOW = 12;
