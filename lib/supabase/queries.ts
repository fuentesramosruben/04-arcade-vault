import { createClient } from "@/lib/supabase/server";
// Lecturas con el cliente de servidor: usan cookies(), así que solo deben
// llamarse dentro de <Suspense> (cacheComponents). Lanzan si Supabase falla;
// la página que las llama decide cómo mostrar el estado de error.
export interface LeaderboardRow {
  rank: number;
  name: string;
  score: number;
  date: string; // "DD/MM/YYYY", mismo formato que ScoreRow
}
export interface GlobalRow extends LeaderboardRow {
  gamesPlayed: number;
}
export interface GameStats {
  gameId: string;
  best: number;
  plays: number;
}
const TOP = 50;
// UTC para que servidor y cliente formateen igual la misma fecha.
function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const mon = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${mon}/${d.getUTCFullYear()}`;
}
// Top 50 de un juego: score desc, created_at asc.
export async function getGameLeaderboard(
  gameId: string,
): Promise<LeaderboardRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("player_name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(TOP);
  if (error) throw new Error(`No se pudo leer el ranking: ${error.message}`);
  return data.map((r, i) => ({
    rank: i + 1,
    name: r.player_name,
    score: r.score,
    date: formatDate(r.created_at),
  }));
}
// Top 50 global: total_score desc, last_at asc.
export async function getGlobalLeaderboard(): Promise<GlobalRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("global_leaderboard")
    .select("player_name, total_score, games_played, last_at")
    .order("total_score", { ascending: false })
    .order("last_at", { ascending: true })
    .limit(TOP);
  if (error) {
    throw new Error(`No se pudo leer el ranking global: ${error.message}`);
  }
  return data.map((r, i) => ({
    rank: i + 1,
    name: r.player_name ?? "",
    score: Number(r.total_score ?? 0),
    date: r.last_at ? formatDate(r.last_at) : "",
    gamesPlayed: Number(r.games_played ?? 0),
  }));
}
// best y plays de todos los juegos (0 y 0 si no hay partidas).
export async function getGameStats(): Promise<GameStats[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("game_stats")
    .select("game_id, best, plays");
  if (error) {
    throw new Error(`No se pudieron leer las estadísticas: ${error.message}`);
  }
  return data.flatMap((r) =>
    r.game_id
      ? [{ gameId: r.game_id, best: r.best ?? 0, plays: r.plays ?? 0 }]
      : [],
  );
}
