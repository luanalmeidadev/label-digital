import { ArrowDown, ArrowUp, Package } from "lucide-react";

import ConfigurableProductDialog from "@/components/admin/ConfigurableProductDialog";
import DeleteProductDialog from "@/components/admin/DeleteProductDialog";
import EditProductDialog from "@/components/admin/EditProductDialog";
import NewProductDialog from "@/components/admin/NewProductDialog";
import ProductCategorySection from "@/components/admin/ProductCategorySection";
import { getPublicInstallationProfile } from "@/config/installation/public";
import { getCatalogStartingPrice } from "@/lib/cart";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getImageDisplaySettings } from "@/lib/image-display-settings-store";
import { getFoodCatalogConfigurations } from "@/lib/food-catalog/repository";

import {
  createProduct,
  deleteProduct,
  moveProduct,
  toggleProductAvailability,
  toggleProductStatus,
  updateProduct,
} from "./actions";
import {
  removeProductOption,
  removeProductOptionGroup,
  removeProductVariant,
  reorderProductOption,
  reorderProductOptionGroup,
  reorderProductVariant,
  saveProductOption,
  saveProductOptionGroup,
  saveProductVariant,
  setCatalogPricingMode,
} from "./catalog-actions";

const installation = getPublicInstallationProfile();

export default async function ProdutosPage() {
  const supabase = await createSupabaseServerClient();

  const { data: products, error } = await supabase
    .from("products")
    .select(`
      id,
      category_id,
      name,
      description,
      price,
      pricing_mode,
      image_url,
      image_position_x,
      image_position_y,
      available,
      featured,
      active,
      sort_order,
      categories (
        id,
        name
      )
    `)
    .order("sort_order");

  if (error) {
    throw new Error("Não foi possível carregar os produtos.");
  }

  const { data: categories, error: categoriesError } =
    await supabase
      .from("categories")
      .select("id, name, active, sort_order")
      .order("sort_order");

  if (categoriesError) {
    throw new Error("Não foi possível carregar as categorias.");
  }

  const imageSettings =
    await getImageDisplaySettings();
  const catalogConfigurations = await getFoodCatalogConfigurations(
    supabase,
    (products ?? []).map((product) => product.id)
  );

  const activeCategories = (categories ?? [])
    .filter((category) => category.active)
    .map(({ id, name }) => ({ id, name }));

  const productGroups = (categories ?? [])
    .map((category) => ({
      id: category.id,
      name: category.name,
      active: category.active,
      products: (products ?? []).filter(
        (product) => product.category_id === category.id
      ),
    }))
    .filter((group) => group.products.length > 0);

  const uncategorizedProducts = (products ?? []).filter(
    (product) =>
      !categories?.some(
        (category) => category.id === product.category_id
      )
  );

  if (uncategorizedProducts.length > 0) {
    productGroups.push({
      id: "uncategorized",
      name: "Sem categoria",
      active: false,
      products: uncategorizedProducts,
    });
  }

  return (
    <main className="p-5 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-primary">
              Catálogo
            </p>

            <h1 className="mt-2 text-3xl font-bold text-brand-foreground">
              Produtos
            </h1>

            <p className="mt-2 text-sm text-brand-muted-foreground">
              Cadastre e gerencie os produtos disponíveis no cardápio da{" "}
              {installation.identity.shortName}.
            </p>
          </div>

          <NewProductDialog
            categories={activeCategories}
            createAction={createProduct}
          />
        </div>

        <section className="mt-8 rounded-3xl border border-[#E7D8CC] bg-gradient-to-r from-white via-white to-[#FFF1EA] p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-primary text-brand-primary-foreground shadow-sm">
                <Package size={22} />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-primary">
                  Visão do catálogo
                </p>

                <h2 className="mt-1 text-lg font-bold text-brand-foreground">
                  Produtos cadastrados
                </h2>

                <p className="mt-1 text-xs text-brand-muted-foreground">
                  Organize a exibição dos itens no administrativo e no cardápio.
                </p>
              </div>
            </div>

            <div className="flex gap-2 sm:justify-end">
              <span className="rounded-full border border-[#E7D8CC] bg-white px-4 py-2 text-xs font-bold text-brand-primary shadow-sm">
                {products?.length ?? 0} produto(s)
              </span>

              <span className="rounded-full border border-[#E7D8CC] bg-white px-4 py-2 text-xs font-bold text-brand-muted-foreground shadow-sm">
                {productGroups.length} categoria(s)
              </span>
            </div>
          </div>
        </section>

        <section className="mt-4 overflow-hidden rounded-3xl border border-brand-border bg-white shadow-sm">

          {products && products.length > 0 ? (
            <div className="divide-y divide-brand-border">
              {productGroups.map((group, groupIndex) => (
                <ProductCategorySection
                  key={group.id}
                  name={group.name}
                  productCount={group.products.length}
                  active={group.active}
                  defaultOpen={groupIndex === 0}
                >
                    {group.products.map((product, productIndex) => {
                      const firstProduct = productIndex === 0;
                      const lastProduct =
                        productIndex === group.products.length - 1;
                      const productCategory = Array.isArray(
                        product.categories
                      )
                        ? product.categories[0]
                        : product.categories;
                      const catalogConfiguration =
                        catalogConfigurations[product.id] ?? {
                          pricingMode: product.pricing_mode,
                          variants: [],
                          optionGroups: [],
                        };
                      const configurable =
                        catalogConfiguration.pricingMode === "variant" ||
                        catalogConfiguration.optionGroups.length > 0;
                      const startingPrice = getCatalogStartingPrice(
                        Number(product.price),
                        catalogConfiguration
                      );

                      return (
                  <article
                    key={product.id}
                    className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <EditProductDialog
                        id={product.id}
                        name={product.name}
                        description={product.description}
                        price={Number(product.price)}
                        pricingMode={product.pricing_mode}
                        categoryId={product.category_id}
                        available={product.available}
                        featured={product.featured}
                        active={product.active}
                        categories={activeCategories}
                        updateAction={updateProduct}
                        imageUrl={product.image_url}
                        imagePositionX={
                          product.image_position_x ?? 50
                        }
                        imagePositionY={
                          product.image_position_y ?? 50
                        }
                        imageZoom={
                          imageSettings.dailyProductZoom[
                            product.id
                          ] ?? 100
                        }
                        triggerMode="image"
                      />

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-brand-foreground">
                            {product.name}
                          </h3>

                          {product.featured && (
                            <span className="rounded-full bg-brand-secondary/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-primary">
                              Destaque
                            </span>
                          )}

                          <span className="rounded-full bg-brand-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-primary">
                            {configurable ? "Configurável" : "Simples"}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-brand-muted-foreground">
                          {productCategory?.name ?? "Sem categoria"}
                        </p>

                        <p className="mt-2 text-sm font-bold text-brand-primary">
                          {catalogConfiguration.pricingMode === "variant" && (
                            <span className="mr-1 text-[10px] font-semibold text-brand-muted-foreground">
                              A partir de
                            </span>
                          )}
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(startingPrice)}
                        </p>
                        <p className="mt-1 text-[10px] font-semibold text-[#A3948D]">
                          Clique na foto para editar e enquadrar
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <ConfigurableProductDialog
                        productId={product.id}
                        productName={product.name}
                        configuration={catalogConfiguration}
                        setPricingModeAction={setCatalogPricingMode}
                        saveVariantAction={saveProductVariant}
                        removeVariantAction={removeProductVariant}
                        reorderVariantAction={reorderProductVariant}
                        saveGroupAction={saveProductOptionGroup}
                        removeGroupAction={removeProductOptionGroup}
                        reorderGroupAction={reorderProductOptionGroup}
                        saveOptionAction={saveProductOption}
                        removeOptionAction={removeProductOption}
                        reorderOptionAction={reorderProductOption}
                      />

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          product.available
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {product.available ? "Disponível" : "Esgotado"}
                      </span>

                      <form action={toggleProductAvailability}>
                        <input type="hidden" name="id" value={product.id} />
                        <input
                          type="hidden"
                          name="available"
                          value={String(product.available)}
                        />

                        <button
                          type="submit"
                          className="rounded-lg border border-brand-border px-3 py-2 text-xs font-bold text-brand-primary"
                        >
                          {product.available
                            ? "Marcar esgotado"
                            : "Marcar disponível"}
                        </button>
                      </form>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          product.active
                            ? "bg-blue-100 text-blue-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {product.active ? "Ativo" : "Inativo"}
                      </span>

                      <form action={toggleProductStatus}>
                        <input type="hidden" name="id" value={product.id} />
                        <input
                          type="hidden"
                          name="active"
                          value={String(product.active)}
                        />

                        <button
                          type="submit"
                          className="rounded-lg border border-brand-border px-3 py-2 text-xs font-bold text-brand-primary"
                        >
                          {product.active ? "Desativar" : "Ativar"}
                        </button>
                      </form>

                      <div className="mx-1 hidden h-6 w-px bg-brand-border sm:block" />

                      <form action={moveProduct}>
                        <input
                          type="hidden"
                          name="id"
                          value={product.id}
                        />
                        <input
                          type="hidden"
                          name="direction"
                          value="up"
                        />

                        <button
                          type="submit"
                          title="Mover produto para cima"
                          aria-label={`Mover ${product.name} para cima`}
                          disabled={firstProduct}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-brand-border text-brand-primary transition hover:border-brand-secondary disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <ArrowUp size={15} />
                        </button>
                      </form>

                      <form action={moveProduct}>
                        <input
                          type="hidden"
                          name="id"
                          value={product.id}
                        />
                        <input
                          type="hidden"
                          name="direction"
                          value="down"
                        />

                        <button
                          type="submit"
                          title="Mover produto para baixo"
                          aria-label={`Mover ${product.name} para baixo`}
                          disabled={lastProduct}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-brand-border text-brand-primary transition hover:border-brand-secondary disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <ArrowDown size={15} />
                        </button>
                      </form>

                      <DeleteProductDialog
                        id={product.id}
                        name={product.name}
                        deleteAction={deleteProduct}
                      />
                    </div>
                  </article>
                      );
                    })}
                </ProductCategorySection>
              ))}
            </div>
          ) : (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary">
                <Package size={28} />
              </div>

              <h3 className="mt-5 text-xl font-bold text-brand-foreground">
                Nenhum produto cadastrado
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-brand-muted-foreground">
                Quando os produtos da {installation.identity.shortName} forem cadastrados, eles
                aparecerão aqui para edição e controle de disponibilidade.
              </p>

              <div className="mt-6 flex justify-center">
                <NewProductDialog
                  categories={activeCategories}
                  createAction={createProduct}
                />
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
