import AddToCartButton from "./AddToCartButton";

import Image from "next/image";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type Product = {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  product_type: string;
  available: boolean;
  featured: boolean;
};

type MenuSectionsProps = {
  categories: Category[];
  products: Product[];
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function ProductCard({
  product,
}: {
  product: Product;
}) {
  return (
    <article
      className={`overflow-hidden rounded-2xl border border-[#EEE6DF] bg-white shadow-sm ${
        !product.available ? "opacity-70" : ""
      }`}
    >
      <div className="flex min-h-[145px]">
        {/* INFORMAÇÕES */}
        <div className="flex min-w-0 flex-1 flex-col p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-[#241B19]">
              {product.name}
            </h3>

            {product.featured && (
              <span className="rounded-full bg-[#D2B48C]/25 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#8B0000]">
                Destaque
              </span>
            )}
          </div>

          {product.description && (
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#756A66] sm:text-sm">
              {product.description}
            </p>
          )}

          <div className="mt-auto pt-4">
            <p className="font-bold text-[#8B0000]">
              {formatCurrency(
                Number(product.price)
              )}
            </p>

            {product.available ? (
              <AddToCartButton
                product={{
                  id: product.id,
                  name: product.name,
                  price: Number(product.price),
                  image_url: product.image_url,
                }}
              />
            ) : (
              <p className="mt-2 text-xs font-bold text-[#756A66]">
                Indisponível no momento
              </p>
            )}
          </div>
        </div>

        {/* FOTO */}
        <div className="relative w-[120px] shrink-0 bg-[#F7F0EA] sm:w-[160px]">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 120px, 160px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl">
              🍰
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function MenuSections({
  categories,
  products,
}: MenuSectionsProps) {
  const featuredProducts =
    products.filter(
      (product) =>
        product.featured &&
        product.available
    );

  return (
    <div className="pb-8">
      {/* DESTAQUES */}
      {featuredProducts.length > 0 && (
        <section className="mb-10">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
              Seleção La&apos;bel
            </p>

            <h2 className="mt-1 text-2xl font-bold text-[#241B19]">
              Destaques
            </h2>

            <p className="mt-2 text-sm text-[#756A66]">
              Algumas das delícias que estão em destaque por aqui.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {featuredProducts.map(
              (product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                />
              )
            )}
          </div>
        </section>
      )}

      {/* CATEGORIAS */}
      <div className="space-y-10">
        {categories.map((category) => {
          const categoryProducts =
            products.filter(
              (product) =>
                product.category_id ===
                category.id
            );

          if (
            categoryProducts.length === 0
          ) {
            return null;
          }

          return (
            <section
              key={category.id}
              id={category.slug}
              className="scroll-mt-24"
            >
              <div className="mb-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8B0000]">
                  Cardápio
                </p>

                <h2 className="mt-1 text-2xl font-bold text-[#241B19]">
                  {category.name}
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {categoryProducts.map(
                  (product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                    />
                  )
                )}
              </div>
            </section>
          );
        })}
      </div>

      {products.length === 0 && (
        <section className="rounded-3xl border border-[#EEE6DF] bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-bold text-[#241B19]">
            Cardápio em preparação
          </h2>

          <p className="mt-2 text-sm text-[#756A66]">
            Os produtos estarão disponíveis em breve.
          </p>
        </section>
      )}
    </div>
  );
}