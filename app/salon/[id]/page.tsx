import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Leaderboard } from "@/components/leaderboard";
import { SalonTabs } from "@/components/salon-tabs";
import { GAMES } from "@/lib/games";
import { ENGINES } from "@/lib/games/registry";
import {
  getGameLeaderboard,
  type LeaderboardRow,
} from "@/lib/supabase/queries";
// Solo los juegos con ranking (con motor) tienen leaderboard. Los ids salen del
// registro, no de una consulta a la base de datos.
export async function generateStaticParams() {
  return GAMES.filter((g) => g.id in ENGINES).map((g) => ({ id: g.id }));
}
async function GameBoard({ gameId, title }: { gameId: string; title: string }) {
  let rows: LeaderboardRow[] = [];
  let error = false;
  try {
    rows = await getGameLeaderboard(gameId);
  } catch {
    error = true;
  }
  return <Leaderboard title={title} rows={rows} error={error} />;
}
function BoardFallback() {
  return (
    <div
      className="hall-table"
      style={{ textAlign: "center", padding: "56px 16px" }}
      aria-busy="true"
    >
      <div
        className="pixel"
        style={{
          fontSize: 12,
          color: "var(--ink-faint)",
          letterSpacing: "0.12em",
        }}
      >
        CARGANDO RANKING…
      </div>
    </div>
  );
}
export default async function GameHallPage({
  params,
}: PageProps<"/salon/[id]">) {
  const { id } = await params;
  const game = GAMES.find((g) => g.id === id);
  if (!game || !(game.id in ENGINES)) notFound();
  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          MEJORES PARTIDAS · {game.title}
        </p>
      </div>
      <SalonTabs active={game.id} />
      <Suspense fallback={<BoardFallback />}>
        <GameBoard gameId={game.id} title={`Ranking de ${game.title}`} />
      </Suspense>
      <div
        style={{
          textAlign: "center",
          marginTop: 32,
          display: "flex",
          gap: 12,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <Link href={`/juegos/${game.id}/jugar`} className="btn lg">
          ▶ JUGAR {game.title}
        </Link>
        <Link href="/juegos" className="btn ghost lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
