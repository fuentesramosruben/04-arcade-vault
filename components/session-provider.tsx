"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export interface SessionUser {
  name: string;
}

interface SessionContextValue {
  user: SessionUser | null;
  login: (user: SessionUser) => void;
  signOut: () => void;
}

const STORAGE_KEY = "av_user";

const SessionContext = createContext<SessionContextValue | null>(null);

// Store externo sobre localStorage: en el servidor y en la hidratación el
// snapshot es null (sin sesión), y tras montar React lee el valor real.
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function getSnapshot(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return memoryUser;
  }
}

function getServerSnapshot(): string | null {
  return null;
}

// Respaldo si localStorage no está disponible (modo privado).
let memoryUser: string | null = null;

function write(value: string | null) {
  memoryUser = value;
  try {
    if (value === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // sin persistencia: la sesión vive solo en memoria
  }
  emit();
}

function parseUser(raw: string | null): SessionUser | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed.name === "string"
      ? { name: parsed.name }
      : null;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const user = useMemo(() => parseUser(raw), [raw]);

  const login = useCallback((u: SessionUser) => write(JSON.stringify(u)), []);
  const signOut = useCallback(() => write(null), []);

  const value = useMemo(
    () => ({ user, login, signOut }),
    [user, login, signOut],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de <SessionProvider>");
  return ctx;
}
