import {
  COLS,
  DROP_STEP_MS,
  BASE_DROP_MS,
  LINES_PER_LEVEL,
  LINE_SCORES,
  MIN_DROP_MS,
  PIECES,
  PIECE_TYPES,
  ROWS,
  WALL_KICKS,
} from "./constants";
export type Board = number[][]; // ROWS × COLS; 0 = vacío, 1–8 = tipo de pieza
export interface Piece {
  type: number; // 1–8
  shape: number[][];
  x: number;
  y: number;
}
export function createBoard(): Board {
  return Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
}
// Tipo uniforme entre las 8 piezas; `rand` devuelve un número en [0, 1)
export function randomPiece(rand: () => number = Math.random): Piece {
  const type = Math.floor(rand() * PIECE_TYPES) + 1;
  const shape = PIECES[type].map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}
export function collide(
  board: Board,
  shape: number[][],
  ox: number,
  oy: number,
): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}
export function rotateCW(shape: number[][]): number[][] {
  const rows = shape.length;
  const cols = shape[0].length;
  const result = Array.from({ length: cols }, () =>
    new Array<number>(rows).fill(0),
  );
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
}
// Rotación horaria con wall kicks horizontales; null si no cabe en ninguno
export function tryRotate(board: Board, piece: Piece): Piece | null {
  const shape = rotateCW(piece.shape);
  for (const kick of WALL_KICKS) {
    if (!collide(board, shape, piece.x + kick, piece.y)) {
      return { ...piece, shape, x: piece.x + kick };
    }
  }
  return null;
}
// Devuelve un tablero nuevo con la pieza fijada
export function merge(board: Board, piece: Piece): Board {
  const next = board.map((row) => [...row]);
  for (let r = 0; r < piece.shape.length; r++)
    for (let c = 0; c < piece.shape[r].length; c++)
      if (piece.shape[r][c]) next[piece.y + r][piece.x + c] = piece.shape[r][c];
  return next;
}
// Elimina las filas completas; devuelve un tablero nuevo y cuántas se quitaron
export function clearLines(board: Board): { board: Board; cleared: number } {
  const kept = board.filter((row) => row.some((v) => v === 0));
  const cleared = ROWS - kept.length;
  const fresh = Array.from({ length: cleared }, () =>
    new Array<number>(COLS).fill(0),
  );
  return { board: [...fresh, ...kept], cleared };
}
// Fila donde aterrizaría la pieza
export function ghostY(board: Board, piece: Piece): number {
  let gy = piece.y;
  while (!collide(board, piece.shape, piece.x, gy + 1)) gy++;
  return gy;
}
export function lineScore(cleared: number, level: number): number {
  return (LINE_SCORES[cleared] ?? 0) * level;
}
export function levelFor(lines: number): number {
  return Math.floor(lines / LINES_PER_LEVEL) + 1;
}
// ms entre caídas de gravedad
export function dropInterval(level: number): number {
  return Math.max(MIN_DROP_MS, BASE_DROP_MS - (level - 1) * DROP_STEP_MS);
}
