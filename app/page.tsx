import Link from "next/link";

import BrandLogo from "@/components/brand/BrandLogo";
import Header from "@/components/store/Header";
import Hero from "@/components/store/Hero";
import CategoryGrid from "@/components/store/CategoryGrid";
import MenuSections from "@/components/store/MenuSections";
import PreorderBanner from "@/components/store/PreorderBanner";
import CartProvider from "@/components/store/CartProvider";
import CartUI from "@/components/store/CartUI";
import StoreRealtimeRefresh from "@/components/store/StoreRealtimeRefresh";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getImageDisplaySettings } from "@/lib/image-display-settings-store";
import {
  buildInstagramUrl,
  normalizeInstagramHandle,
} from "@/lib/instagram";
import { getPublicStoreSettings } from "@/lib/public-store-settings";

export default async function Home() {
  const supabase =
    await createSupabaseServerClient();

  const [
    categoriesResult,
    productsResult,
    imageSettings,
    storeSettings,
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
    getImageDisplaySettings(),
    getPublicStoreSettings(),
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
  const instagramHandle = normalizeInstagramHandle(
    storeSettings.instagram
  );
  const instagramUrl = buildInstagramUrl(storeSettings.instagram);

  return (
    <CartProvider
      catalogProducts={
        productsResult.error
          ? undefined
          : products.map((product) => ({
              id: product.id,
              name: product.name,
              price: Number(product.price),
              image_url: product.image_url,
              available: product.available,
            }))
      }
    >
      <StoreRealtimeRefresh />
      <main className="min-h-screen bg-[#FFFDF9]">
        <Header />
        <Hero
          storeName={storeSettings.storeName}
          businessHours={storeSettings.businessHours}
          pickupEnabled={storeSettings.pickupEnabled}
          deliveryEnabled={storeSettings.deliveryEnabled}
        />

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

        <footer className="mt-16 bg-[#241B19] text-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-9 sm:flex-row sm:items-center sm:justify-between">
            <BrandLogo variant="footer" />
            <div className="flex flex-col gap-3 text-sm text-white/75 sm:flex-row sm:items-center sm:gap-6">
              {instagramHandle && instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="transition hover:text-[#D2B48C]"
                >
                  {instagramHandle}
                </a>
              )}
              <Link
                href="/privacidade"
                className="transition hover:text-[#D2B48C]"
              >
                Privacidade
              </Link>
            </div>
          </div>
        </footer>

        <CartUI
          storeSettings={{
            whatsapp: storeSettings.whatsapp,
            pickupEnabled: storeSettings.pickupEnabled,
            deliveryEnabled: storeSettings.deliveryEnabled,
            pickupAddress: storeSettings.pickupAddress,
            deliveryCities: storeSettings.deliveryCities,
          }}
        />
      </main>
    </CartProvider>
  );
}
