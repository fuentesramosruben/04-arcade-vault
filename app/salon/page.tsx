import { Suspense } from "react";
import Link from "next/link";
import { Leaderboard } from "@/components/leaderboard";
import { SalonTabs } from "@/components/salon-tabs";
import { getGlobalLeaderboard, type GlobalRow } from "@/lib/supabase/queries";
const TITLE = "RANKING GLOBAL";
async function GlobalBoard() {
  let rows: GlobalRow[] = [];
  let error = false;
  try {
    rows = await getGlobalLeaderboard();
  } catch {
    error = true;
  }
  return <Leaderboard title={TITLE} rows={rows} error={error} />;
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
export default function HallOfFamePage() {
  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>
      <SalonTabs active="global" />
      <Suspense fallback={<BoardFallback />}>
        <GlobalBoard />
      </Suspense>
      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/juegos" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
