import { NextResponse, type NextRequest } from "next/server";
import { ENGINES } from "@/lib/games/registry";
// Con cacheComponents, notFound() dentro de /salon/[id] puede llegar tras iniciar
// el stream y la primera petición respondería 200. Aquí se decide antes de
// renderizar: solo los juegos con ranking (ids de ENGINES) tienen leaderboard.
export function proxy(request: NextRequest) {
  const raw = request.nextUrl.pathname.split("/")[2] ?? "";
  let id = "";
  try {
    id = decodeURIComponent(raw);
  } catch {
    // codificación inválida: no es un id de juego, cae en el 404
  }
  if (Object.hasOwn(ENGINES, id)) return NextResponse.next();
  // Reescribe a una ruta inexistente: se sirve la página 404 con estado 404.
  return NextResponse.rewrite(new URL("/_ranking-no-encontrado", request.url));
}
export const config = {
  matcher: "/salon/:id",
};
