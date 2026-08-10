import Header from "@/components/store/Header";
import Hero from "@/components/store/Hero";
import CategoryGrid from "@/components/store/CategoryGrid";
import EmptyProducts from "@/components/store/EmptyProducts";
import PreorderBanner from "@/components/store/PreorderBanner";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = createSupabaseServerClient();

  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("active", true)
    .order("sort_order");

  if (error) {
    throw new Error("Não foi possível carregar as categorias.");
  }

  return (
    <main className="min-h-screen bg-[#FFFDF9]">
      <Header />
      <Hero />

      <div className="mx-auto max-w-6xl px-5">
        <CategoryGrid categories={categories ?? []} />
        <EmptyProducts />
        <PreorderBanner />
      </div>
    </main>
  );
}