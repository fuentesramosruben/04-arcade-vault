import { createAsteroidsEngine } from "./asteroids/engine";
import type { GameEngineFactory } from "./types";
export const ENGINES: Record<string, GameEngineFactory> = {
  asteroides: createAsteroidsEngine,
};
export interface EngineMeta {
  width: number; // por defecto 800
  height: number; // por defecto 600
  lives: boolean; // por defecto true
  lines: boolean; // por defecto false
}
const DEFAULT_META: EngineMeta = {
  width: 800,
  height: 600,
  lives: true,
  lines: false,
};
// Solo los juegos que se apartan de los valores por defecto
export const ENGINE_META: Record<string, Partial<EngineMeta>> = {
  tetris: { width: 420, height: 600, lives: false, lines: true },
};
export function getEngineMeta(id: string): EngineMeta {
  return { ...DEFAULT_META, ...ENGINE_META[id] };
}
