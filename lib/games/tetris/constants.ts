export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30;
export const BOARD_W = COLS * BLOCK; // 300
export const BOARD_H = ROWS * BLOCK; // 600
// Canvas lógico: tablero a la izquierda y recuadro SIGUIENTE a la derecha
export const W = 420;
export const H = 600;
export const SIDE_W = W - BOARD_W; // 120
export const NEXT_BLOCK = 24;
// Índice = tipo de pieza (1–8): I, O, T, S, Z, J, L y N (tuerca)
export const PIECES: number[][][] = [
  [],
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N (tuerca)
];
export const PIECE_TYPES = PIECES.length - 1; // 8
export const WALL_KICKS = [0, -1, 1, -2, 2];
// Índice = líneas simultáneas
export const LINE_SCORES = [0, 100, 300, 500, 800];
export const LINES_PER_LEVEL = 10;
export const SOFT_DROP_POINTS = 1; // por fila
export const HARD_DROP_POINTS = 2; // por celda recorrida
export const MAX_DT = 50; // ms
export const BASE_DROP_MS = 1000;
export const MIN_DROP_MS = 100;
export const DROP_STEP_MS = 90; // menos por nivel
// Auto-repeat propio del motor para ← → ↓ (ms)
export const DAS = 170;
export const ARR = 50;
export interface Palette {
  cyan: string;
  magenta: string;
  yellow: string;
  ink: string;
}
// Valores por defecto si faltan las variables CSS del tema
export const DEFAULT_PALETTE: Palette = {
  cyan: "#00f5ff",
  magenta: "#ff006e",
  yellow: "#f5ff00",
  ink: "#e6e9ff",
};
// Variables CSS del tema de las que se derivan los colores
export const PALETTE_VARS = {
  cyan: "--cyan",
  magenta: "--magenta",
  yellow: "--yellow",
  ink: "--ink",
} as const;
// Token por tipo de pieza (índice 1–8); con 4 tokens para 8 piezas algunos se repiten
export const PIECE_COLOR_KEYS: (keyof Palette)[] = [
  "ink", // sin uso (tipo 0)
  "cyan", // I
  "yellow", // O
  "magenta", // T
  "cyan", // S
  "magenta", // Z
  "yellow", // J
  "ink", // L
  "ink", // N
];
