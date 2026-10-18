import { notFound } from "next/navigation";
import { GamePlayer } from "@/components/game-player";
import { GAMES } from "@/lib/games";
export async function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}
// La ruta bloquea a propósito: con params dentro de Suspense, un id inexistente
// respondería 200 en lugar de 404 por el streaming de cacheComponents.
export const instant = false;
export default async function PlayPage({
  params,
}: PageProps<"/juegos/[id]/jugar">) {
  const { id } = await params;
  const game = GAMES.find((g) => g.id === id);
  if (!game) notFound();
  return <GamePlayer game={game} />;
}
