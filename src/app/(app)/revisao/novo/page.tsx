"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { RevisaoProvider } from "@/components/revisao/RevisaoProvider";
import { QuickCaptureForm } from "@/components/revisao/QuickCaptureForm";

function NovoContent() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
        <Link
          href="/revisao"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color-mix(in_srgb,var(--ink)_60%,transparent)] hover:text-[var(--ink)]"
        >
          <ArrowLeft size={16} />
          Voltar para Revisão
        </Link>
        <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--signal)]">
          <Sparkles size={12} />
          Modo Bateria
        </span>
      </div>

      <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)]">
        <div className="mb-4">
          <h1 className="text-base font-bold text-[var(--ink)]">
            Captura Rápida de Erro
          </h1>
          <p className="text-xs text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
            Preencha os campos essenciais em menos de 20 segundos.
          </p>
        </div>

        <QuickCaptureForm
          onSuccess={() => {
            router.push("/revisao");
          }}
        />
      </div>
    </div>
  );
}

export default function NovoQuestaoPage() {
  return (
    <RevisaoProvider>
      <NovoContent />
    </RevisaoProvider>
  );
}
