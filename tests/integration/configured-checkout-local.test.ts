import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { priceConfiguredCatalogItem } from "@/lib/food-catalog/pricing";
import { createFoodCatalogProductRepository } from "@/lib/food-catalog/repository";
import { buildPersistableOrderItemSnapshot } from "@/lib/food-catalog/snapshot";
import type { SelectedCatalogItemConfiguration } from "@/lib/food-catalog/types";

const localSupabaseUrl = process.env.LOCAL_SUPABASE_URL;
const localServiceRoleKey = process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;
const runLocalIntegration = Boolean(localSupabaseUrl && localServiceRoleKey);
const testSupabaseUrl = localSupabaseUrl ?? "http://127.0.0.1:54321";
const testServiceRoleKey =
  localServiceRoleKey ?? "local-integration-disabled";

const ids = {
  customer: "60000000-0000-4000-8000-000000000001",
  simpleProduct: "60000000-0000-4000-8000-000000000002",
  burger: "60000000-0000-4000-8000-000000000003",
  variant: "60000000-0000-4000-8000-000000000004",
  pointGroup: "60000000-0000-4000-8000-000000000005",
  additionsGroup: "60000000-0000-4000-8000-000000000006",
  mediumPoint: "60000000-0000-4000-8000-000000000007",
  cheddar: "60000000-0000-4000-8000-000000000008",
  bacon: "60000000-0000-4000-8000-000000000009",
};

const testSuite = runLocalIntegration ? describe : describe.skip;

