"use client";

import {
  startTransition,
  useActionState,
  useState,
  type FormEvent,
} from "react";
import { sendContact, type ContactState } from "@/app/acerca/actions";

const INITIAL: ContactState = { status: "idle" };

const ERROR_COPY = {
  validation: "DATOS NO VÁLIDOS. REVISA NOMBRE, CORREO Y MENSAJE.",
  send: "NO SE PUDO ENVIAR EL MENSAJE. INTÉNTALO DE NUEVO EN UNOS MINUTOS.",
} as const;

export function ContactForm() {
  const [state, formAction, pending] = useActionState(sendContact, INITIAL);
  const [shake, setShake] = useState(false);
  // Éxito ya "cerrado" con ENVIAR OTRO MENSAJE: se compara por referencia al estado.
  const [dismissed, setDismissed] = useState<ContactState | null>(null);

  const showSuccess = state.status === "success" && state !== dismissed;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const data = new FormData(e.currentTarget);
    // Validación ligera solo para el shake; la real vive en el servidor.
    const empty = ["name", "email", "msg"].some(
      (k) => String(data.get(k) ?? "").trim() === "",
    );
    if (empty) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    startTransition(() => formAction(data));
  }

  if (showSuccess) {
    return (
      <div className="contact-form">
        <div className="terminal-success">
          <div className="term-bar">
            <span className="dot r"></span>
            <span className="dot y"></span>
            <span className="dot g"></span>
            <span className="term-title">VAULT-OS // TERMINAL</span>
          </div>
          <div className="term-body" role="status">
            <div className="line">
              <span className="prompt">vault@arcade:~$</span> ./send_message
              --to=team
            </div>
            <div className="line dim">[OK] Conectando con servidor…</div>
            <div className="line dim">[OK] Validando contenido…</div>
            <div className="line dim">[OK] Transmitiendo paquete…</div>
            <div className="line success">
              &gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS,{" "}
              {(state.name ?? "").toUpperCase()}.
              <span className="caret">_</span>
            </div>
            <div style={{ marginTop: 18 }}>
              <button
                className="btn ghost"
                type="button"
                onClick={() => setDismissed(state)}
              >
                ENVIAR OTRO MENSAJE
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const values = state.values;

  return (
    <form
      className={"contact-form" + (shake ? " shake" : "")}
      onSubmit={onSubmit}
      noValidate
    >
      <div className="field">
        <label htmlFor="name">NOMBRE</label>
        <input
          id="name"
          name="name"
          placeholder="px_kai"
          maxLength={60}
          autoComplete="nickname"
          defaultValue={values?.name}
        />
      </div>
      <div className="field">
        <label htmlFor="email">CORREO ELECTRÓNICO</label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="jugador@vault.gg"
          maxLength={120}
          autoComplete="email"
          defaultValue={values?.email}
        />
      </div>
      <div className="field">
        <label htmlFor="msg">MENSAJE</label>
        <textarea
          id="msg"
          name="msg"
          rows={5}
          placeholder="Cuéntanos qué tienes en mente…"
          maxLength={2000}
          defaultValue={values?.msg}
        ></textarea>
      </div>

      {/* Honeypot: oculto a personas y a lectores de pantalla; los bots suelen rellenarlo. */}
      <div className="hp-field" aria-hidden="true">
        <label htmlFor="company">Empresa</label>
        <input
          id="company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {state.status === "error" && state.error && (
        <div className="term-error" role="alert">
          <span className="prompt">[ERROR]</span> {ERROR_COPY[state.error]}
        </div>
      )}

      <button
        className="btn xl press"
        type="submit"
        style={{ width: "100%" }}
        disabled={pending}
      >
        {pending ? "ENVIANDO…" : "▶ ENVIAR MENSAJE"}
      </button>
    </form>
  );
}
