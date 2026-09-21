import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { BrandIcon } from "@/components/BrandIcon";

export const metadata = {
  title: "Termos de Uso — FocoHub",
  description:
    "Termos e condições de uso da plataforma e aplicativo FocoHub.",
};

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] antialiased transition-colors">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Top bar de navegação */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/hoje"
            className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-[color-mix(in_srgb,var(--ink)_75%,transparent)] transition hover:bg-[var(--surface)] hover:text-[var(--ink)]"
          >
            <ArrowLeft size={16} />
            <span>Voltar ao FocoHub</span>
          </Link>
          <div className="flex items-center gap-2">
            <BrandIcon size={24} />
            <span className="font-display text-sm font-semibold tracking-tight">
              FocoHub
            </span>
          </div>
        </div>

        {/* Artigo / Conteúdo Legal */}
        <article className="surface rounded-[var(--radius)] border border-[var(--line)] p-6 shadow-[var(--shadow-sm)] sm:p-10">
          <header className="mb-8 border-b border-[var(--line)] pb-6">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--signal-soft)] px-3 py-1 text-xs font-semibold text-[var(--signal)]">
              <FileText size={14} />
              <span>Contrato de Utilização</span>
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Termos de Uso
            </h1>
            <p className="mt-2 text-xs text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
              Última atualização: 21 de setembro de 2026 · Válida para Web e Aplicativo
            </p>
          </header>

          <div className="space-y-6 text-sm leading-relaxed text-[color-mix(in_srgb,var(--ink)_85%,transparent)]">
            <section className="space-y-2">
              <h2 className="font-display text-base font-semibold text-[var(--ink)]">
                1. Aceitação dos Termos
              </h2>
              <p>
                Ao acessar ou utilizar a plataforma ou o aplicativo <strong>FocoHub</strong>, você concorda expressamente em cumprir e vincular-se a estes Termos de Uso e à nossa Política de Privacidade. Caso não concorde com qualquer disposição, não utilize o serviço.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display text-base font-semibold text-[var(--ink)]">
                2. Finalidade do Serviço
              </h2>
              <p>
                O FocoHub é um software projetado para organização pessoal de estudos, controle de ciclo de matérias, temporizadores e bloco de anotações. O serviço é disponibilizado para uso pessoal e intransferível.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display text-base font-semibold text-[var(--ink)]">
                3. Cadastro e Segurança da Conta
              </h2>
              <ul className="list-disc space-y-1 pl-5">
                <li>Você é responsável por manter a confidencialidade de sua senha de acesso.</li>
                <li>Você é o único responsável por todas as atividades realizadas na sua conta.</li>
                <li>O FocoHub reserva-se o direito de recusar cadastros ou encerrar contas que violem os padrões de uso da plataforma.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="font-display text-base font-semibold text-[var(--ink)]">
                4. Propriedade Intelectual
              </h2>
              <p>
                Todos os direitos autorais, marcas, código-fonte, layout visual e design system do FocoHub pertencem exclusivamente aos seus desenvolvedores. Os conteúdos de estudo cadastrados por você (como anotações e resumos) permanecem de sua exclusiva titularidade.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display text-base font-semibold text-[var(--ink)]">
                5. Modificações no Serviço e Encerramento
              </h2>
              <p>
                Podemos aprimorar, atualizar ou alterar recursos do sistema com o objetivo de melhorar a experiência dos estudantes. O usuário pode encerrar o uso e excluir sua conta a qualquer momento por meio das ferramentas disponibilizadas no aplicativo.
              </p>
            </section>

            <section className="space-y-2 border-t border-[var(--line)] pt-4">
              <h2 className="font-display text-base font-semibold text-[var(--ink)]">
                6. Dúvidas e Suporte
              </h2>
              <p>
                Para suporte técnico ou dúvidas relacionadas a estes Termos, envie um e-mail para <strong className="text-[var(--signal)]">davicoruda@gmail.com</strong>.
              </p>
            </section>
          </div>
        </article>
      </div>
    </div>
  );
}
