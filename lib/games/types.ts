export interface GameStats {
  score: number;
  lives?: number; // si falta, el HUD oculta VIDAS
  level: number;
  lines?: number; // si viene, el HUD muestra LÍNEAS
}
export interface GameEngineCallbacks {
  onStats(stats: GameStats): void; // cada vez que cambia score, lives o level
  onGameOver(finalScore: number): void; // 0 vidas o llamada a end()
}
export interface GameEngine {
  start(): void; // arranca el bucle y los listeners de teclado
  pause(): void;
  resume(): void;
  restart(): void; // nueva partida: score 0, 3 vidas, nivel 1
  end(): void; // termina la partida con la puntuación actual (botón FIN)
  destroy(): void; // cancela requestAnimationFrame y quita listeners
}
export type GameEngineFactory = (
  canvas: HTMLCanvasElement,
  callbacks: GameEngineCallbacks,
) => GameEngine;
