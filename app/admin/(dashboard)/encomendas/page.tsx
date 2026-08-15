import {
  CalendarDays,
  CakeSlice,
  ListChecks,
} from "lucide-react";

import EditPreorderProductDialog from "@/components/admin/EditPreorderProductDialog";
import EditPreorderHeroDialog from "@/components/admin/EditPreorderHeroDialog";
import { getPreorderCatalog } from "@/lib/preorder-catalog-store";
import { getImageDisplaySettings } from "@/lib/image-display-settings-store";

import {
  updatePreorderHero,
  updatePreorderProduct,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminEncomendasPage() {
  const [categories, imageSettings] =
    await Promise.all([
      getPreorderCatalog(),
      getImageDisplaySettings(),
    ]);
  const productCount = categories.reduce(
    (total, category) =>
      total + category.products.length,
    0
  );

  return (
    <main className="p-5 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8B0000]">
            Catálogo especial
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[#241B19]">
            Encomendas
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#756A66]">
            Gerencie os tamanhos, preços, sabores, quantidades e prazos exibidos no cardápio de encomendas.
          </p>
        </div>

        <section className="mt-8 grid items-center gap-5 rounded-3xl border border-[#EEE6DF] bg-white p-5 shadow-sm lg:grid-cols-[1fr_360px] lg:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8B0000]">
              Destaque da página
            </p>
            <h2 className="mt-2 text-xl font-bold text-[#241B19]">
              Imagem principal das encomendas
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#756A66]">
              Clique na foto para trocar o arquivo, centralizar o bolo ou ajustar a distância com o zoom.
            </p>
          </div>
          <EditPreorderHeroDialog
            settings={imageSettings.preorderHero}
            updateAction={updatePreorderHero}
          />
        </section>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-2xl border border-[#EEE6DF] bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B0000]/10 text-[#8B0000]">
              <CakeSlice size={19} />
            </div>
            <div>
              <p className="text-xs text-[#756A66]">
                Produtos
              </p>
              <p className="text-lg font-bold text-[#241B19]">
                {productCount}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-[#EEE6DF] bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B0000]/10 text-[#8B0000]">
              <ListChecks size={19} />
            </div>
            <div>
              <p className="text-xs text-[#756A66]">
                Categorias
              </p>
              <p className="text-lg font-bold text-[#241B19]">
                {categories.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-[#EEE6DF] bg-white p-4 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B0000]/10 text-[#8B0000]">
              <CalendarDays size={19} />
            </div>
            <div>
              <p className="text-xs text-[#756A66]">
                Atualização
              </p>
              <p className="text-sm font-bold text-[#241B19]">
                Publicação imediata
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-8">
          {categories.map((category) => (
            <section
              key={category.id}
              className="overflow-hidden rounded-3xl border border-[#EEE6DF] bg-white shadow-sm"
            >
              <div className="flex items-center justify-between gap-4 border-b border-[#EEE6DF] bg-[#FFF9F3] px-5 py-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B0000]">
                    {category.eyebrow}
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-[#241B19]">
                    {category.name}
                  </h2>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#756A66]">
                  {category.products.length}{" "}
                  {category.products.length === 1
                    ? "produto"
                    : "produtos"}
                </span>
              </div>

              <div className="divide-y divide-[#EEE6DF]">
                {category.products.map((product) => (
                  <article
                    key={product.name}
                    className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <EditPreorderProductDialog
                        categoryId={category.id}
                        product={product}
                        updateAction={updatePreorderProduct}
                        triggerMode="image"
                      />

                      <div className="min-w-0">
                        <h3 className="font-bold text-[#241B19]">
                          {product.name}
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {product.prices.map((price) => (
                            <span
                              key={`${price.label}-${price.value}`}
                              className="rounded-full bg-[#FFF7F5] px-2.5 py-1 text-xs font-semibold text-[#8B0000]"
                            >
                              {price.label}: {price.value}
                            </span>
                          ))}
                        </div>
                        <p className="mt-2 text-xs text-[#756A66]">
                          {product.allowedQuantities?.length
                            ? `Quantidades: ${product.allowedQuantities.join(
                                ", "
                              )}${
                                product.quantityIncrement
                                  ? ` e acima de ${Math.max(
                                      ...product.allowedQuantities
                                    )} em intervalos de ${product.quantityIncrement}`
                                  : ""
                              }`
                            : `Mínimo: ${
                                product.minimumQuantity ?? 1
                              }`} {product.quantityUnit ?? "item(ns)"}
                          {product.flavors?.length
                            ? ` · ${product.flavors.length} sabores cadastrados`
                            : " · sem seleção de sabores"}
                        </p>
                        <p className="mt-1 text-[10px] font-semibold text-[#A3948D]">
                          Clique na foto para editar e enquadrar
                        </p>
                      </div>
                    </div>

                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
