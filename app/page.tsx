import Header from "@/components/store/Header";
import Hero from "@/components/store/Hero";
import CategoryGrid from "@/components/store/CategoryGrid";
import MenuSections from "@/components/store/MenuSections";
import PreorderBanner from "@/components/store/PreorderBanner";
import CartProvider from "@/components/store/CartProvider";
import CartUI from "@/components/store/CartUI";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getImageDisplaySettings } from "@/lib/image-display-settings-store";

export default async function Home() {
  const supabase =
    await createSupabaseServerClient();

  const [
    categoriesResult,
    productsResult,
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, slug")
      .eq("active", true)
      .order("sort_order"),

    supabase
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
        product_type,
        available,
        featured
      `)
      .eq("active", true)
      .order("sort_order"),
  ]);

  if (categoriesResult.error) {
    console.error(
      "Erro ao carregar categorias:",
      categoriesResult.error
    );
  }

  if (productsResult.error) {
    console.error(
      "Erro ao carregar produtos:",
      productsResult.error
    );
  }

  const categories =
    categoriesResult.data ?? [];

  const imageSettings =
    await getImageDisplaySettings();
  const products = (productsResult.data ?? []).map(
    (product) => ({
      ...product,
      image_zoom:
        imageSettings.dailyProductZoom[
          product.id
        ] ?? 100,
    })
  );

  const hasLoadError =
    Boolean(categoriesResult.error) ||
    Boolean(productsResult.error);

  return (
    <CartProvider>
      <main className="min-h-screen bg-[#FFFDF9]">
        <Header />
        <Hero />

        <div className="mx-auto max-w-6xl px-5">
          {hasLoadError && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-800">
                Algumas informações do cardápio não puderam ser carregadas.
              </p>

              <p className="mt-1 text-xs leading-5 text-amber-700">
                Atualize a página em alguns instantes. Se o problema continuar,
                entre em contato com a La&apos;bel.
              </p>
            </div>
          )}

          <CategoryGrid
            categories={categories}
          />

          <MenuSections
            categories={categories}
            products={products}
          />

          <PreorderBanner />
        </div>

        <CartUI />
      </main>
    </CartProvider>
  );
}
