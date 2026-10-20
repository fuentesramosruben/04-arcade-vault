import { Suspense } from "react";
import { AuthCard } from "@/components/auth/auth-card";
// AuthCard lee ?error=... con useSearchParams, que con cacheComponents
// necesita un límite <Suspense>.
export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthCard />
    </Suspense>
  );
}
