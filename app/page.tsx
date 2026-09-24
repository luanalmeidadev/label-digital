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

import { getPublicInstallationProfile } from "@/config/installation/public";
import { buildStoreSchemaOrg } from "@/lib/installation-presentation";
import { applyPromotionsToCatalog, getFoodCatalogConfigurations } from "@/lib/food-catalog/repository";
import type { FoodCatalogConfiguration } from "@/lib/food-catalog/types";
import { createSupabasePublicServerClient } from "@/lib/supabase/public-server";
import { getImageDisplaySettings } from "@/lib/image-display-settings-store";
import {
  buildInstagramUrl,
  normalizeInstagramHandle,
} from "@/lib/instagram";
import { getPublicStoreSettings } from "@/lib/public-store-settings";
import { getSiteUrl } from "@/lib/site-url";

export default async function Home() {
  const installation = getPublicInstallationProfile();
  const supabase =
    createSupabasePublicServerClient();

  const [
    categoriesResult,
    productsResult,
    promotionsResult,
    imageSettings,
    storeSettings,
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, slug")
      .eq("active", true)
      .order("sort_order")
      .order("id"),

    supabase.rpc("resolve_catalog_promotions", { p_timezone: "America/Sao_Paulo" })
      .then(res => {
        const promoIds = res.data?.map((p: { product_id: string }) => p.product_id) || [];
        const uniquePromoIds = Array.from(new Set(promoIds));
        const q = supabase
          .from("products")
          .select(`
            id,
            category_id,
            name,
            description,
            price,
            catalog_version,
            pricing_mode,
            image_url,
            image_position_x,
            image_position_y,
            product_type,
            available,
            featured,
            active
          `)
          .order("sort_order")
          .order("id");

        if (uniquePromoIds.length > 0) {
          return q.or(`active.eq.true,id.in.(${uniquePromoIds.join(",")})`);
        }
        return q.eq("active", true);
      }),
    supabase.rpc("resolve_catalog_promotions", { p_timezone: "America/Sao_Paulo" }),
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

  let catalogConfigurations: Record<string, FoodCatalogConfiguration> = {};
  let catalogConfigurationsLoaded = true;

  if (!productsResult.error && productsResult.data?.length) {
    try {
      const promoProductIds = promotionsResult.data?.map((p: { product_id: string }) => p.product_id) || [];
      const promoVariantIds = promotionsResult.data?.map((p: { variant_id: string | null }) => p.variant_id).filter(Boolean) as string[] || [];
      catalogConfigurations = await getFoodCatalogConfigurations(
        supabase,
        productsResult.data.map((product) => product.id),
        { publicOnly: true, promoProductIds, promoVariantIds }
      );
    } catch (error) {
      catalogConfigurationsLoaded = false;
      console.error("Erro ao carregar configurações do catálogo:", error);
    }
  }

  const products = (productsResult.data ?? []).map((product) => ({
    ...product,
    configuration:
      catalogConfigurations[product.id] ??
      ({
        pricingMode: product.pricing_mode ?? "simple",
        variants: [],
        optionGroups: [],
      } satisfies FoodCatalogConfiguration),
    observedEventId: null as string | null,
    promotionalBaseUnitPrice: null as number | null,
    effectiveBaseUnitPrice: Number(product.price),
    effectiveAvailable: product.available,
  }));

  if (!productsResult.error && products.length) {
    try {
      await applyPromotionsToCatalog(
        supabase,
        products.map((p) => ({
          id: p.id,
          price: Number(p.price),
          available: p.available,
          pricingMode: p.pricing_mode,
          ref: p,
        })),
        catalogConfigurations
      );
    } catch (error) {
      console.error("Erro ao resolver promoções do catálogo:", error);
    }
  }

  const productsWithZoom = products.map((product) => ({
    ...product,
    image_zoom:
      imageSettings.dailyProductZoom[product.id] ?? 100,
  }));

  const hasLoadError =
    Boolean(categoriesResult.error) ||
    Boolean(productsResult.error);
  const instagramHandle = normalizeInstagramHandle(
    storeSettings.instagram
  );
  const instagramUrl = buildInstagramUrl(storeSettings.instagram);
  const siteUrl = getSiteUrl();
  const jsonLd = buildStoreSchemaOrg({
    installation,
    siteUrl,
    storeName: storeSettings.storeName,
    whatsapp: storeSettings.whatsapp,
    address: storeSettings.address,
    deliveryCities: storeSettings.deliveryCities,
    businessHours: storeSettings.businessHours,
    instagramUrl,
  });

  return (
    <CartProvider
      catalogProducts={
        productsResult.error || !catalogConfigurationsLoaded
          ? undefined
          : productsWithZoom.map((product) => ({
              id: product.id,
              name: product.name,
              price: Number(product.price),
              image_url: product.image_url,
              catalogVersion: Number(product.catalog_version),
              available: product.available,
              configuration: product.configuration,
              observedEventId: product.observedEventId ?? null,
              promotionalBaseUnitPrice: product.promotionalBaseUnitPrice,
              effectiveBaseUnitPrice: product.effectiveBaseUnitPrice ?? Number(product.price),
              effectiveAvailable: product.effectiveAvailable ?? product.available,
            }))
      }
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <StoreRealtimeRefresh />
      <main className="min-h-screen bg-brand-background">
        <Header storeName={installation.identity.name} logoUrl={installation.identity.assets.logos.onPrimary} />
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
                entre em contato com a {installation.identity.shortName}.
              </p>
            </div>
          )}

          <CategoryGrid
            categories={categories}
          />

          <MenuSections
            categories={categories}
            products={productsWithZoom}
          />

          <PreorderBanner />
        </div>

        <footer className="mt-16 bg-brand-foreground text-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-9 sm:flex-row sm:items-center sm:justify-between">
            <BrandLogo variant="footer" storeName={installation.identity.name} logoUrl={installation.identity.assets.logos.onPrimary} />
            <div className="flex flex-col gap-3 text-sm text-white/75 sm:flex-row sm:items-center sm:gap-6">
              {instagramHandle && instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="transition hover:text-brand-secondary"
                >
                  {instagramHandle}
                </a>
              )}
              <Link
                href={installation.legal.privacyNoticePath}
                className="transition hover:text-brand-secondary"
              >
                Privacidade
              </Link>
            </div>
          </div>
        </footer>

        <CartUI
          storeSettings={{
            storeName: storeSettings.storeName,
            storeShortName: installation.identity.shortName,
            locale: installation.regionalization.locale,
            whatsapp: storeSettings.whatsapp,
            pickupEnabled: storeSettings.pickupEnabled,
            deliveryEnabled: storeSettings.deliveryEnabled,
            pickupAddress: storeSettings.pickupAddress,
            address: storeSettings.address,
            deliveryCities: storeSettings.deliveryCities,
            deliveryZones: storeSettings.deliveryZones,
            businessHours: storeSettings.businessHours,
            isDemo: Boolean(storeSettings.isDemo),
          }}
        />
      </main>
    </CartProvider>
  );
}
