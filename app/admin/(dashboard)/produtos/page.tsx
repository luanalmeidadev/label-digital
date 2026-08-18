import { ArrowDown, ArrowUp, Package } from "lucide-react";

import DeleteProductDialog from "@/components/admin/DeleteProductDialog";
import EditProductDialog from "@/components/admin/EditProductDialog";
import NewProductDialog from "@/components/admin/NewProductDialog";
import ProductCategorySection from "@/components/admin/ProductCategorySection";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getImageDisplaySettings } from "@/lib/image-display-settings-store";

import {
  createProduct,
  deleteProduct,
  moveProduct,
  toggleProductAvailability,
  toggleProductStatus,
  updateProduct,
} from "./actions";

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
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8B0000]">
              Catálogo
            </p>

            <h1 className="mt-2 text-3xl font-bold text-[#241B19]">
              Produtos
            </h1>

            <p className="mt-2 text-sm text-[#756A66]">
              Cadastre e gerencie os produtos disponíveis no cardápio da
              La&apos;bel.
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
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#8B0000] text-white shadow-sm">
                <Package size={22} />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8B0000]">
                  Visão do catálogo
                </p>

                <h2 className="mt-1 text-lg font-bold text-[#241B19]">
                  Produtos cadastrados
                </h2>

                <p className="mt-1 text-xs text-[#756A66]">
                  Organize a exibição dos itens no administrativo e no cardápio.
                </p>
              </div>
            </div>

            <div className="flex gap-2 sm:justify-end">
              <span className="rounded-full border border-[#E7D8CC] bg-white px-4 py-2 text-xs font-bold text-[#8B0000] shadow-sm">
                {products?.length ?? 0} produto(s)
              </span>

              <span className="rounded-full border border-[#E7D8CC] bg-white px-4 py-2 text-xs font-bold text-[#756A66] shadow-sm">
                {productGroups.length} categoria(s)
              </span>
            </div>
          </div>
        </section>

        <section className="mt-4 overflow-hidden rounded-3xl border border-[#EEE6DF] bg-white shadow-sm">

          {products && products.length > 0 ? (
            <div className="divide-y divide-[#EEE6DF]">
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
                          <h3 className="font-bold text-[#241B19]">
                            {product.name}
                          </h3>

                          {product.featured && (
                            <span className="rounded-full bg-[#D2B48C]/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#8B0000]">
                              Destaque
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-sm text-[#756A66]">
                          {productCategory?.name ?? "Sem categoria"}
                        </p>

                        <p className="mt-2 text-sm font-bold text-[#8B0000]">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(Number(product.price))}
                        </p>
                        <p className="mt-1 text-[10px] font-semibold text-[#A3948D]">
                          Clique na foto para editar e enquadrar
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
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
                          className="rounded-lg border border-[#EEE6DF] px-3 py-2 text-xs font-bold text-[#8B0000]"
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
                          className="rounded-lg border border-[#EEE6DF] px-3 py-2 text-xs font-bold text-[#8B0000]"
                        >
                          {product.active ? "Desativar" : "Ativar"}
                        </button>
                      </form>

                      <div className="mx-1 hidden h-6 w-px bg-[#EEE6DF] sm:block" />

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
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#EEE6DF] text-[#8B0000] transition hover:border-[#D2B48C] disabled:cursor-not-allowed disabled:opacity-30"
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
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#EEE6DF] text-[#8B0000] transition hover:border-[#D2B48C] disabled:cursor-not-allowed disabled:opacity-30"
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
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#8B0000]/10 text-[#8B0000]">
                <Package size={28} />
              </div>

              <h3 className="mt-5 text-xl font-bold text-[#241B19]">
                Nenhum produto cadastrado
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#756A66]">
                Quando os produtos da La&apos;bel forem cadastrados, eles
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
