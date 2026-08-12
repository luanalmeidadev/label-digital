import { ImageIcon, Package } from "lucide-react";

import DeleteProductDialog from "@/components/admin/DeleteProductDialog";
import EditProductDialog from "@/components/admin/EditProductDialog";
import NewProductDialog from "@/components/admin/NewProductDialog";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  createProduct,
  deleteProduct,
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
      .select("id, name")
      .eq("active", true)
      .order("sort_order");

  if (categoriesError) {
    throw new Error("Não foi possível carregar as categorias.");
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
            categories={categories ?? []}
            createAction={createProduct}
          />
        </div>

        <section className="mt-8 overflow-hidden rounded-3xl border border-[#EEE6DF] bg-white shadow-sm">
          <div className="border-b border-[#EEE6DF] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B0000]/10 text-[#8B0000]">
                <Package size={20} />
              </div>

              <div>
                <h2 className="font-bold text-[#241B19]">
                  Produtos cadastrados
                </h2>

                <p className="text-xs text-[#756A66]">
                  {products?.length ?? 0} produto(s)
                </p>
              </div>
            </div>
          </div>

          {products && products.length > 0 ? (
            <div className="divide-y divide-[#EEE6DF]">
              {products.map((product) => {
                const productCategory = Array.isArray(product.categories)
                  ? product.categories[0]
                  : product.categories;

                return (
                  <article
                    key={product.id}
                    className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#EEE6DF] bg-[#FFF7F5]">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImageIcon size={24} className="text-[#D2B48C]" />
                        )}
                      </div>

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

                      <EditProductDialog
                        id={product.id}
                        name={product.name}
                        description={product.description}
                        price={Number(product.price)}
                        categoryId={product.category_id}
                        available={product.available}
                        featured={product.featured}
                        active={product.active}
                        categories={categories ?? []}
                        updateAction={updateProduct}
                        imageUrl={product.image_url}
                      />

                      <DeleteProductDialog
                        id={product.id}
                        name={product.name}
                        deleteAction={deleteProduct}
                      />
                    </div>
                  </article>
                );
              })}
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
                  categories={categories ?? []}
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