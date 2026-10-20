import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ENGINES } from "@/lib/games/registry";
import type { Database } from "@/lib/supabase/database.types";
// Con cacheComponents, notFound() dentro de /salon/[id] puede llegar tras iniciar
// el stream y la primera petición respondería 200. Aquí se decide antes de
// renderizar: solo los juegos con ranking (ids de ENGINES) tienen leaderboard.
function isUnknownRanking(pathname: string): boolean {
  const parts = pathname.split("/");
  if (parts[1] !== "salon" || parts.length !== 3) return false;
  let id = "";
  try {
    id = decodeURIComponent(parts[2]);
  } catch {
    // codificación inválida: no es un id de juego, cae en el 404
  }
  return !Object.hasOwn(ENGINES, id);
}
export async function proxy(request: NextRequest) {
  if (isUnknownRanking(request.nextUrl.pathname)) {
    // Reescribe a una ruta inexistente: se sirve la página 404 con estado 404.
    return NextResponse.rewrite(
      new URL("/_ranking-no-encontrado", request.url),
    );
  }
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;
  // Refresco de sesión (SPEC 12): los tokens renovados se escriben en la
  // petición, para que los Server Components los lean, y en la respuesta.
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  try {
    // No poner lógica entre createServerClient y getClaims: dispara el refresco.
    await supabase.auth.getClaims();
  } catch {
    // Si Supabase no responde la petición sigue sin sesión renovada.
  }
  return response;
}
export const config = {
  // Todo menos estáticos, optimización de imágenes y archivos con extensión.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|wav|ogg|css|js|map|txt|xml|woff2?)$).*)",
  ],
};
