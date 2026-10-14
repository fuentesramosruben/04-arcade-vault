import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";
export function createClient() {
  // Next.js solo sustituye referencias literales a process.env.NEXT_PUBLIC_*
  // en el bundle del navegador, así que no se pueden leer con una clave dinámica.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url) {
    throw new Error(
      "Falta la variable de entorno NEXT_PUBLIC_SUPABASE_URL. Revisa .env.local (ver .env.example).",
    );
  }
  if (!key) {
    throw new Error(
      "Falta la variable de entorno NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Revisa .env.local (ver .env.example).",
    );
  }
  return createBrowserClient<Database>(url, key);
}
