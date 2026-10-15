import {
  BASE_STEP_MS,
  COLS,
  FRUITS_PER_LEVEL,
  FRUIT_POINTS,
  MIN_STEP_MS,
  ROWS,
  STEP_DECREASE_MS,
} from "./constants";

export interface Cell {
  col: number;
  row: number;
}
export type Direction = "up" | "down" | "left" | "right";

const DELTA: Record<Direction, Cell> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
};
const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

export function isOpposite(a: Direction, b: Direction): boolean {
  return OPPOSITE[a] === b;
}

export function nextHead(head: Cell, dir: Direction): Cell {
  return { col: head.col + DELTA[dir].col, row: head.row + DELTA[dir].row };
}

export function hitsWall(cell: Cell): boolean {
  return cell.col < 0 || cell.col >= COLS || cell.row < 0 || cell.row >= ROWS;
}

// `body` incluye la cabeza en el índice 0. Si `ignoreTail`, la última celda
// se ignora (la cola se mueve en ese paso si no se come).
export function hitsBody(cell: Cell, body: Cell[], ignoreTail: boolean): boolean {
  const end = ignoreTail ? body.length - 1 : body.length;
  for (let i = 0; i < end; i++) {
    if (body[i].col === cell.col && body[i].row === cell.row) return true;
  }
  return false;
}

// Devuelve null si no queda ninguna celda libre
export function pickFreeCell(
  body: Cell[],
  rand: () => number = Math.random,
): Cell | null {
  const taken = new Set(body.map((c) => c.row * COLS + c.col));
  const free: Cell[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (!taken.has(row * COLS + col)) free.push({ col, row });
    }
  }
  if (free.length === 0) return null;
  return free[Math.floor(rand() * free.length)];
}

// `eaten` = frutas comidas hasta ahora; nivel 1 con 0–4, nivel 2 con 5–9…
export function levelFor(eaten: number): number {
  return 1 + Math.floor(eaten / FRUITS_PER_LEVEL);
}

export function pointsFor(level: number): number {
  return FRUIT_POINTS * level;
}

export function stepMsFor(level: number): number {
  return Math.max(MIN_STEP_MS, BASE_STEP_MS - STEP_DECREASE_MS * (level - 1));
}
