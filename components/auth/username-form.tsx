"use client";
import { useActionState } from "react";
import { setUsername, type AuthState } from "@/app/auth/actions";
const INITIAL: AuthState = { status: "idle" };
export function UsernameForm() {
  const [state, action, pending] = useActionState(setUsername, INITIAL);
  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">ELIGE TU NOMBRE</h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            ASÍ APARECERÁS EN EL SALÓN DE LA FAMA
          </div>
        </div>
        <form action={action} noValidate>
          <div className="field">
            <label htmlFor="auth-username">Nombre arcade</label>
            <input
              id="auth-username"
              name="username"
              autoComplete="username"
              autoCapitalize="characters"
              spellCheck={false}
              defaultValue={state.values?.username}
              aria-invalid={state.status === "error" || undefined}
              placeholder="px_kai"
            />
          </div>
          <p className="auth-hint">
            De 3 a 12 caracteres: letras, números, guion y guion bajo. No se
            puede cambiar después.
          </p>
          {state.status === "error" && state.error && (
            <div className="term-error" role="alert">
              <span className="prompt">[ERROR]</span> {state.error}
            </div>
          )}
          <button
            className="btn lg"
            type="submit"
            style={{ width: "100%", marginTop: 8 }}
            disabled={pending}
          >
            {pending ? "GUARDANDO…" : "GUARDAR NOMBRE"}
          </button>
        </form>
      </div>
    </div>
  );
}
