import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
// Destino del enlace del correo de confirmación y del retorno de OAuth.
// Intercambia el `code` por una sesión (cookies) y decide a dónde seguir.
export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const fail = () => NextResponse.redirect(`${origin}/auth?error=callback`);
  // Supabase devuelve ?error=... si el usuario cancela o el enlace caducó.
  if (!code || searchParams.has("error")) return fail();
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail();
  // Una cuenta nueva de OAuth aún no tiene perfil: debe elegir nombre arcade.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  return NextResponse.redirect(`${origin}${profile ? "/" : "/auth/nombre"}`);
}
