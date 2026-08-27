import Image from "next/image";
import { getPublicInstallationProfile } from "@/config/installation/public";
import {
  getCatalogStartingPrice,
  isConfigurableProduct,
} from "@/lib/cart";
import type { FoodCatalogConfiguration } from "@/lib/food-catalog/types";
import { getImageFramingStyle } from "@/lib/image-framing";

import AddToCartButton from "./AddToCartButton";
import ProductConfiguratorDialog from "./ProductConfiguratorDialog";

const installation = getPublicInstallationProfile();

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
  image_position_x: number;
  image_position_y: number;
  image_zoom: number;
  product_type: string;
  available: boolean;
  featured: boolean;
  configuration: FoodCatalogConfiguration;
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
  const configurable = isConfigurableProduct(product.configuration);
  const startingPrice = getCatalogStartingPrice(
    Number(product.price),
    product.configuration
  );

  return (
    <article
      className={`overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm transition ${
        product.available
          ? "hover:-translate-y-0.5 hover:shadow-md"
          : "opacity-70"
      }`}
    >
      <div className="flex min-h-[145px]">
        {/* INFORMAÇÕES */}
        <div className="flex min-w-0 flex-1 flex-col p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-brand-foreground">
              {product.name}
            </h3>

            {product.featured &&
              product.available && (
                <span className="rounded-full bg-brand-secondary/25 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-primary">
                  Destaque
                </span>
              )}

            {!product.available && (
              <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-600">
                Indisponível
              </span>
            )}
          </div>

          {product.description && (
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-brand-muted-foreground sm:text-sm">
              {product.description}
            </p>
          )}

          <div className="mt-auto pt-4">
            <p className="font-bold text-brand-primary">
              {configurable && (
                <span className="mr-1 text-xs font-semibold text-brand-muted-foreground">
                  A partir de
                </span>
              )}
              {formatCurrency(startingPrice)}
            </p>

            {product.available ? (
              configurable ? (
                <ProductConfiguratorDialog
                  product={{
                    id: product.id,
                    name: product.name,
                    price: Number(product.price),
                    image_url: product.image_url,
                  }}
                  configuration={product.configuration}
                />
              ) : (
                <AddToCartButton
                  product={{
                    id: product.id,
                    name: product.name,
                    price: Number(product.price),
                    image_url: product.image_url,
                  }}
                />
              )
            ) : (
              <p className="mt-2 text-xs font-bold text-brand-muted-foreground">
                Indisponível no momento
              </p>
            )}
          </div>
        </div>

        {/* FOTO */}
        <div className="relative w-[120px] shrink-0 overflow-hidden bg-brand-surface-muted sm:w-[160px]">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 120px, 160px"
              className="object-cover"
              style={getImageFramingStyle(
                product.image_position_x ?? 50,
                product.image_position_y ?? 50,
                product.image_zoom ?? 100
              )}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-3 text-center">
              <span className="text-4xl">
                🍰
              </span>

              <span className="mt-2 text-[10px] font-semibold text-[#A3948D]">
                Foto em breve
              </span>
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

  const categoriesWithProducts =
    categories.filter(
      (category) =>
        products.some(
          (product) =>
            product.category_id ===
            category.id
        )
    );

  return (
    <div className="pb-8">
      {/* DESTAQUES */}
      {featuredProducts.length > 0 && (
        <section className="mb-10">
          <div className="mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">
              Seleção {installation.identity.shortName}
            </p>

            <h2 className="mt-1 text-2xl font-bold text-brand-foreground">
              Destaques
            </h2>

            <p className="mt-2 text-sm text-brand-muted-foreground">
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
      {categoriesWithProducts.length >
        0 && (
        <div className="space-y-10">
          {categoriesWithProducts.map(
            (category) => {
              const categoryProducts =
                products.filter(
                  (product) =>
                    product.category_id ===
                    category.id
                );

              return (
                <section
                  key={category.id}
                  id={category.slug}
                  className="scroll-mt-24"
                >
                  <div className="mb-5">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">
                      Cardápio
                    </p>

                    <h2 className="mt-1 text-2xl font-bold text-brand-foreground">
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
            }
          )}
        </div>
      )}

      {/* CARDÁPIO VAZIO */}
      {products.length === 0 && (
        <section className="rounded-3xl border border-brand-border bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-primary/10 text-3xl">
            🍰
          </div>

          <h2 className="mt-5 text-xl font-bold text-brand-foreground">
            Cardápio em preparação
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-brand-muted-foreground">
            Os produtos da {installation.identity.shortName} estarão disponíveis por aqui em breve.
          </p>
        </section>
      )}

      {/* PRODUTOS SEM CATEGORIA VISÍVEL */}
      {products.length > 0 &&
        categoriesWithProducts.length ===
          0 && (
          <section className="rounded-3xl border border-brand-border bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-bold text-brand-foreground">
              Cardápio temporariamente indisponível
            </h2>

            <p className="mt-2 text-sm leading-6 text-brand-muted-foreground">
              Não encontramos categorias disponíveis para os produtos neste momento.
            </p>
          </section>
        )}
    </div>
  );
}
