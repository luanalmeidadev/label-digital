import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  deleteCatalogOption,
  deleteCatalogOptionGroup,
  deleteCatalogVariant,
  moveCatalogOption,
  moveCatalogVariant,
  saveCatalogOption,
  saveCatalogOptionGroup,
  saveCatalogVariant,
  updateCatalogPricingMode,
} from "@/lib/food-catalog/admin-repository";
import { getConfiguredFoodCatalogProduct } from "@/lib/food-catalog/repository";

const localSupabaseUrl = process.env.LOCAL_SUPABASE_URL;
const localServiceRoleKey = process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;
const runLocalIntegration = Boolean(
  localSupabaseUrl && localServiceRoleKey
);
const testSupabaseUrl = localSupabaseUrl ?? "http://127.0.0.1:54321";
const testServiceRoleKey =
  localServiceRoleKey ?? "local-integration-disabled";

const ids = {
  product: "50000000-0000-4000-8000-000000000001",
  order: "50000000-0000-4000-8000-000000000002",
  orderItem: "50000000-0000-4000-8000-000000000003",
  orderOption: "50000000-0000-4000-8000-000000000004",
};

const testSuite = runLocalIntegration ? describe : describe.skip;

testSuite("admin do food catalog no Supabase local", () => {
  const supabase = createClient(testSupabaseUrl, testServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let smallVariantId = "";
  let largeVariantId = "";
  let groupId = "";
  let cheddarId = "";
  let baconId = "";

  beforeAll(async () => {
    await supabase.from("orders").delete().eq("id", ids.order);
    await supabase.from("products").delete().eq("id", ids.product);

    const created = await supabase.from("products").insert({
      id: ids.product,
      name: "X-Bacon Admin Local",
      price: 24,
    });
    expect(created.error).toBeNull();
  });

  afterAll(async () => {
    await supabase.from("orders").delete().eq("id", ids.order);
    await supabase.from("products").delete().eq("id", ids.product);
  });

  it("mantém produto legado simples sem recadastro", async () => {
    const product = await getConfiguredFoodCatalogProduct(
      supabase,
      ids.product
    );

    expect(product).toMatchObject({
      price: 24,
      pricingMode: "simple",
      variants: [],
      optionGroups: [],
    });
  });

  it("cria, edita, disponibiliza e ordena variantes", async () => {
    smallVariantId = await saveCatalogVariant(supabase, {
      productId: ids.product,
      variantId: null,
      name: "Pequeno",
      price: 24,
      active: true,
      available: true,
    });
    largeVariantId = await saveCatalogVariant(supabase, {
      productId: ids.product,
      variantId: null,
      name: "Grande",
      price: 30,
      active: true,
      available: true,
    });

    await updateCatalogPricingMode(supabase, ids.product, "variant");
    await moveCatalogVariant(
      supabase,
      ids.product,
      largeVariantId,
      "up"
    );
    await saveCatalogVariant(supabase, {
      productId: ids.product,
      variantId: largeVariantId,
      name: "Grande",
      price: 31,
      active: true,
      available: false,
    });

    const product = await getConfiguredFoodCatalogProduct(
      supabase,
      ids.product
    );
    expect(product?.pricingMode).toBe("variant");
    expect(product?.variants.map((variant) => variant.name)).toEqual([
      "Grande",
      "Pequeno",
    ]);
    expect(product?.variants[0]).toMatchObject({
      price: 31,
      available: false,
    });
  });

  it("cria grupo, limites e adicionais pagos", async () => {
    groupId = await saveCatalogOptionGroup(supabase, {
      productId: ids.product,
      optionGroupId: null,
      name: "Adicionais",
      selectionMode: "multiple",
      minSelections: 0,
      maxSelections: 2,
      presentationMode: "addition",
      active: true,
    });
    cheddarId = await saveCatalogOption(supabase, {
      productId: ids.product,
      optionGroupId: groupId,
      optionId: null,
      name: "Cheddar",
      priceDelta: 4,
      active: true,
      available: true,
    });
    baconId = await saveCatalogOption(supabase, {
      productId: ids.product,
      optionGroupId: groupId,
      optionId: null,
      name: "Bacon",
      priceDelta: 5,
      active: true,
      available: true,
    });
    await moveCatalogOption(
      supabase,
      ids.product,
      groupId,
      baconId,
      "up"
    );
    await saveCatalogOptionGroup(supabase, {
      productId: ids.product,
      optionGroupId: groupId,
      name: "Adicionais",
      selectionMode: "multiple",
      minSelections: 1,
      maxSelections: 2,
      presentationMode: "addition",
      active: true,
    });
    await expect(
      saveCatalogOptionGroup(supabase, {
        productId: ids.product,
        optionGroupId: groupId,
        name: "Adicionais",
        selectionMode: "multiple",
        minSelections: 3,
        maxSelections: 3,
        presentationMode: "addition",
        active: true,
      })
    ).rejects.toThrow("opções ativas e disponíveis suficientes");
    await saveCatalogOption(supabase, {
      productId: ids.product,
      optionGroupId: groupId,
      optionId: cheddarId,
      name: "Cheddar",
      priceDelta: 4,
      active: true,
      available: false,
    });
    await saveCatalogOption(supabase, {
      productId: ids.product,
      optionGroupId: groupId,
      optionId: cheddarId,
      name: "Cheddar",
      priceDelta: 4,
      active: true,
      available: true,
    });

    const product = await getConfiguredFoodCatalogProduct(
      supabase,
      ids.product
    );
    expect(product?.optionGroups[0]).toMatchObject({
      minSelections: 1,
      maxSelections: 2,
    });
    expect(product?.optionGroups[0].options.map((option) => option.name)).toEqual(
      ["Bacon", "Cheddar"]
    );
    expect(product?.optionGroups[0].options[0].priceDelta).toBe(5);
  });

  it("remove catálogo sem quebrar snapshots históricos", async () => {
    const order = await supabase.from("orders").insert({
      id: ids.order,
      order_type: "pickup",
      subtotal: 28,
      total: 28,
    });
    expect(order.error).toBeNull();

    const item = await supabase.from("order_items").insert({
      id: ids.orderItem,
      order_id: ids.order,
      product_id: ids.product,
      product_name: "X-Bacon Admin Local",
      variant_id: smallVariantId,
      variant_name: "Pequeno",
      quantity: 1,
      base_unit_price: 24,
      options_unit_price: 4,
      unit_price: 28,
    });
    expect(item.error).toBeNull();

    const snapshot = await supabase.from("order_item_options").insert({
      id: ids.orderOption,
      order_item_id: ids.orderItem,
      option_group_id: groupId,
      option_id: cheddarId,
      group_name: "Adicionais",
      option_name: "Cheddar",
      presentation_mode: "addition",
      price_delta: 4,
      group_sort_order: 0,
      option_sort_order: 1,
    });
    expect(snapshot.error).toBeNull();

    await deleteCatalogOption(
      supabase,
      ids.product,
      groupId,
      cheddarId
    );
    await expect(
      deleteCatalogVariant(supabase, ids.product, smallVariantId)
    ).rejects.toThrow("ao menos uma variante ativa e disponível");
    await saveCatalogVariant(supabase, {
      productId: ids.product,
      variantId: largeVariantId,
      name: "Grande",
      price: 31,
      active: true,
      available: true,
    });
    await deleteCatalogVariant(supabase, ids.product, smallVariantId);
    await deleteCatalogOptionGroup(supabase, ids.product, groupId);

    const { data: storedItem } = await supabase
      .from("order_items")
      .select("variant_id, variant_name")
      .eq("id", ids.orderItem)
      .single();
    const { data: storedOption } = await supabase
      .from("order_item_options")
      .select("option_id, option_group_id, option_name, price_delta")
      .eq("id", ids.orderOption)
      .single();

    expect(storedItem).toEqual({ variant_id: null, variant_name: "Pequeno" });
    expect(storedOption).toEqual({
      option_id: null,
      option_group_id: null,
      option_name: "Cheddar",
      price_delta: 4,
    });

    await updateCatalogPricingMode(supabase, ids.product, "simple");
    await deleteCatalogVariant(supabase, ids.product, largeVariantId);
    expect(baconId).toBeTruthy();
  });
});
