import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = createSupabaseServerClient();

  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, name, slug, sort_order")
    .eq("active", true)
    .order("sort_order");

  if (error) {
    return (
      <main className="p-10">
        <h1 className="text-2xl font-bold text-red-700">
          Erro ao conectar com o Supabase
        </h1>

        <pre className="mt-4 whitespace-pre-wrap">
          {error.message}
        </pre>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFFDF9] p-10">
      <h1 className="text-3xl font-bold text-[#8B0000]">
        La&apos;bel Digital
      </h1>

      <p className="mt-2 text-[#756A66]">
        Conexão com o Supabase funcionando.
      </p>

      <div className="mt-8">
        <h2 className="text-xl font-bold">
          Categorias cadastradas
        </h2>

        <div className="mt-4 space-y-3">
          {categories?.map((category) => (
            <div
              key={category.id}
              className="rounded-xl border bg-white p-4"
            >
              {category.name}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}