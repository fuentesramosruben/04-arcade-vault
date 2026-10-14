import { Suspense } from "react";
import { Library } from "@/components/library";
import { getGameStats, type GameStats } from "@/lib/supabase/queries";
async function LibraryWithStats() {
  let stats: Record<string, GameStats> | null = null;
  try {
    const rows = await getGameStats();
    stats = Object.fromEntries(rows.map((r) => [r.gameId, r]));
  } catch {
    // Sin estadísticas el catálogo sigue funcionando; las tarjetas muestran "—".
  }
  return <Library stats={stats} />;
}
export default function JuegosPage() {
  return (
    <Suspense fallback={<Library stats={null} />}>
      <LibraryWithStats />
    </Suspense>
  );
}
