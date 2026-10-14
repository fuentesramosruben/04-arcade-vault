"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GameCanvas, type GameCanvasHandle } from "@/components/game-canvas";
import { useSession } from "@/components/session-provider";
import type { Game } from "@/lib/games";
import { ENGINES } from "@/lib/games/registry";
import type { GameStats } from "@/lib/games/types";
import { createClient } from "@/lib/supabase/client";
const LIVES = 3;
const MIN_NAME = 3;
const MAX_NAME = 12;
const SCORES_KEY = "av_scores";
const INITIAL_STATS: GameStats = { score: 0, lives: LIVES, level: 1 };
// Leyenda de teclas bajo el marco CRT, por juego con motor
const CONTROLS: Record<string, { keys: string[]; label: string }[]> = {
  asteroides: [
    { keys: ["←", "→"], label: "girar" },
    { keys: ["↑"], label: "propulsar" },
    { keys: ["ESPACIO"], label: "disparar" },
    { keys: ["P"], label: "pausa" },
  ],
};
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
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const name = editedName ?? user?.name ?? "INVITADO";
  // Con motor el nombre se normaliza como exige el CHECK de la tabla scores
  const cleanName = name.trim().toUpperCase().slice(0, MAX_NAME).trim();
  const canSave =
    !hasEngine || (cleanName.length >= MIN_NAME && stats.score >= 1);
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
    setSaving(false);
    setSaveError(false);
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
  const handleSave = async () => {
    if (!hasEngine) {
      saveScore({ game: game.id, score, name });
      setSaved(true);
      return;
    }
    if (!canSave || saving) return;
    setSaving(true);
    setSaveError(false);
    let failed = false;
    try {
      const { error } = await createClient()
        .from("scores")
        .insert({ game_id: game.id, player_name: cleanName, score });
      failed = error !== null;
    } catch {
      failed = true;
    }
    setSaving(false);
    if (failed) setSaveError(true);
    else setSaved(true);
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
      {CONTROLS[game.id] && (
        <ul
          className="mono m-0 flex list-none flex-wrap justify-center gap-x-6 gap-y-3 p-0"
          style={{ marginTop: 22 }}
          aria-label="Controles"
        >
          {CONTROLS[game.id].map(({ keys, label }) => (
            <li key={label} className="flex items-center gap-2">
              <span className="flex gap-1">
                {keys.map((k) => (
                  <kbd
                    key={k}
                    className="border-line bg-bg-3 text-cyan inline-flex min-w-7 items-center justify-center rounded-sm border border-b-2 px-2 py-1 text-[11px] leading-none tracking-widest"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
              <span className="text-ink-dim text-[11px] tracking-widest">
                {label}
              </span>
            </li>
          ))}
        </ul>
      )}
      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <>
                <div className="input-row">
                  <input
                    value={name}
                    onChange={(e) =>
                      setEditedName(
                        e.target.value
                          .toUpperCase()
                          .slice(0, hasEngine ? MAX_NAME : 10),
                      )
                    }
                    placeholder="TUS INICIALES"
                  />
                  <button
                    className="btn yellow"
                    onClick={handleSave}
                    disabled={!canSave || saving}
                  >
                    {saving
                      ? "GUARDANDO…"
                      : saveError
                        ? "REINTENTAR"
                        : "GUARDAR PUNTUACIÓN"}
                  </button>
                </div>
                {hasEngine && saveError && (
                  <div
                    className="mono"
                    role="alert"
                    style={{
                      marginTop: 10,
                      fontSize: 11,
                      letterSpacing: "0.1em",
                      color: "var(--magenta)",
                    }}
                  >
                    ▸ NO SE PUDO GUARDAR. COMPRUEBA LA CONEXIÓN E INTÉNTALO DE
                    NUEVO.
                  </div>
                )}
                {hasEngine && !canSave && (
                  <div
                    className="mono"
                    style={{
                      marginTop: 10,
                      fontSize: 11,
                      letterSpacing: "0.1em",
                      color: "var(--ink-faint)",
                    }}
                  >
                    {stats.score < 1
                      ? "▸ NECESITAS AL MENOS 1 PUNTO PARA GUARDAR"
                      : `▸ EL NOMBRE NECESITA AL MENOS ${MIN_NAME} CARACTERES`}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
                {hasEngine && (
                  <Link
                    href={`/salon/${game.id}`}
                    className="btn"
                    style={{ marginTop: 12 }}
                  >
                    VER RANKING
                  </Link>
                )}
              </>
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
