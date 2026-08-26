import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";

import BrandLogo from "@/components/brand/BrandLogo";
import { getPublicInstallationProfile } from "@/config/installation/public";
import {
  buildPrivacyContactMessage,
  formatPrivacyNoticeDate,
} from "@/lib/installation-presentation";

const installation = getPublicInstallationProfile();
const legal = installation.legal;
const privacyNoticeDate = formatPrivacyNoticeDate(installation);

export const metadata: Metadata = {
  title: "Privacidade",
  description: `Saiba como ${legal.controllerName} utiliza e protege os dados informados nos pedidos.`,
};

const whatsappUrl = `https://wa.me/${installation.contact.whatsapp}?text=${encodeURIComponent(
  buildPrivacyContactMessage(installation)
)}`;

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-brand-background">
      <header className="bg-brand-primary">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-5 px-5 py-5">
          <BrandLogo variant="header" eager />
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/20"
          >
            <ArrowLeft size={17} />
            Cardápio
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-primary">
          Aviso de privacidade
        </p>
        <h1 className="mt-3 text-3xl font-bold text-brand-foreground sm:text-4xl">
          Como cuidamos dos seus dados
        </h1>
        <p className="mt-4 text-sm leading-7 text-brand-muted-foreground sm:text-base">
          Este aviso explica, de forma simples, como {legal.controllerName}
          utiliza os dados informados no cardápio digital. Última atualização: {privacyNoticeDate}.
        </p>

        <div className="mt-10 space-y-8 text-sm leading-7 text-[#493F3B] sm:text-base">
          <section>
            <h2 className="text-xl font-bold text-brand-foreground">
              1. Quem é responsável
            </h2>
            <p className="mt-2">
              {legal.controllerName}, localizada em {legal.locality.city}/
              {legal.locality.state}, é responsável pelas decisões sobre os dados utilizados
              para atender os pedidos realizados neste site.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-brand-foreground">
              2. Dados utilizados
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>nome e sobrenome;</li>
              <li>número de WhatsApp;</li>
              <li>
                endereço e referência, quando o cliente escolhe entrega;
              </li>
              <li>
                itens, sabores, data, observações e andamento do pedido;
              </li>
              <li>
                identificadores técnicos protegidos, usados para impedir
                abuso, automações e pedidos duplicados.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-brand-foreground">
              3. Para que usamos os dados
            </h2>
            <p className="mt-2">
              Utilizamos essas informações para registrar e confirmar o
              pedido, conversar com o cliente, preparar os produtos, realizar
              retirada ou entrega, atualizar o andamento, organizar pagamentos
              e manter os registros necessários da operação. Também usamos
              medidas técnicas para proteger o sistema contra fraude e abuso.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-brand-foreground">
              4. Serviços utilizados
            </h2>
            <p className="mt-2">
              Os dados podem ser processados pelos fornecedores necessários
              ao funcionamento do serviço: Supabase, para banco e arquivos;
              Vercel, para hospedagem; Cloudflare, para verificação de
              segurança; e WhatsApp, quando o cliente abre a conversa para
              continuar o atendimento. Não vendemos dados pessoais.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-brand-foreground">
              5. Armazenamento e eliminação
            </h2>
            <p className="mt-2">
              Os registros são mantidos pelo tempo necessário para atender o
              pedido, prestar suporte, proteger a operação e cumprir obrigações
              legais ou regulatórias aplicáveis. Depois disso, podem ser
              eliminados ou anonimizados quando cabível.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-brand-foreground">
              6. Carrinho e cookies técnicos
            </h2>
            <p className="mt-2">
              O carrinho é guardado no próprio navegador para que os itens não
              sejam perdidos ao atualizar a página. A área administrativa usa
              recursos técnicos de autenticação. Não utilizamos esses recursos
              para publicidade comportamental.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-brand-foreground">
              7. Seus direitos
            </h2>
            <p className="mt-2">
              O cliente pode solicitar confirmação do tratamento, acesso,
              correção, informações sobre compartilhamento, anonimização,
              bloqueio ou eliminação quando aplicável. Algumas informações
              podem ser conservadas quando houver uma obrigação legal ou outra
              hipótese permitida pela legislação.
            </p>
          </section>
        </div>

        <section className="mt-10 rounded-3xl bg-brand-primary p-6 text-brand-primary-foreground sm:p-8">
          <h2 className="text-xl font-bold">
            Fale com a {installation.identity.shortName}
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/80">
            Para consultar, corrigir ou solicitar uma providência sobre seus
            dados, entre em contato pelo WhatsApp da loja.
          </p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-secondary px-5 py-3 text-sm font-bold text-brand-primary transition hover:bg-[#E1C8A8]"
          >
            <MessageCircle size={18} />
            Solicitar atendimento
          </a>
        </section>
      </article>
    </main>
  );
}
