import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  AtSign,
  CalendarDays,
  CakeSlice,
  CreditCard,
  MapPin,
  Scale,
  Sparkles,
} from "lucide-react";

import PreorderWhatsAppButton from "@/components/store/PreorderWhatsAppButton";
import { getPreorderCatalog } from "@/lib/preorder-catalog-store";
import type { PreorderProduct } from "@/lib/preorder-menu";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Encomendas | La'Bel Confeitaria",
  description:
    "Bolos, doces, brownies e sobremesas sob encomenda para os seus momentos especiais.",
};

export const dynamic = "force-dynamic";

const fallbackWhatsApp = "48988681096";

async function getStoreWhatsApp() {
  try {
    const supabase =
      await createSupabaseServerClient();
    const { data } = await supabase
      .from("store_settings")
      .select("whatsapp")
      .limit(1)
      .maybeSingle();

    return data?.whatsapp || fallbackWhatsApp;
  } catch (error) {
    console.error(
      "Erro ao carregar WhatsApp da loja:",
      error
    );
    return fallbackWhatsApp;
  }
}

function ProductCard({
  product,
  whatsapp,
}: {
  product: PreorderProduct;
  whatsapp: string;
}) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-[#EEE6DF] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#F7F0EA]">
        <Image
          src={product.image}
          alt={product.imageAlt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 560px"
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
        />

        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 to-transparent" />
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h3 className="text-xl font-bold text-[#241B19] sm:text-2xl">
          {product.name}
        </h3>

        <p className="mt-2 text-sm leading-6 text-[#756A66]">
          {product.description}
        </p>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {product.prices.map((price) => (
            <div
              key={`${price.label}-${price.value}`}
              className="rounded-2xl bg-[#FFF7F5] px-4 py-3"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#756A66]">
                {price.label}
              </p>
              <p className="mt-1 text-lg font-bold text-[#8B0000]">
                {price.value}
              </p>
            </div>
          ))}
        </div>

        {product.flavors && (
          <div className="mt-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8B0000]">
              Sabores e opções
            </p>
            <p className="mt-2 text-sm leading-6 text-[#756A66]">
              {product.flavors.join(" · ")}
            </p>
          </div>
        )}

        {product.details && (
          <ul className="mt-5 space-y-2 text-sm leading-5 text-[#756A66]">
            {product.details.map((detail) => (
              <li
                key={detail}
                className="flex gap-2"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D2B48C]" />
                {detail}
              </li>
            ))}
          </ul>
        )}

        {product.notice && (
          <div className="mt-5 rounded-2xl border border-[#E8D2C1] bg-[#FFF9F3] px-4 py-3 text-sm font-semibold leading-5 text-[#8B0000]">
            {product.notice}
          </div>
        )}

        <PreorderWhatsAppButton
          phone={whatsapp}
          product={product}
          className="mt-6 w-full"
        />
      </div>
    </article>
  );
}

