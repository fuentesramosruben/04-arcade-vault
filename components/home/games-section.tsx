import Link from "next/link";
import { MiniCard } from "@/components/home/mini-card";
import { Reveal } from "@/components/home/reveal";
import { GAMES } from "@/lib/games";

export function GamesSection() {
  return (
    <Reveal className="home-section">
      <div className="section-head">
        <div className="kicker pixel neon-cyan">{"// 02"}</div>
        <h2 className="section-title">JUEGOS DISPONIBLES AHORA</h2>
        <div className="section-rule"></div>
      </div>
      <div className="mini-rail">
        {GAMES.slice(0, 6).map((g) => (
          <MiniCard key={g.id} game={g} />
        ))}
      </div>
      <div style={{ textAlign: "center", marginTop: 24 }}>
        <Link href="/juegos" className="btn lg">
          VER TODOS LOS JUEGOS →
        </Link>
      </div>
    </Reveal>
  );
}
