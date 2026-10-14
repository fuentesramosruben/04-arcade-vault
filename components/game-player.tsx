"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GameCanvas, type GameCanvasHandle } from "@/components/game-canvas";
import { useSession } from "@/components/session-provider";
import type { Game } from "@/lib/games";
import { ENGINES } from "@/lib/games/registry";
import type { GameStats } from "@/lib/games/types";

const LIVES = 3;
const SCORES_KEY = "av_scores";
const INITIAL_STATS: GameStats = { score: 0, lives: LIVES, level: 1 };

interface SavedScore {
  game: string;
  score: number;
  name: string;
  at: number;
}

function saveScore(entry: Omit<SavedScore, "at">) {
  try {
    const all: SavedScore[] = JSON.parse(
      localStorage.getItem(SCORES_KEY) || "[]",
    );
    all.push({ ...entry, at: Date.now() });
    localStorage.setItem(SCORES_KEY, JSON.stringify(all));
  } catch {
    // sin persistencia (modo privado o datos corruptos)
  }
}

export function GamePlayer({ game }: { game: Game }) {
  const { user } = useSession();
  const hasEngine = game.id in ENGINES;
  const canvasRef = useRef<GameCanvasHandle>(null);
  const [stats, setStats] = useState<GameStats>(INITIAL_STATS);
  const [runKey, setRunKey] = useState(0);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [editedName, setEditedName] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const name = editedName ?? user?.name ?? "INVITADO";
  const { score, lives } = stats;
  // Con motor el nivel viene del juego; sin motor se calcula por puntuación
  const level = hasEngine ? stats.level : 1 + Math.floor(score / 2500);

  // Camino mock: puntuación simulada
  useEffect(() => {
    if (hasEngine || over || paused) return;
    const t = setInterval(
      () =>
        setStats((s) => ({
          ...s,
          score: s.score + Math.floor(10 + Math.random() * 90),
        })),
      220,
    );
    return () => clearInterval(t);
  }, [hasEngine, over, paused]);

  // P y Esc alternan la pausa (solo con motor)
  useEffect(() => {
    if (!hasEngine || over) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyP" && e.code !== "Escape") return;
      if (e.repeat) return;
      const t = e.target;
      if (t instanceof HTMLElement && t.closest("input, textarea")) return;
      setPaused((p) => !p);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasEngine, over]);

  const restart = () => {
    setStats(INITIAL_STATS);
    setPaused(false);
    setOver(false);
    setSaved(false);
    setRunKey((k) => k + 1);
  };

  const handleGameOver = (finalScore: number) => {
    setStats((s) => ({ ...s, score: finalScore }));
    setPaused(false);
    setOver(true);
  };

  // Se quita el foco al pulsar un botón: si no, Espacio lo reactivaría mientras se juega
  const togglePause = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    setPaused((p) => !p);
  };

  const handleEnd = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    if (hasEngine) canvasRef.current?.end();
    else setOver(true);
  };

  const handleSave = () => {
    saveScore({ game: game.id, score, name });
    setSaved(true);
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={togglePause}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={handleEnd}>
            FIN
          </button>
          <Link href={`/juegos/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {hasEngine ? (
            <GameCanvas
              ref={canvasRef}
              gameId={game.id}
              paused={paused}
              runKey={runKey}
              onStats={setStats}
              onGameOver={handleGameOver}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) =>
                    setEditedName(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="TUS INICIALES"
                />
                <button className="btn yellow" onClick={handleSave}>
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/juegos" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
