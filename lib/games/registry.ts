import { createAsteroidsEngine } from "./asteroids/engine";
import type { GameEngineFactory } from "./types";

export const ENGINES: Record<string, GameEngineFactory> = {
  asteroides: createAsteroidsEngine,
};
