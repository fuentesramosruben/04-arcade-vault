import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GAMES } from "@/lib/games";
import { formatCompact } from "@/lib/format";
import { ENGINES } from "@/lib/games/registry";
import { seededScores } from "@/lib/scores";
import {
  getGameLeaderboard,
  getGameStats,
  type LeaderboardRow,
} from "@/lib/supabase/queries";
const SIDE_TOP = 10;
function Rows({ rows }: { rows: LeaderboardRow[] }) {
  return rows.map((r, i) => (
    <div
      key={r.name + r.rank}
      className={
        "lb-row" +
        (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")
      }
    >
      <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
      <div className="pl">
        {r.name}
        <div
          style={{
            fontSize: 10,
            color: "var(--ink-faint)",
            letterSpacing: "0.1em",
          }}
        >
          {r.date}
        </div>
      </div>
      <div className="sc">{r.score.toLocaleString("es-ES")}</div>
    </div>
  ));
}
function SideNotice({ children }: { children: string }) {
  return (
    <div
      className="pixel"
      style={{
        padding: "24px 8px",
        textAlign: "center",
        fontSize: 10,
        color: "var(--ink-faint)",
        letterSpacing: "0.12em",
      }}
    >
      {children}
    </div>
  );
}
// Juegos con motor: las mismas marcas que /salon/[id] (Top 10).
async function RealRows({ gameId }: { gameId: string }) {
  let rows: LeaderboardRow[];
  try {
    rows = (await getGameLeaderboard(gameId)).slice(0, SIDE_TOP);
  } catch {
    return <SideNotice>NO SE PUDO CARGAR EL RANKING</SideNotice>;
  }
  if (rows.length === 0) {
    return <SideNotice>SIN PUNTUACIONES TODAVÍA</SideNotice>;
  }
  return <Rows rows={rows} />;
}
function StatCells({ plays, best }: { plays: string; best: string }) {
  return (
    <>
      <div>
        <div className="l">Partidas</div>
        <div className="v">{plays}</div>
      </div>
      <div>
        <div className="l">Mejor global</div>
        <div
          className="v"
          style={{
            color: "var(--magenta)",
            textShadow: "0 0 6px rgba(255,0,110,0.5)",
          }}
        >
          {best}
        </div>
      </div>
    </>
  );
}
async function GameStatCells({ gameId }: { gameId: string }) {
  let plays = "—";
  let best = "—";
  try {
    const stats = (await getGameStats()).find((s) => s.gameId === gameId);
    plays = formatCompact(stats?.plays ?? 0);
    best = (stats?.best ?? 0).toLocaleString("es-ES");
  } catch {
    // Sin estadísticas la ficha sigue funcionando; se muestran "—".
  }
  return <StatCells plays={plays} best={best} />;
}
export async function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}
export default async function GameDetailPage({
  params,
}: PageProps<"/juegos/[id]">) {
  const { id } = await params;
  const game = GAMES.find((g) => g.id === id);
  if (!game) notFound();
  return (
    <div className="av-detail fade-in">
      <div>
        <div className="detail-cover">
          <div className={"cover-bg " + game.cover}></div>
        </div>
        <div style={{ marginTop: 20 }} className="detail-info">
          <div className="detail-tags">
            <span>{game.cat}</span>
            <span>1 JUGADOR</span>
            <span>TECLADO / TÁCTIL</span>
            <span>RETRO 1985</span>
          </div>
          <h2 className="neon-cyan">{game.title}</h2>
          <p>{game.long}</p>
          <div className="stat-strip">
            <Suspense fallback={<StatCells plays="—" best="—" />}>
              <GameStatCells gameId={game.id} />
            </Suspense>
            <div>
              <div className="l">Dificultad</div>
              <div
                className="v"
                style={{
                  color: "var(--yellow)",
                  textShadow: "0 0 6px rgba(245,255,0,0.5)",
                }}
              >
                ★ ★ ★ ☆ ☆
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <Link href={`/juegos/${game.id}/jugar`} className="btn xl pulse">
              ▶ JUGAR AHORA
            </Link>
            <Link href="/juegos" className="btn ghost lg">
              VOLVER AL VAULT
            </Link>
          </div>
        </div>
      </div>
      <aside>
        <div className="leaderboard">
          <h3>MEJORES PUNTUACIONES</h3>
          {game.id in ENGINES ? (
            <Suspense fallback={<SideNotice>CARGANDO…</SideNotice>}>
              <RealRows gameId={game.id} />
            </Suspense>
          ) : (
            <Rows rows={seededScores(id.length * 17 + 3, 10)} />
          )}
        </div>
      </aside>
    </div>
  );
}
