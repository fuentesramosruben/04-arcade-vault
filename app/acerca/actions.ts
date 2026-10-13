"use server";

import { Resend } from "resend";

export interface ContactState {
  status: "idle" | "success" | "error";
  name?: string; // nombre enviado, para el saludo del éxito
  error?: "validation" | "send"; // "validation": datos inválidos; "send": falló Resend o falta configuración
  values?: { name: string; email: string; msg: string }; // se devuelve en error para no perder lo escrito
}

const MAX_NAME = 60;
const MAX_EMAIL = 120;
const MAX_MSG = 2000;
const DEFAULT_FROM = "Arcade Vault <onboarding@resend.dev>";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function sendContact(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const name = field(formData, "name").trim();
  const email = field(formData, "email").trim();
  const msg = field(formData, "msg").trim();
  const values = { name, email, msg };

  // Honeypot: un humano no ve este campo. Se responde éxito para no dar pistas al bot.
  if (field(formData, "company") !== "") {
    return { status: "success", name };
  }

  const valid =
    name.length > 0 &&
    name.length <= MAX_NAME &&
    email.length > 0 &&
    email.length <= MAX_EMAIL &&
    EMAIL_RE.test(email) &&
    msg.length > 0 &&
    msg.length <= MAX_MSG;
  if (!valid) {
    return { status: "error", error: "validation", values };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !to) {
    return { status: "error", error: "send", values };
  }
  const from = process.env.CONTACT_FROM_EMAIL || DEFAULT_FROM;

  // El asunto no admite saltos de línea: se normaliza el nombre.
  const subjectName = name.replace(/\s+/g, " ");

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: email,
      subject: `Contacto Arcade Vault — ${subjectName}`,
      text: `Nombre: ${subjectName}\nCorreo: ${email}\n\n${msg}`,
    });
    if (error) {
      // Solo el tipo de error de la API; nunca el contenido del mensaje.
      console.error("[contacto] Resend rechazó el envío:", error.name);
      return { status: "error", error: "send", values };
    }
  } catch {
    console.error("[contacto] Fallo inesperado al enviar con Resend");
    return { status: "error", error: "send", values };
  }

  return { status: "success", name };
}