export default async function EncomendasPage() {
  const [whatsapp, preorderCategories] =
    await Promise.all([
      getStoreWhatsApp(),
      getPreorderCatalog(),
    ]);

  return (
    <main className="min-h-screen bg-[#FFFDF9]">
      <header className="bg-[#8B0000]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Link
            href="/"
            aria-label="Voltar para o cardápio do dia"
          >
            <Image
              src="/brand/logo-creme.svg"
              alt="La'Bel Confeitaria"
              width={175}
              height={70}
              priority
              className="h-[56px] w-[140px] sm:h-[70px] sm:w-[175px]"
            />
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/20 sm:text-sm"
          >
            <ArrowLeft size={17} />
            <span className="hidden sm:inline">
              Cardápio do dia
            </span>
            <span className="sm:hidden">Voltar</span>
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#8B0000] pb-14 pt-8 text-white sm:pb-20 sm:pt-12">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#D2B48C]/15 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 h-80 w-80 rounded-full bg-white/5 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-9 px-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D2B48C]">
              Cardápio de encomendas
            </p>

            <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
              Feito para celebrar os seus momentos.
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-7 text-white/75 sm:text-base">
              Bolos, doces, brownies e sobremesas artesanais. Escolha o seu favorito e fale com a gente para combinar cada detalhe.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a
                href="#catalogo"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D2B48C] px-5 py-3.5 text-sm font-bold text-[#8B0000] transition hover:bg-[#E1C7A5]"
              >
                <CakeSlice size={18} />
                Ver opções
              </a>

              <PreorderWhatsAppButton
                phone={whatsapp}
                label="Pedido personalizado"
                className="border border-white/15 bg-white/10 hover:bg-white/20"
              />
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="relative aspect-[5/4] overflow-hidden rounded-[2rem] border border-white/15 shadow-2xl">
              <Image
                src="/encomendas/bolo-espatulado.jpeg"
                alt="Bolo personalizado da La'Bel Confeitaria"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 520px"
                className="object-cover"
              />
            </div>

            <div className="absolute -bottom-5 -left-2 rounded-2xl border border-white/10 bg-[#241B19]/90 px-5 py-4 shadow-xl backdrop-blur sm:-left-6">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#D2B48C]">
                Feito artesanalmente
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                Personalizado para você
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: CalendarDays,
              title: "Antecedência",
              text: "Pedidos com no mínimo 2 dias.",
            },
            {
              icon: CreditCard,
              title: "Confirmação",
              text: "50% do valor para reservar.",
            },
            {
              icon: Scale,
              title: "Doces",
              text: "Peso médio de 16 g por unidade.",
            },
            {
              icon: MapPin,
              title: "Recebimento",
              text: "Retirada ou entrega a combinar.",
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="flex items-start gap-3 rounded-2xl border border-[#EEE6DF] bg-white p-4 shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8B0000]/10 text-[#8B0000]">
                  <Icon size={19} />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#241B19]">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#756A66]">
                    {item.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <nav className="sticky top-0 z-30 border-y border-[#EEE6DF] bg-[#FFFDF9]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-5 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {preorderCategories.map((category) => (
            <a
              key={category.id}
              href={`#${category.id}`}
              className="shrink-0 rounded-full border border-[#E8D2C1] bg-white px-4 py-2 text-xs font-bold text-[#8B0000] transition hover:border-[#8B0000] hover:bg-[#FFF7F5]"
            >
              {category.name}
            </a>
          ))}
        </div>
      </nav>

      <div
        id="catalogo"
        className="mx-auto max-w-6xl px-5 pb-16 pt-12 sm:pb-24 sm:pt-16"
      >
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-[#8B0000]">
            <Sparkles size={18} />
            <p className="text-xs font-bold uppercase tracking-[0.18em]">
              Escolha o seu favorito
            </p>
          </div>

          <h2 className="mt-3 text-3xl font-bold text-[#241B19] sm:text-4xl">
            Nosso cardápio de encomendas
          </h2>

          <p className="mt-3 text-sm leading-6 text-[#756A66] sm:text-base">
            Valores e opções conforme o cardápio vigente. Personalizações podem alterar o orçamento final.
          </p>
        </div>

        <div className="mt-14 space-y-20">
          {preorderCategories.map((category) => (
            <section
              key={category.id}
              id={category.id}
              className="scroll-mt-24"
            >
              <div className="mb-6 flex items-end justify-between gap-4 border-b border-[#EEE6DF] pb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
                    {category.eyebrow}
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-[#241B19] sm:text-3xl">
                    {category.name}
                  </h2>
                </div>

                <span className="text-xs font-semibold text-[#756A66]">
                  {category.products.length}{" "}
                  {category.products.length === 1
                    ? "opção"
                    : "opções"}
                </span>
              </div>

              <div className="grid items-stretch gap-6 md:grid-cols-2">
                {category.products.map(
                  (product) => (
                    <ProductCard
                      key={product.name}
                      product={product}
                      whatsapp={whatsapp}
                    />
                  )
                )}
              </div>
            </section>
          ))}
        </div>
      </div>

      <section className="bg-[#D2B48C]">
        <div className="mx-auto grid max-w-6xl items-center gap-7 px-5 py-12 sm:py-16 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8B0000]">
              Algo único para a sua festa
            </p>
            <h2 className="mt-2 max-w-2xl text-3xl font-bold text-[#8B0000] sm:text-4xl">
              Não encontrou exatamente o que imaginou?
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#49352C]">
              Conte a sua ideia para a gente. Vamos conversar sobre sabores, cores, tema e quantidade.
            </p>
          </div>

          <PreorderWhatsAppButton
            phone={whatsapp}
            label="Pedir orçamento personalizado"
            className="w-full px-6 sm:w-auto"
          />
        </div>
      </section>

      <footer className="bg-[#241B19] text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-9 sm:flex-row sm:items-center sm:justify-between">
          <Image
            src="/brand/logo-creme.svg"
            alt="La'Bel Confeitaria"
            width={150}
            height={60}
            className="h-[54px] w-[135px]"
          />

          <div className="flex flex-col gap-3 text-sm text-white/75 sm:flex-row sm:items-center sm:gap-6">
            <a
              href="https://www.instagram.com/label_confeitariagourmet/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 transition hover:text-[#D2B48C]"
            >
              <AtSign size={17} />
              @label_confeitariagourmet
            </a>

            <Link
              href="/"
              className="inline-flex items-center gap-2 transition hover:text-[#D2B48C]"
            >
              <ArrowLeft size={17} />
              Voltar ao cardápio do dia
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
