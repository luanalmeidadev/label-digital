import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";

import BrandLogo from "@/components/brand/BrandLogo";
import { storeConfig } from "@/config/store";

export const metadata: Metadata = {
  title: "Privacidade | La'Bel Confeitaria",
  description:
    "Saiba como a La'Bel Confeitaria utiliza e protege os dados informados nos pedidos.",
};

const whatsappUrl = `https://wa.me/${storeConfig.whatsapp}?text=${encodeURIComponent(
  "Olá! Quero falar sobre os meus dados pessoais no sistema da La'Bel."
)}`;

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#FFFDF9]">
      <header className="bg-[#8B0000]">
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
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8B0000]">
          Aviso de privacidade
        </p>
        <h1 className="mt-3 text-3xl font-bold text-[#241B19] sm:text-4xl">
          Como cuidamos dos seus dados
        </h1>
        <p className="mt-4 text-sm leading-7 text-[#756A66] sm:text-base">
          Este aviso explica, de forma simples, como a La&apos;Bel
          Confeitaria utiliza os dados informados no cardápio digital.
          Última atualização: 15 de agosto de 2026.
        </p>

        <div className="mt-10 space-y-8 text-sm leading-7 text-[#493F3B] sm:text-base">
          <section>
            <h2 className="text-xl font-bold text-[#241B19]">
              1. Quem é responsável
            </h2>
            <p className="mt-2">
              A La&apos;Bel Confeitaria, localizada em Palhoça/SC,
              é responsável pelas decisões sobre os dados utilizados
              para atender os pedidos realizados neste site.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[#241B19]">
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
            <h2 className="text-xl font-bold text-[#241B19]">
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
            <h2 className="text-xl font-bold text-[#241B19]">
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
            <h2 className="text-xl font-bold text-[#241B19]">
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
            <h2 className="text-xl font-bold text-[#241B19]">
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
            <h2 className="text-xl font-bold text-[#241B19]">
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

        <section className="mt-10 rounded-3xl bg-[#8B0000] p-6 text-white sm:p-8">
          <h2 className="text-xl font-bold">
            Fale com a La&apos;Bel
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/80">
            Para consultar, corrigir ou solicitar uma providência sobre seus
            dados, entre em contato pelo WhatsApp da loja.
          </p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#D2B48C] px-5 py-3 text-sm font-bold text-[#8B0000] transition hover:bg-[#E1C8A8]"
          >
            <MessageCircle size={18} />
            Solicitar atendimento
          </a>
        </section>
      </article>
    </main>
  );
}
