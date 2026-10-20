import { Suspense } from "react";
import { redirect } from "next/navigation";
import { UsernameForm } from "@/components/auth/username-form";
import { createClient } from "@/lib/supabase/server";
// Paso intermedio tras OAuth: solo para cuentas con sesión y sin perfil.
async function NombreGate() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (profile) redirect("/");
  return <UsernameForm />;
}
export default function NombrePage() {
  return (
    <Suspense fallback={null}>
      <NombreGate />
    </Suspense>
  );
}
