"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

function BackToHojeInner({ always }: { always?: boolean }) {
  const params = useSearchParams();
  if (!always && params.get("from") !== "hoje") return null;

  return (
    <Link
      href="/hoje"
      className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-[color-mix(in_srgb,var(--ink)_60%,transparent)] transition hover:text-[var(--signal)]"
    >
      <ArrowLeft size={16} strokeWidth={2} />
      Voltar
    </Link>
  );
}

/** Voltar para Hoje — só no atalho da tela principal (`?from=hoje`), ou sempre. */
export function BackToHoje({ always = false }: { always?: boolean }) {
  return (
    <Suspense fallback={null}>
      <BackToHojeInner always={always} />
    </Suspense>
  );
}
