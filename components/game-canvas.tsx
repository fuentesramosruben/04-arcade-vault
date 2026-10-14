"use client";
import { useEffect, useImperativeHandle, useRef } from "react";
import { ENGINES } from "@/lib/games/registry";
import type { GameEngine, GameStats } from "@/lib/games/types";
export interface GameCanvasHandle {
  end(): void;
}
interface GameCanvasProps {
  gameId: string;
  paused: boolean;
  // al cambiar, se inicia una partida nueva
  runKey: number;
  onStats(stats: GameStats): void;
  onGameOver(finalScore: number): void;
  ref?: React.Ref<GameCanvasHandle>;
}
// El canvas es de 800×600 lógicos; el CSS lo escala al marco 4:3 del CRT.
export function GameCanvas({
  gameId,
  paused,
  runKey,
  onStats,
  onGameOver,
  ref,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const callbacksRef = useRef({ onStats, onGameOver });
  const runKeyRef = useRef(runKey);
  useEffect(() => {
    callbacksRef.current = { onStats, onGameOver };
  });
  useEffect(() => {
    const canvas = canvasRef.current;
    const factory = ENGINES[gameId];
    if (!canvas || !factory) return;
    const engine = factory(canvas, {
      onStats: (stats) => callbacksRef.current.onStats(stats),
      onGameOver: (score) => callbacksRef.current.onGameOver(score),
    });
    engineRef.current = engine;
    engine.start();
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [gameId]);
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (paused) engine.pause();
    else engine.resume();
  }, [paused]);
  useEffect(() => {
    if (runKey === runKeyRef.current) return;
    runKeyRef.current = runKey;
    engineRef.current?.restart();
  }, [runKey]);
  useImperativeHandle(ref, () => ({
    end: () => engineRef.current?.end(),
  }));
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 block h-full w-full"
      aria-label="Pantalla del juego"
    />
  );
}
