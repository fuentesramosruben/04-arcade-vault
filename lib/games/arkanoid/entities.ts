import { BLOCK_H, BLOCK_W, GRID_X, GRID_Y, LEVELS } from "./constants";
export type BlockColor =
  "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green" | "gray";
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Ball extends Rect {
  vx: number;
  vy: number;
}
export interface Block extends Rect {
  color: BlockColor;
  alive: boolean;
}
export interface Explosion extends Rect {
  color: BlockColor;
  elapsed: number; // ms
}
export function collideAABB(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}
// `level` es 1–5
export function buildBlocks(level: number): Block[] {
  return LEVELS[level - 1].cells.map(({ col, row, color }) => ({
    x: GRID_X + col * BLOCK_W,
    y: GRID_Y + row * BLOCK_H,
    w: BLOCK_W,
    h: BLOCK_H,
    color,
    alive: true,
  }));
}
