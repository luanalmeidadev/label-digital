import {
  ArrowDown,
  ArrowUp,
  Plus,
  Tags,
} from "lucide-react";

import EditCategoryDialog from "@/components/admin/EditCategoryDialog";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import DeleteCategoryDialog from "@/components/admin/DeleteCategoryDialog";

import {
  createCategory,
  deleteCategory,
  moveCategory,
  toggleCategoryStatus,
  updateCategory,
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
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-primary">
              Catálogo
            </p>

            <h1 className="mt-2 text-3xl font-bold text-brand-foreground">
              Categorias
            </h1>

            <p className="mt-2 text-sm text-brand-muted-foreground">
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
              className="min-w-0 flex-1 rounded-xl border border-[#DDD3CB] bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-primary sm:w-56"
            />

            <button
              type="submit"
              className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 py-3 text-sm font-bold text-brand-primary-foreground transition hover:bg-brand-primary-hover"
            >
              <Plus size={18} />
              Adicionar
            </button>
          </form>
        </div>

        <section className="mt-8 overflow-hidden rounded-3xl border border-brand-border bg-white shadow-sm">
          <div className="border-b border-brand-border p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                <Tags size={20} />
              </div>

              <div>
                <h2 className="font-bold text-brand-foreground">
                  Categorias cadastradas
                </h2>

                <p className="text-xs text-brand-muted-foreground">
                  {categories?.length ?? 0} categoria(s)
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-brand-border">
            {categories?.map((category, index) => {
              const firstCategory = index === 0;
              const lastCategory = index === categories.length - 1;

              return (
                <div
                  key={category.id}
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF7F5] text-sm font-bold text-brand-primary">
                      {category.sort_order}
                    </div>

                    <div>
                      <p className="font-bold text-brand-foreground">
                        {category.name}
                      </p>

                      <p className="mt-1 text-xs text-brand-muted-foreground">
                        /{category.slug}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
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
                      <input
                        type="hidden"
                        name="id"
                        value={category.id}
                      />

                      <input
                        type="hidden"
                        name="active"
                        value={String(category.active)}
                      />

                      <button
                        type="submit"
                        className="rounded-lg border border-brand-border px-3 py-2 text-xs font-bold text-brand-primary transition hover:border-brand-secondary"
                      >
                        {category.active ? "Desativar" : "Ativar"}
                      </button>
                    </form>

                    <EditCategoryDialog
                      id={category.id}
                      name={category.name}
                      updateAction={updateCategory}
                    />

                    <div className="mx-1 hidden h-6 w-px bg-brand-border sm:block" />

                    <form action={moveCategory}>
                      <input
                        type="hidden"
                        name="id"
                        value={category.id}
                      />

                      <input
                        type="hidden"
                        name="direction"
                        value="up"
                      />

                      <button
                        type="submit"
                        title="Mover para cima"
                        disabled={firstCategory}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-brand-border text-brand-primary transition hover:border-brand-secondary disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ArrowUp size={15} />
                      </button>
                    </form>

                    <form action={moveCategory}>
                      <input
                        type="hidden"
                        name="id"
                        value={category.id}
                      />

                      <input
                        type="hidden"
                        name="direction"
                        value="down"
                      />

                      <button
                        type="submit"
                        title="Mover para baixo"
                        disabled={lastCategory}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-brand-border text-brand-primary transition hover:border-brand-secondary disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <ArrowDown size={15} />
                      </button>
                    </form>

                    <DeleteCategoryDialog
                      id={category.id}
                      name={category.name}
                      deleteAction={deleteCategory}
                    />
                  </div>
                </div>
              );
            })}

            {categories?.length === 0 && (
              <div className="p-10 text-center">
                <Tags
                  size={36}
                  className="mx-auto text-brand-secondary"
                />

                <p className="mt-4 font-bold text-brand-foreground">
                  Nenhuma categoria cadastrada
                </p>

                <p className="mt-2 text-sm text-brand-muted-foreground">
                  Crie a primeira categoria para começar a organizar o
                  cardápio.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}