testSuite("checkout configurável no Supabase local", () => {
  const supabase = createClient(testSupabaseUrl, testServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const anon = createClient(
    testSupabaseUrl,
    process.env.LOCAL_SUPABASE_ANON_KEY ?? "local-anon-disabled",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const repository = createFoodCatalogProductRepository(supabase);
  const createdOrderIds: string[] = [];

  async function snapshot(selection: SelectedCatalogItemConfiguration) {
    const priced = await priceConfiguredCatalogItem(repository, selection);
    const persistable = buildPersistableOrderItemSnapshot(priced);

    return {
      catalog_version: priced.catalogVersion,
      ...persistable.item,
      options: persistable.options,
    };
  }

  async function createOrder(items: unknown[], deliveryFee = 0) {
    const result = await supabase.rpc("create_online_order_atomic", {
      p_customer_id: ids.customer,
      p_address_id: null,
      p_order_type: "pickup",
      p_payment_method: "pix",
      p_cash_change_for: null,
      p_delivery_fee: deliveryFee,
      p_notes: "Teste local",
      p_items: items,
    });

    const row = Array.isArray(result.data) ? result.data[0] : null;
    if (row?.order_id) {
      createdOrderIds.push(row.order_id);
    }

    return { ...result, row };
  }

  beforeAll(async () => {
    await supabase.from("orders").delete().eq("customer_id", ids.customer);
    await supabase
      .from("products")
      .delete()
      .in("id", [ids.simpleProduct, ids.burger]);
    await supabase.from("customers").delete().eq("id", ids.customer);

    expect(
      (
        await supabase.from("customers").insert({
          id: ids.customer,
          first_name: "Cliente",
          last_name: "Local",
          phone: "48999990000",
        })
      ).error
    ).toBeNull();

    expect(
      (
        await supabase.from("products").insert({
          id: ids.simpleProduct,
          name: "Brownie simples",
          price: 12,
          pricing_mode: "simple",
        })
      ).error
    ).toBeNull();

    expect(
      (
        await supabase.from("products").insert({
          id: ids.burger,
          name: "X-Bacon",
          price: 0,
          pricing_mode: "variant",
        })
      ).error
    ).toBeNull();

    expect(
      (
        await supabase.from("product_variants").insert({
          id: ids.variant,
          product_id: ids.burger,
          name: "Tradicional",
          price: 20,
        })
      ).error
    ).toBeNull();

    expect(
      (
        await supabase.from("product_option_groups").insert([
          {
            id: ids.pointGroup,
            product_id: ids.burger,
            name: "Ponto da carne",
            selection_mode: "single",
            min_selections: 1,
            max_selections: 1,
            presentation_mode: "choice",
            sort_order: 0,
          },
          {
            id: ids.additionsGroup,
            product_id: ids.burger,
            name: "Adicionais",
            selection_mode: "multiple",
            min_selections: 0,
            max_selections: 2,
            presentation_mode: "addition",
            sort_order: 1,
          },
        ])
      ).error
    ).toBeNull();

    expect(
      (
        await supabase.from("product_options").insert([
          {
            id: ids.mediumPoint,
            option_group_id: ids.pointGroup,
            name: "Ao ponto",
            price_delta: 0,
            sort_order: 0,
          },
          {
            id: ids.cheddar,
            option_group_id: ids.additionsGroup,
            name: "Cheddar",
            price_delta: 4,
            sort_order: 0,
          },
          {
            id: ids.bacon,
            option_group_id: ids.additionsGroup,
            name: "Bacon",
            price_delta: 5,
            sort_order: 1,
          },
        ])
      ).error
    ).toBeNull();
  });

  afterAll(async () => {
    if (createdOrderIds.length) {
      await supabase.from("orders").delete().in("id", createdOrderIds);
    }
    await supabase
      .from("products")
      .delete()
      .in("id", [ids.simpleProduct, ids.burger]);
    await supabase.from("customers").delete().eq("id", ids.customer);
  });

  it("mantém pedido simples e calcula total com entrega no servidor", async () => {
    const simple = await snapshot({
      productId: ids.simpleProduct,
      quantity: 2,
    });
    const result = await createOrder([simple], 5);

    expect(result.error).toBeNull();
    expect(result.row).toMatchObject({ subtotal: 24, delivery_fee: 5, total: 29 });

    const item = await supabase
      .from("order_items")
      .select(
        "variant_id, variant_name, base_unit_price, options_unit_price, unit_price, quantity"
      )
      .eq("order_id", result.row.order_id)
      .single();

    expect(item.error).toBeNull();
    expect(item.data).toMatchObject({
      variant_id: null,
      variant_name: null,
      base_unit_price: 12,
      options_unit_price: 0,
      unit_price: 12,
      quantity: 2,
    });
  });

  it("persiste variante, opções pagas/gratuitas, observação e assinatura", async () => {
    const burger = await snapshot({
      productId: ids.burger,
      variantId: ids.variant,
      optionIds: [ids.mediumPoint, ids.cheddar, ids.bacon],
      itemNotes: "sem cebola",
      quantity: 2,
    });
    const result = await createOrder([burger]);

    expect(result.error).toBeNull();
    expect(result.row).toMatchObject({ subtotal: 58, total: 58 });

    const item = await supabase
      .from("order_items")
      .select(
        "id, product_name, variant_name, base_unit_price, options_unit_price, unit_price, item_notes, configuration_signature"
      )
      .eq("order_id", result.row.order_id)
      .single();

    expect(item.error).toBeNull();
    expect(item.data).toMatchObject({
      product_name: "X-Bacon",
      variant_name: "Tradicional",
      base_unit_price: 20,
      options_unit_price: 9,
      unit_price: 29,
      item_notes: "sem cebola",
    });
    expect(item.data?.configuration_signature).toMatch(/^[0-9a-f]{64}$/);

    const options = await supabase
      .from("order_item_options")
      .select("group_name, option_name, price_delta")
      .eq("order_item_id", item.data?.id)
      .order("group_sort_order")
      .order("option_sort_order");

    expect(options.error).toBeNull();
    expect(options.data).toEqual([
      { group_name: "Ponto da carne", option_name: "Ao ponto", price_delta: 0 },
      { group_name: "Adicionais", option_name: "Cheddar", price_delta: 4 },
      { group_name: "Adicionais", option_name: "Bacon", price_delta: 5 },
    ]);
  });

  it("rejeita preço manipulado e não deixa pedido parcial", async () => {
    const before = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", ids.customer);
    const valid = await snapshot({ productId: ids.simpleProduct, quantity: 1 });
    const manipulated = {
      ...valid,
      unit_price: 0.01,
      base_unit_price: 0.01,
    };
    const result = await createOrder([valid, manipulated]);
    const after = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", ids.customer);

    expect(result.error).not.toBeNull();
    expect(after.count).toBe(before.count);
  });

  it("rejeita snapshot quando preço ou disponibilidade mudou", async () => {
    const stalePrice = await snapshot({ productId: ids.simpleProduct, quantity: 1 });
    expect(
      (await supabase.from("products").update({ price: 13 }).eq("id", ids.simpleProduct))
        .error
    ).toBeNull();

    const priceResult = await createOrder([stalePrice]);
    expect(priceResult.error?.message).toContain("CATALOG_CHANGED:");

    const staleOption = await snapshot({
      productId: ids.burger,
      variantId: ids.variant,
      optionIds: [ids.mediumPoint, ids.cheddar],
      quantity: 1,
    });
    expect(
      (
        await supabase
          .from("product_options")
          .update({ available: false })
          .eq("id", ids.cheddar)
      ).error
    ).toBeNull();

    const optionResult = await createOrder([staleOption]);
    expect(optionResult.error?.message).toContain("CATALOG_CHANGED:");
    await supabase
      .from("product_options")
      .update({ available: true })
      .eq("id", ids.cheddar);
  });

  it("mantém snapshots após alterações posteriores no catálogo", async () => {
    const burger = await snapshot({
      productId: ids.burger,
      variantId: ids.variant,
      optionIds: [ids.mediumPoint, ids.bacon],
      quantity: 1,
    });
    const result = await createOrder([burger]);
    expect(result.error).toBeNull();

    await supabase
      .from("product_options")
      .update({ name: "Bacon atualizado", price_delta: 9 })
      .eq("id", ids.bacon);

    const item = await supabase
      .from("order_items")
      .select("id, unit_price")
      .eq("order_id", result.row.order_id)
      .single();
    const savedOption = await supabase
      .from("order_item_options")
      .select("option_name, price_delta")
      .eq("order_item_id", item.data?.id)
      .eq("option_id", ids.bacon)
      .single();

    expect(item.data?.unit_price).toBe(25);
    expect(savedOption.data).toEqual({ option_name: "Bacon", price_delta: 5 });
  });

  it("não permite que anon invoque a RPC", async () => {
    const result = await anon.rpc("create_online_order_atomic", {
      p_customer_id: ids.customer,
      p_address_id: null,
      p_order_type: "pickup",
      p_payment_method: "pix",
      p_cash_change_for: null,
      p_delivery_fee: 0,
      p_notes: null,
      p_items: [],
    });

    expect(result.error).not.toBeNull();
  });
  it("reproduz o bug do pedido promocional relatado no E2E", async () => {
    // 1. Criar o evento promocional para o burger
    const { data: event, error: eventError } = await supabase
      .from("promotional_events")
      .insert({
        name: "Dia do X-Burger E2E",
        active: true,
        schedule_type: "period",
        starts_at: new Date(Date.now() - 3600000).toISOString(),
        ends_at: new Date(Date.now() + 3600000).toISOString(),
      })
      .select("id")
      .single();

    expect(eventError).toBeNull();
    const eventId = event!.id;

    // O X-Burger (ids.simpleProduct) normalmente custa 24.90
    await supabase.from("products").update({ price: 24.90 }).eq("id", ids.simpleProduct);

    // O X-Bacon é um produto variant com option
    // variant ids.variant (price 20) + cheddar (ids.cheddar) (16)
    await supabase.from("product_options").update({ price_delta: 16 }).eq("id", ids.cheddar);

    const { error: itemError } = await supabase
      .from("promotional_event_products")
      .insert({
        event_id: eventId,
        product_id: ids.simpleProduct,
        promotional_price: 20.00, // Preço promocional do X-Burger
      });
    expect(itemError).toBeNull();

    // 2. Criar o cupom
    await supabase.from("coupons").delete().eq("code", "CDL10_E2E");
    const { error: couponError } = await supabase
      .from("coupons")
      .insert({
        code: "CDL10_E2E",
        discount_percent: 10,
        active: true,
      });
    expect(couponError).toBeNull();

    // 3. Montar o carrinho
    // X-Burger Promocional
    const xBurgerSnapshot = await snapshot({
      productId: ids.simpleProduct,
      quantity: 1,
      variantId: null,
      optionIds: [],
    });

    // Validar preço que o snapshot trouxe (deveria ser 20)
    expect(xBurgerSnapshot.unit_price).toBe(20);
    expect(xBurgerSnapshot.base_unit_price).toBe(24.9);
    expect(xBurgerSnapshot.observed_event_id).toBe(eventId);
    expect(xBurgerSnapshot.observed_promotional_base_unit_price).toBe(20);

    // X-Bacon Equivalente (Variant com Adicional)
    const xBaconSnapshot = await snapshot({
      productId: ids.burger,
      quantity: 1,
      variantId: ids.variant,
      optionIds: [ids.mediumPoint, ids.cheddar]
    });
    expect(xBaconSnapshot.unit_price).toBe(36);

    // Subtotal: 56.00
    // Desconto (10% sobre 36): 3.60
    // Total (    // 4. Submeter o pedido com Ordem Inversa (Sem promo -> Com promo)
    const { data: createdOrdersReverse, error: orderErrorReverse } = await supabase.rpc("create_online_order_atomic", {
      p_customer_id: ids.customer,
      p_address_id: null,
      p_order_type: "pickup",
      p_payment_method: "pix",
      p_cash_change_for: null,
      p_delivery_fee: 0,
      p_notes: "Teste de E2E Reverse",
      p_items: [
        xBaconSnapshot, // Item SEM promoção primeiro
        xBurgerSnapshot // Item COM promoção segundo
      ],
      p_coupon_code: "CDL10_E2E",
    });

    expect(orderErrorReverse).toBeNull();
    const orderIdReverse = createdOrdersReverse[0].order_id;
    createdOrderIds.push(orderIdReverse);

    // Validar Order Reverse
    const { data: orderReverse } = await supabase.from("orders").select("*").eq("id", orderIdReverse).single();
    expect(orderReverse.subtotal).toBe(56);
    expect(orderReverse.coupon_code).toBe("CDL10_E2E");
    expect(orderReverse.discount_amount).toBe(3.6);
    expect(orderReverse.total).toBe(52.4);

    // Validar Order Items Reverse (sem vazamento)
    const { data: itemsReverse } = await supabase.from("order_items").select("*").eq("order_id", orderIdReverse).order("created_at", { ascending: true });

    // O primeiro item do array de retorno pode não ser garantido a ordem, vamos achar por ID
    const baconRev = itemsReverse!.find(i => i.product_id === ids.burger);
    expect(baconRev!.unit_price).toBe(36);
    expect(baconRev!.promotional_event_id).toBeNull();
    expect(baconRev!.promotional_event_name).toBeNull();
    expect(baconRev!.promotional_base_unit_price).toBeNull();

    const burgerRev = itemsReverse!.find(i => i.product_id === ids.simpleProduct);
    expect(burgerRev!.base_unit_price).toBe(24.9);
    expect(burgerRev!.promotional_base_unit_price).toBe(20);
    expect(burgerRev!.promotional_event_id).toBe(eventId);
    // promotional_event_name do event
    expect(burgerRev.promotional_event_name).toBe("Dia do X-Burger E2E");

    // Limpar o evento para os proximos testes n quebrarem
    await supabase.from("promotional_event_products").delete().eq("event_id", eventId);
    await supabase.from("promotional_events").delete().eq("id", eventId);
  });

  it("rejeita snapshot promocional adulterado e garante autoridade do servidor", async () => {
    // Criar o evento promocional para o burger
    const { data: event } = await supabase
      .from("promotional_events")
      .insert({
        name: "Dia da Autoridade",
        active: true,
        schedule_type: "period",
        starts_at: new Date(Date.now() - 3600000).toISOString(),
        ends_at: new Date(Date.now() + 3600000).toISOString(),
      })
      .select("id")
      .single();
    const eventId = event!.id;

    await supabase.from("products").update({ price: 25.00 }).eq("id", ids.simpleProduct);
    await supabase.from("promotional_event_products").insert({
        event_id: eventId,
        product_id: ids.simpleProduct,
        promotional_price: 18.00,
    });

    const validSnapshot = await snapshot({
      productId: ids.simpleProduct,
      quantity: 1,
    });

    // Cenário A: Cliente tenta adulterar o observed_promotional_base_unit_price
    const fakePriceSnapshot = { ...validSnapshot, observed_promotional_base_unit_price: 10, unit_price: 10 };
    const fakePriceResult = await createOrder([fakePriceSnapshot]);
    expect(fakePriceResult.error?.message).toContain("CATALOG_CHANGED:PROMOTION");

    // Cenário B: Cliente tenta adulterar o observed_event_id
    const fakeIdSnapshot = { ...validSnapshot, observed_event_id: ids.customer };
    const fakeIdResult = await createOrder([fakeIdSnapshot]);
    expect(fakeIdResult.error?.message).toContain("CATALOG_CHANGED:PROMOTION");

    // Limpar o evento para os proximos testes n quebrarem
    await supabase.from("promotional_event_products").delete().eq("event_id", eventId);
    await supabase.from("promotional_events").delete().eq("id", eventId);
  });
});
