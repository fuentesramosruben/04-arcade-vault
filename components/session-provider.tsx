"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
export interface SessionUser {
  id: string;
  email: string | null;
  name: string | null; // profiles.username; null si aún no eligió nombre (OAuth)
}
interface SessionContextValue {
  user: SessionUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}
interface AuthUser {
  id: string;
  email: string | null;
}
// Clave del mock anterior a SPEC 12: ya no se usa, solo se limpia.
const LEGACY_STORAGE_KEY = "av_user";
const SessionContext = createContext<SessionContextValue | null>(null);
function toAuthUser(session: Session | null): AuthUser | null {
  return session
    ? { id: session.user.id, email: session.user.email ?? null }
    : null;
}
export function SessionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [supabase] = useState(createClient);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<{
    userId: string;
    name: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  // Nombre ya conocido, para no repetir la consulta del perfil en cada ruta.
  const knownName = useRef<string | null>(null);
  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // sin localStorage: nada que limpiar
    }
  }, []);
  // Cambios de sesión del propio cliente (otras pestañas, renovación, cierre).
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(toAuthUser(session));
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, [supabase]);
  // Las Server Actions (login, nombre) cambian las cookies sin avisar al
  // cliente: al navegar se vuelve a leer la sesión.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setAuthUser(toAuthUser(data.session));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, pathname]);
  // Perfil: se consulta al entrar y, mientras falte el nombre, en cada ruta
  // (tras /auth/nombre el perfil ya existe).
  const userId = authUser?.id ?? null;
  useEffect(() => {
    if (!userId) {
      knownName.current = null;
      return;
    }
    if (knownName.current) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        knownName.current = data?.username ?? null;
        setProfile({ userId, name: data?.username ?? null });
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, userId, pathname]);
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    knownName.current = null;
    setAuthUser(null);
    setProfile(null);
  }, [supabase]);
  const user = useMemo<SessionUser | null>(
    () =>
      authUser
        ? {
            ...authUser,
            name: profile?.userId === authUser.id ? profile.name : null,
          }
        : null,
    [authUser, profile],
  );
  const value = useMemo(
    () => ({ user, loading, signOut }),
    [user, loading, signOut],
  );
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx)
    throw new Error("useSession debe usarse dentro de <SessionProvider>");
  return ctx;
}
