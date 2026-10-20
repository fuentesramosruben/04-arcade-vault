"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isPasswordPwned } from "@/lib/auth/pwned";
import {
  normalizeUsername,
  validateEmail,
  validatePassword,
  validateUsername,
} from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";
export interface AuthState {
  status: "idle" | "success" | "error";
  error?: string; // mensaje en español, listo para mostrar
  field?: "username" | "email" | "password"; // campo al que apunta el error, si aplica
  values?: { username: string; email: string }; // se devuelve en error para no perder lo escrito (nunca la contraseña)
}
const USERNAME_TAKEN = "Ese usuario ya está en uso. Elige otro.";
function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
async function isUsernameTaken(
  supabase: Awaited<ReturnType<typeof createClient>>,
  username: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}
async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const username = normalizeUsername(field(formData, "username"));
  const email = field(formData, "email").trim();
  const password = field(formData, "password");
  const values = { username, email };
  const usernameError = validateUsername(username);
  if (usernameError) {
    return { status: "error", error: usernameError, field: "username", values };
  }
  const emailError = validateEmail(email);
  if (emailError) {
    return { status: "error", error: emailError, field: "email", values };
  }
  const passwordError = validatePassword(password);
  if (passwordError) {
    return { status: "error", error: passwordError, field: "password", values };
  }
  if (await isPasswordPwned(password)) {
    return {
      status: "error",
      error: "Esa contraseña aparece en filtraciones conocidas. Elige otra.",
      field: "password",
      values,
    };
  }
  const supabase = await createClient();
  try {
    if (await isUsernameTaken(supabase, username)) {
      return {
        status: "error",
        error: USERNAME_TAKEN,
        field: "username",
        values,
      };
    }
  } catch {
    return {
      status: "error",
      error: "No se pudo crear la cuenta. Inténtalo de nuevo.",
      values,
    };
  }
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
      emailRedirectTo: `${await siteOrigin()}/auth/callback`,
    },
  });
  if (error) {
    // Con la política de contraseñas de Supabase el mensaje es útil; el resto
    // (incluida la carrera por el nombre, que hace fallar el trigger) es genérico.
    const message =
      error.code === "weak_password"
        ? "La contraseña es demasiado débil. Prueba con otra."
        : "No se pudo crear la cuenta. Revisa los datos e inténtalo de nuevo.";
    return {
      status: "error",
      error: message,
      field: error.code === "weak_password" ? "password" : undefined,
      values,
    };
  }
  // Con confirmación de correo obligatoria no hay sesión tras signUp.
  return { status: "success", values };
}
export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = field(formData, "email").trim();
  const password = field(formData, "password");
  const values = { username: "", email };
  if (validateEmail(email) || password.length === 0) {
    return {
      status: "error",
      error: "Introduce tu correo y tu contraseña.",
      values,
    };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Supabase solo devuelve email_not_confirmed con la contraseña correcta,
    // así que este mensaje no revela si el correo existe.
    const message =
      error.code === "email_not_confirmed"
        ? "Confirma tu correo antes de entrar: revisa tu bandeja de entrada."
        : "Correo o contraseña incorrectos.";
    return { status: "error", error: message, values };
  }
  redirect("/");
}
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
// Paso intermedio tras OAuth: la cuenta existe pero aún no tiene perfil.
export async function setUsername(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const username = normalizeUsername(field(formData, "username"));
  const values = { username, email: "" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const usernameError = validateUsername(username);
  if (usernameError) {
    return { status: "error", error: usernameError, field: "username", values };
  }
  const { error } = await supabase
    .from("profiles")
    .insert({ id: user.id, username });
  if (error) {
    if (error.code === "23505") {
      // Unicidad del nombre (o perfil ya existente para este usuario).
      const { data: own } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      if (own) redirect("/");
      return {
        status: "error",
        error: USERNAME_TAKEN,
        field: "username",
        values,
      };
    }
    return {
      status: "error",
      error: "No se pudo guardar el nombre. Inténtalo de nuevo.",
      values,
    };
  }
  redirect("/");
}
