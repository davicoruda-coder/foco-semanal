"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Entrada principal é /hoje. Mantida por compatibilidade de links antigos. */
export default function LoginPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/hoje");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
      Carregando…
    </div>
  );
}
