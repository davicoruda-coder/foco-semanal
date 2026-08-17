"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginScreen } from "@/components/LoginScreen";
import { useApp } from "@/components/AppProvider";
import { safeNextPath } from "@/lib/safe-path";

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
      Carregando…
    </div>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, ready } = useApp();
  const next = safeNextPath(searchParams.get("next"));

  useEffect(() => {
    if (ready && user) router.replace(next);
  }, [ready, user, next, router]);

  if (!ready || user) return <LoginFallback />;
  return <LoginScreen />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageInner />
    </Suspense>
  );
}
