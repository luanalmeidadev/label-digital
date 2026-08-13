import Header from "@/components/store/Header";
import Hero from "@/components/store/Hero";
import CategoryGrid from "@/components/store/CategoryGrid";
import MenuSections from "@/components/store/MenuSections";
import PreorderBanner from "@/components/store/PreorderBanner";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import CartProvider from "@/components/store/CartProvider";
import CartUI from "@/components/store/CartUI";

export default async function Home() {
  const supabase = await createSupabaseServerClient();

  const { data: categories, error: categoriesError } =
    await supabase
      .from("categories")
      .select("id, name, slug")
      .eq("active", true)
      .order("sort_order");

  if (categoriesError) {
    throw new Error(
      "Não foi possível carregar as categorias."
    );
  }

  const { data: products, error: productsError } =
    await supabase
      .from("products")
      .select(`
        id,
        category_id,
        name,
        description,
        price,
        image_url,
        product_type,
        available,
        featured
      `)
      .eq("active", true)
      .order("sort_order");

  if (productsError) {
    throw new Error(
      "Não foi possível carregar os produtos."
    );
  }

  return (
  <CartProvider>
    <main className="min-h-screen bg-[#FFFDF9]">
      <Header />
      <Hero />

      <div className="mx-auto max-w-6xl px-5">
        <CategoryGrid
          categories={categories ?? []}
        />

        <MenuSections
          categories={categories ?? []}
          products={products ?? []}
        />

        <PreorderBanner />
      </div>

      <CartUI />
      
    </main>
  </CartProvider>
);
}