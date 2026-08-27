import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { priceConfiguredCatalogItem } from "@/lib/food-catalog/pricing";
import { createFoodCatalogProductRepository } from "@/lib/food-catalog/repository";
import {
  demoBurgerCatalog,
  demoBurgerIds,
} from "../../scripts/demo-burger-catalog.mjs";

const localUrl = process.env.LOCAL_SUPABASE_URL;
const localServiceKey = process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;
const localAnonKey = process.env.LOCAL_SUPABASE_ANON_KEY;
const suite = localUrl && localServiceKey && localAnonKey ? describe : describe.skip;

suite("demo comercial Brasa Burger no Supabase local", () => {
  it("publica as quatro categorias e cinco produtos do manifesto", async () => {
    const anonymous = createClient(localUrl!, localAnonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const categories = await anonymous
      .from("categories")
      .select("id, name")
      .in("id", demoBurgerCatalog.categories.map((category) => category.id));
    const products = await anonymous
      .from("products")
      .select("id, name, pricing_mode, image_url")
      .in("id", demoBurgerCatalog.products.map((product) => product.id));

    expect(categories.error).toBeNull();
    expect(products.error).toBeNull();
    expect(categories.data).toHaveLength(4);
    expect(products.data).toHaveLength(5);
    expect(products.data?.every((product) => product.image_url?.startsWith("/demo-burger/"))).toBe(true);
  });

  it("reconstrói no servidor o X-Bacon Duplo com Cheddar e Bacon", async () => {
    const service = createClient(localUrl!, localServiceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const repository = createFoodCatalogProductRepository(service);
    const priced = await priceConfiguredCatalogItem(repository, {
      productId: demoBurgerIds.products.xBacon,
      variantId: demoBurgerIds.variants.xBaconDouble,
      optionIds: [
        demoBurgerIds.options.medium,
        demoBurgerIds.options.cheddar,
        demoBurgerIds.options.bacon,
      ],
      itemNotes: "Sem cebola",
      quantity: 1,
    });

    expect(priced).toMatchObject({
      productName: "X-Bacon",
      variantName: "Duplo",
      baseUnitPrice: 36,
      optionsUnitPrice: 9,
      unitPrice: 45,
      itemNotes: "Sem cebola",
    });
  });

  it("mantém snapshots fictícios para pedidos, relatórios e perdas", async () => {
    const service = createClient(localUrl!, localServiceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const items = await service
      .from("order_items")
      .select("product_name, variant_name, unit_price, item_notes, order_item_options(option_name)")
      .in("order_id", [demoBurgerIds.onlineOrder, demoBurgerIds.cashierOrder]);
    const losses = await service
      .from("product_losses")
      .select("product_name, variant_name, estimated_value")
      .eq("id", demoBurgerIds.loss)
      .single();

    expect(items.error).toBeNull();
    expect(items.data).toHaveLength(3);
    expect(items.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          product_name: "X-Bacon",
          variant_name: "Duplo",
          unit_price: 45,
          item_notes: "Sem cebola",
        }),
        expect.objectContaining({ product_name: "X-Burger", variant_name: null }),
      ])
    );
    expect(losses.data).toMatchObject({
      product_name: "Batata Frita",
      variant_name: "M",
      estimated_value: 15,
    });
  });
});
