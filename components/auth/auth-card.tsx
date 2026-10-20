"use client";
import { useActionState, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/components/session-provider";
import { signIn, signUp, type AuthState } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/client";
const INITIAL: AuthState = { status: "idle" };
type Provider = "google" | "github";
const CALLBACK_ERROR =
  "El enlace no es válido o ha caducado. Inténtalo de nuevo.";
function ErrorBox({ message, id }: { message: string; id?: string }) {
  return (
    <div className="term-error" role="alert" id={id}>
      <span className="prompt">[ERROR]</span> {message}
    </div>
  );
}
function SignInForm() {
  const [state, action, pending] = useActionState(signIn, INITIAL);
  return (
    <form action={action} noValidate>
      <div className="field">
        <label htmlFor="auth-email">Correo electrónico</label>
        <input
          id="auth-email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state.values?.email}
          placeholder="jugador@vault.gg"
        />
      </div>
      <div className="field">
        <label htmlFor="auth-pass">Contraseña</label>
        <input
          id="auth-pass"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
        />
      </div>
      {state.status === "error" && state.error && (
        <ErrorBox message={state.error} />
      )}
      <button
        className="btn lg"
        type="submit"
        style={{ width: "100%", marginTop: 8 }}
        disabled={pending}
      >
        {pending ? "ENTRANDO…" : "ENTRAR AL VAULT"}
      </button>
    </form>
  );
}
function SignUpForm() {
  const [state, action, pending] = useActionState(signUp, INITIAL);
  if (state.status === "success") {
    return (
      <div className="auth-notice" role="status">
        <strong>Revisa tu correo</strong>
        <p>
          Te hemos enviado un enlace de confirmación
          {state.values?.email ? ` a ${state.values.email}` : ""}. Ábrelo para
          activar tu cuenta y entrar al vault.
        </p>
      </div>
    );
  }
  const invalid = (name: NonNullable<AuthState["field"]>) =>
    state.status === "error" && state.field === name;
  return (
    <form action={action} noValidate>
      <div className="field">
        <label htmlFor="auth-user">Usuario</label>
        <input
          id="auth-user"
          name="username"
          autoComplete="username"
          autoCapitalize="characters"
          spellCheck={false}
          defaultValue={state.values?.username}
          aria-invalid={invalid("username") || undefined}
          placeholder="px_kai"
        />
      </div>
      <div className="field">
        <label htmlFor="auth-email">Correo electrónico</label>
        <input
          id="auth-email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state.values?.email}
          aria-invalid={invalid("email") || undefined}
          placeholder="jugador@vault.gg"
        />
      </div>
      <div className="field">
        <label htmlFor="auth-pass">Contraseña</label>
        <input
          id="auth-pass"
          name="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={invalid("password") || undefined}
          placeholder="Mínimo 8 caracteres"
        />
      </div>
      {state.status === "error" && state.error && (
        <ErrorBox message={state.error} />
      )}
      <button
        className="btn lg"
        type="submit"
        style={{ width: "100%", marginTop: 8 }}
        disabled={pending}
      >
        {pending ? "CREANDO…" : "CREAR CUENTA"}
      </button>
    </form>
  );
}
export function AuthCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signOut } = useSession();
  const [tab, setTab] = useState<"in" | "up">("in");
  const [oauthError, setOauthError] = useState<string | null>(null);
  const callbackError = searchParams.has("error") ? CALLBACK_ERROR : null;
  const playAsGuest = async () => {
    await signOut();
    router.push("/");
  };
  const oauth = async (provider: Provider) => {
    setOauthError(null);
    const { error } = await createClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setOauthError("No se pudo iniciar sesión con ese proveedor.");
    }
  };
  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            ACCESO AL SISTEMA · v2.6
          </div>
        </div>
        <div className="auth-tabs">
          <button
            type="button"
            className={tab === "in" ? "on" : ""}
            onClick={() => setTab("in")}
          >
            INICIAR SESIÓN
          </button>
          <button
            type="button"
            className={tab === "up" ? "on" : ""}
            onClick={() => setTab("up")}
          >
            CREAR CUENTA
          </button>
        </div>
        {(callbackError || oauthError) && (
          <ErrorBox message={(oauthError ?? callbackError) as string} />
        )}
        {tab === "in" ? <SignInForm key="in" /> : <SignUpForm key="up" />}
        <button
          type="button"
          className="btn ghost"
          style={{ width: "100%", marginTop: 10 }}
          onClick={playAsGuest}
        >
          JUGAR COMO INVITADO
        </button>
        <div className="auth-divider">O CONTINÚA CON</div>
        <div className="social">
          <button
            className="btn ghost"
            type="button"
            onClick={() => oauth("google")}
          >
            ◆ GOOGLE
          </button>
          <button
            className="btn ghost"
            type="button"
            onClick={() => oauth("github")}
          >
            ▣ GITHUB
          </button>
        </div>
        <div
          style={{
            marginTop: 18,
            textAlign: "center",
            fontSize: 11,
            color: "var(--ink-faint)",
            letterSpacing: "0.1em",
          }}
        >
          AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
        </div>
      </div>
    </div>
  );
}
