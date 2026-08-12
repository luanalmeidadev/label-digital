import { Plus, Tags } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import EditCategoryDialog from "@/components/admin/EditCategoryDialog";
import {
  createCategory,
  updateCategory,
  toggleCategoryStatus,
} from "./actions";

export default async function CategoriasPage() {
  const supabase = await createSupabaseServerClient();

  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, name, slug, active, sort_order")
    .order("sort_order");

  if (error) {
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
              Categorias
            </h1>

            <p className="mt-2 text-sm text-[#756A66]">
              Organize as categorias exibidas no cardápio digital.
            </p>
          </div>

          <form
  action={createCategory}
  className="flex w-full gap-2 sm:w-auto"
>
  <input
    type="text"
    name="name"
    required
    minLength={2}
    maxLength={50}
    placeholder="Nome da categoria"
    className="min-w-0 flex-1 rounded-xl border border-[#DDD3CB] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#8B0000] sm:w-56"
  />

  <button
    type="submit"
    className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#8B0000] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#700000]"
  >
    <Plus size={18} />
    Adicionar
  </button>
</form>
        </div>

        <section className="mt-8 overflow-hidden rounded-3xl border border-[#EEE6DF] bg-white shadow-sm">
          <div className="border-b border-[#EEE6DF] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B0000]/10 text-[#8B0000]">
                <Tags size={20} />
              </div>

              <div>
                <h2 className="font-bold text-[#241B19]">
                  Categorias cadastradas
                </h2>

                <p className="text-xs text-[#756A66]">
                  {categories?.length ?? 0} categoria(s)
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-[#EEE6DF]">
            {categories?.map((category) => (
              <div
                key={category.id}
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF7F5] text-sm font-bold text-[#8B0000]">
                    {category.sort_order}
                  </div>

                  <div>
                    <p className="font-bold text-[#241B19]">
                      {category.name}
                    </p>

                    <p className="mt-1 text-xs text-[#756A66]">
                      /{category.slug}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      category.active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {category.active ? "Ativa" : "Inativa"}
                  </span>

                  <form action={toggleCategoryStatus}>
                    <input type="hidden" name="id" value={category.id} />

                    <input
                      type="hidden"
                      name="active"
                      value={String(category.active)}
                    />

                    <button
                      type="submit"
                      className="rounded-lg border border-[#EEE6DF] px-3 py-2 text-xs font-bold text-[#8B0000] transition hover:border-[#D2B48C]"
                    >
                      {category.active ? "Desativar" : "Ativar"}
                    </button>
                  </form>

                  <EditCategoryDialog
                    id={category.id}
                    name={category.name}
                    updateAction={updateCategory}
                  />
                </div>
              </div>
            ))}

            {categories?.length === 0 && (
              <div className="p-10 text-center">
                <Tags
                  size={36}
                  className="mx-auto text-[#D2B48C]"
                />

                <p className="mt-4 font-bold text-[#241B19]">
                  Nenhuma categoria cadastrada
                </p>

                <p className="mt-2 text-sm text-[#756A66]">
                  Crie a primeira categoria para começar a organizar o cardápio.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}