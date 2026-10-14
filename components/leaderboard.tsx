import type { GlobalRow, LeaderboardRow } from "@/lib/supabase/queries";
type Row = LeaderboardRow | GlobalRow;
const fmt = (n: number) => n.toLocaleString("es-ES");
function hasGames(row: Row): row is GlobalRow {
  return "gamesPlayed" in row;
}
function Notice({
  tone,
  children,
}: {
  tone: "empty" | "error";
  children: string;
}) {
  return (
    <div
      className="hall-table"
      style={{ textAlign: "center", padding: "56px 16px" }}
      role={tone === "error" ? "alert" : undefined}
    >
      <div
        className="pixel"
        style={{
          fontSize: 12,
          color: tone === "error" ? "var(--magenta)" : "var(--ink-faint)",
          letterSpacing: "0.12em",
        }}
      >
        {children}
      </div>
    </div>
  );
}
// Podio + tabla de un ranking. Sin hooks: sirve tanto para /salon como para /salon/[id].
export function Leaderboard({
  title,
  rows,
  error = false,
}: {
  title: string;
  rows: Row[];
  error?: boolean;
}) {
  if (error) {
    return (
      <section aria-label={title}>
        <Notice tone="error">
          NO SE PUDO CARGAR EL RANKING. INTÉNTALO DE NUEVO MÁS TARDE.
        </Notice>
      </section>
    );
  }
  if (rows.length === 0) {
    return (
      <section aria-label={title}>
        <Notice tone="empty">SIN PUNTUACIONES TODAVÍA</Notice>
      </section>
    );
  }
  const [first, second, third] = rows;
  const withGames = hasGames(first);
  return (
    <section aria-label={title}>
      <div className="podium">
        {second && (
          <div className="podium-slot silver">
            <div className="rank-num">02</div>
            <div className="name">{second.name}</div>
            <div className="score">{fmt(second.score)}</div>
            <div className="date">{second.date}</div>
          </div>
        )}
        <div className="podium-slot gold">
          <div
            className="pixel"
            style={{
              fontSize: 9,
              color: "var(--gold)",
              letterSpacing: "0.18em",
            }}
          >
            CAMPEÓN
          </div>
          <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>
            01
          </div>
          <div className="name">{first.name}</div>
          <div className="score" style={{ fontSize: 20 }}>
            {fmt(first.score)}
          </div>
          <div className="date">{first.date}</div>
        </div>
        {third && (
          <div className="podium-slot bronze">
            <div className="rank-num">03</div>
            <div className="name">{third.name}</div>
            <div className="score">{fmt(third.score)}</div>
            <div className="date">{third.date}</div>
          </div>
        )}
      </div>
      <div className={"hall-table" + (withGames ? " with-games" : "")}>
        <div className="th">
          <div>RANGO</div>
          <div>JUGADOR</div>
          {withGames && <div>JUEGOS</div>}
          <div>PUNTUACIÓN</div>
          <div>FECHA</div>
        </div>
        {rows.map((r, i) => (
          <div
            key={r.name + r.rank}
            className={
              "tr" +
              (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")
            }
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
            <div className="pl">{r.name}</div>
            {withGames && (
              <div className="gp">{hasGames(r) ? r.gamesPlayed : ""}</div>
            )}
            <div className="sc">{fmt(r.score)}</div>
            <div className="dt">{r.date}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
