import Image from "next/image";
import {
  ChevronRight,
  Clock3,
  Camera,
  MapPin,
  ShoppingBag,
} from "lucide-react";

const categories = [
  {
    name: "Sobremesas",
    emoji: "🍰",
  },
  {
    name: "Salgados",
    emoji: "🥐",
  },
  {
    name: "Bebidas",
    emoji: "🥤",
  },
];

const mockProducts = [
  {
    id: 1,
    name: "Sobremesa La'bel",
    description: "Uma das queridinhas da nossa confeitaria.",
    price: 18,
  },
  {
    id: 2,
    name: "Brownie",
    description: "Brownie artesanal, macio por dentro e intenso em chocolate.",
    price: 12,
  },
  {
    id: 3,
    name: "Salgado Especial",
    description: "Preparado artesanalmente e servido fresquinho.",
    price: 9,
  },
];

function formatPrice(price: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
}

export default function Home() {
  return (
    <main className="min-h-screen pb-28">
      <header className="bg-[#8B0000]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Image
            src="/brand/logo.svg"
            alt="La'bel Confeitaria"
            width={170}
            height={70}
            priority
            className="h-auto w-[135px] object-contain sm:w-[165px]"
          />

          <button
            type="button"
            aria-label="Abrir carrinho"
            className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-[#D2B48C] transition hover:bg-white/20"
          >
            <ShoppingBag size={21} />

            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#D2B48C] px-1 text-[10px] font-bold text-[#8B0000]">
              0
            </span>
          </button>
        </div>
      </header>

      <section className="bg-[#8B0000] pb-9">
        <div className="mx-auto max-w-6xl px-5">
          <div className="max-w-xl">
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#D2B48C]">
              La&apos;bel Confeitaria
            </p>

            <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
              Um doce momento começa por aqui.
            </h1>

            <p className="mt-4 max-w-md text-sm leading-6 text-white/75 sm:text-base">
              Escolha seus favoritos, monte seu pedido e continue o atendimento
              pelo WhatsApp.
            </p>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 text-white">
              <Clock3 size={20} className="mt-0.5 shrink-0 text-[#D2B48C]" />

              <div>
                <p className="text-sm font-bold">Horário de atendimento</p>
                <p className="mt-1 text-xs leading-5 text-white/70">
                  Terça a sexta: 09:00 às 19:00
                  <br />
                  Sábado: 09:00 às 17:00
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-4 text-white">
              <MapPin size={20} className="mt-0.5 shrink-0 text-[#D2B48C]" />

              <div>
                <p className="text-sm font-bold">Como você prefere?</p>
                <p className="mt-1 text-xs leading-5 text-white/70">
                  Retirada na loja ou entrega no seu endereço.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5">
        <section className="-mt-5">
          <div className="flex items-center gap-3 rounded-2xl border border-[#eee6df] bg-white p-4 shadow-sm">
            <span className="h-3 w-3 shrink-0 rounded-full bg-green-500" />

            <div>
              <p className="text-sm font-bold text-[#241b19]">
                Loja aberta para pedidos
              </p>

              <p className="mt-0.5 text-xs text-[#756a66]">
                Monte seu carrinho e envie pelo WhatsApp.
              </p>
            </div>
          </div>
        </section>

        <section className="py-8">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
              Cardápio
            </p>

            <h2 className="mt-1 text-2xl font-bold">Categorias</h2>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {categories.map((category) => (
              <button
                type="button"
                key={category.name}
                className="flex min-h-[105px] flex-col items-center justify-center rounded-2xl border border-[#eee6df] bg-white p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-[#D2B48C]"
              >
                <span className="text-3xl">{category.emoji}</span>

                <span className="mt-3 text-xs font-bold text-[#241b19] sm:text-sm">
                  {category.name}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="pb-8">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
              Pronta entrega
            </p>

            <h2 className="mt-1 text-2xl font-bold">Disponíveis hoje</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mockProducts.map((product) => (
              <article
                key={product.id}
                className="overflow-hidden rounded-3xl border border-[#eee6df] bg-white shadow-sm"
              >
                <div className="flex aspect-[4/3] items-center justify-center bg-[#f5eee5]">
                  <Image
                    src="/brand/icon-bege.svg"
                    alt=""
                    width={80}
                    height={80}
                    className="h-16 w-16 object-contain opacity-15"
                  />
                </div>

                <div className="p-5">
                  <h3 className="text-lg font-bold">{product.name}</h3>

                  <p className="mt-2 min-h-10 text-sm leading-5 text-[#756a66]">
                    {product.description}
                  </p>

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <strong className="text-lg text-[#8B0000]">
                      {formatPrice(product.price)}
                    </strong>

                    <button
                      type="button"
                      className="rounded-xl bg-[#8B0000] px-4 py-2.5 text-xs font-bold text-white transition hover:opacity-90"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="pb-8">
          <div className="overflow-hidden rounded-3xl bg-[#D2B48C]">
            <div className="p-6 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
                Planejando algo especial?
              </p>

              <h2 className="mt-2 max-w-lg text-2xl font-bold text-[#8B0000] sm:text-3xl">
                Conheça nosso cardápio de encomendas.
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-6 text-[#49352c]">
                Bolos, doces e outras opções preparadas especialmente para cada
                ocasião.
              </p>

              <button
                type="button"
                className="mt-6 flex items-center gap-2 rounded-xl bg-[#8B0000] px-5 py-3 text-sm font-bold text-white"
              >
                Ver encomendas
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </section>

        <section className="pb-8">
          <div className="flex items-center justify-between rounded-2xl border border-[#eee6df] bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#8B0000] text-white">
                <Camera size={20} />
              </div>

              <div>
                <p className="text-xs text-[#756a66]">Siga a La&apos;bel</p>
                <p className="font-bold">@label_confeitaria</p>
              </div>
            </div>

            <ChevronRight size={20} className="text-[#8B0000]" />
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#eee6df] bg-white/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-2xl bg-[#8B0000] px-5 py-4 text-white shadow-lg"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xs font-bold">
                0
              </span>

              <span className="text-sm font-bold">Ver carrinho</span>
            </div>

            <strong>R$ 0,00</strong>
          </button>
        </div>
      </div>
    </main>
  );
}