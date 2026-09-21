import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { BrandIcon } from "@/components/BrandIcon";

export const metadata = {
  title: "Política de Privacidade — FocoHub",
  description:
    "Política de privacidade e proteção de dados do FocoHub em conformidade com as diretrizes da Google Play Store e LGPD.",
};

export default function PrivacidadePage() {
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
              <ShieldCheck size={14} />
              <span>Privacidade e Segurança</span>
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Política de Privacidade
            </h1>
            <p className="mt-2 text-xs text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
              Última atualização: 21 de setembro de 2026 · Válida para Web e Google Play Store
            </p>
          </header>

          <div className="space-y-6 text-sm leading-relaxed text-[color-mix(in_srgb,var(--ink)_85%,transparent)]">
            <section className="space-y-2">
              <h2 className="font-display text-base font-semibold text-[var(--ink)]">
                1. Visão Geral e Compromisso
              </h2>
              <p>
                O <strong>FocoHub</strong> foi desenvolvido para ajudar estudantes a organizar seus ciclos de estudos, cronometrar sessões e manter anotações de estudo de forma calma e produtiva.
              </p>
              <p>
                Respeitamos integralmente a sua privacidade. Coletamos apenas as informações estritamente necessárias para o funcionamento do serviço e para sincronizar os seus dados entre os seus dispositivos.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display text-base font-semibold text-[var(--ink)]">
                2. Informações que Coletamos
              </h2>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong>Dados de Autenticação:</strong> Endereço de e-mail e senha criptografada (gerenciados via Supabase Auth) para criar e proteger o seu acesso.
                </li>
                <li>
                  <strong>Dados de Produtividade e Estudo:</strong> Matérias cadastradas, ciclos, blocos semanais, tempos de foco/cronômetros registrados, notas de lembretes e registros de revisão.
                </li>
                <li>
                  <strong>Informações Técnicas Básicas:</strong> Dados de diagnóstico padrão para garantir estabilidade e sincronização de dados com o banco.
                </li>
              </ul>
              <p className="text-xs opacity-75">
                * Não coletamos sua localização em tempo real, dados de contatos, dados biométricos nem informações financeiras desnecessárias.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display text-base font-semibold text-[var(--ink)]">
                3. Como Utilizamos as Suas Informações
              </h2>
              <ul className="list-disc space-y-1 pl-5">
                <li>Permitir o login e a identificação do usuário em múltiplos aparelhos.</li>
                <li>Salvar e sincronizar o seu progresso de estudos, cronômetros e matérias.</li>
                <li>Emitir notificações sonoras e de alarme configuradas voluntariamente por você no app.</li>
              </ul>
              <p>
                <strong>Não vendemos, não alugamos e não compartilhamos seus dados com terceiros para fins de marketing ou publicidade.</strong>
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display text-base font-semibold text-[var(--ink)]">
                4. Segurança e Armazenamento dos Dados
              </h2>
              <p>
                Todos os dados são transmitidos por conexões criptografadas (HTTPS/TLS) e armazenados em infraestrutura de nuvem segura com políticas de isolamento multiusuário (Row Level Security - RLS). Isso significa que nenhum outro usuário tem acesso às suas matérias ou sessões.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-display text-base font-semibold text-[var(--ink)]">
                5. Exclusão Definitiva de Conta e Dados (Google Play Policy)
              </h2>
              <p>
                Em total conformidade com as diretrizes da Google Play Store (Account Deletion Policy) e com a Lei Geral de Proteção de Dados (LGPD):
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong>Diretamente no aplicativo:</strong> Você pode excluir sua conta a qualquer momento tocando no seu avatar no cabeçalho e selecionando <em>"Excluir conta definitivamente"</em>, ou na aba de Ajustes.
                </li>
                <li>
                  <strong>Pela Web / Suporte:</strong> Você também pode solicitar a exclusão total da conta enviando um e-mail para <code className="rounded bg-[var(--mist)] px-1.5 py-0.5 text-xs">davicoruda@gmail.com</code> a partir do endereço de e-mail cadastrado.
                </li>
              </ul>
              <p className="text-xs opacity-80">
                Ao confirmar a exclusão, todos os seus dados pessoais, históricos de estudo, cronômetros e matérias são imediatamente apagados de forma irreversível de nossos bancos de dados.
              </p>
            </section>

            <section className="space-y-2 border-t border-[var(--line)] pt-4">
              <h2 className="font-display text-base font-semibold text-[var(--ink)]">
                6. Contato
              </h2>
              <p>
                Caso tenha dúvidas sobre esta política ou queira exercer os seus direitos de titular de dados, entre em contato pelo e-mail: <strong className="text-[var(--signal)]">davicoruda@gmail.com</strong>.
              </p>
            </section>
          </div>
        </article>
      </div>
    </div>
  );
}
