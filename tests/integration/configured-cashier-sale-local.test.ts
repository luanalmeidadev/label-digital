import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { priceConfiguredCatalogItem } from "@/lib/food-catalog/pricing";
import { createFoodCatalogProductRepository } from "@/lib/food-catalog/repository";
import { buildPersistableOrderItemSnapshot } from "@/lib/food-catalog/snapshot";
import type { SelectedCatalogItemConfiguration } from "@/lib/food-catalog/types";

const localSupabaseUrl = process.env.LOCAL_SUPABASE_URL;
const localServiceRoleKey = process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;
const localAnonKey = process.env.LOCAL_SUPABASE_ANON_KEY;
const runLocalIntegration = Boolean(
  localSupabaseUrl && localServiceRoleKey && localAnonKey
);
const testSuite = runLocalIntegration ? describe : describe.skip;

const ids = {
  simpleProduct: "70000000-0000-4000-8000-000000000001",
  burger: "70000000-0000-4000-8000-000000000002",
  variant: "70000000-0000-4000-8000-000000000003",
  pointGroup: "70000000-0000-4000-8000-000000000004",
  additionsGroup: "70000000-0000-4000-8000-000000000005",
  mediumPoint: "70000000-0000-4000-8000-000000000006",
  cheddar: "70000000-0000-4000-8000-000000000007",
  bacon: "70000000-0000-4000-8000-000000000008",
};

testSuite("venda configurável no caixa local", () => {
  const service = createClient(
    localSupabaseUrl ?? "http://127.0.0.1:54321",
    localServiceRoleKey ?? "local-integration-not-configured",
    {
    auth: { autoRefreshToken: false, persistSession: false },
    }
  );
  const cashier = createClient(
    localSupabaseUrl ?? "http://127.0.0.1:54321",
    localAnonKey ?? "local-integration-not-configured",
    {
    auth: { autoRefreshToken: false, persistSession: false },
    }
  );
  const repository = createFoodCatalogProductRepository(service);
  const references: string[] = [];
  let userId = "";
  let cashSessionId = "";
  let ownsCashSession = false;

  async function snapshot(selection: SelectedCatalogItemConfiguration) {
    const priced = await priceConfiguredCatalogItem(repository, selection);
    const persistable = buildPersistableOrderItemSnapshot(priced);

    return {
      catalog_version: priced.catalogVersion,
      ...persistable.item,
      options: persistable.options,
    };
  }

  async function sale(
    items: unknown[],
    payments: Array<{
      method: string;
      amount: number;
      tendered_amount: number | null;
      change_amount: number | null;
    }>
  ) {
    const reference = crypto.randomUUID();
    references.push(reference);
    const result = await cashier.rpc("create_configured_cashier_sale", {
      p_cash_session_id: cashSessionId,
      p_cashier_reference: reference,
      p_items: items,
      p_payments: payments,
      p_customer_name: "Cliente local",
      p_notes: "Teste POS local",
    });
    const row = Array.isArray(result.data) ? result.data[0] : null;
    return { ...result, row };
  }

  beforeAll(async () => {
    const email = `pos-${Date.now()}@label.test`;
    const password = "Admin-Local-123!";
    const createdUser = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: {
        label_role: "admin",
        label_permissions: [],
      },
    });

    expect(createdUser.error).toBeNull();
    userId = createdUser.data.user!.id;
    expect(
      (await service.from("admin_profiles").insert({ id: userId, name: "POS Local" }))
        .error
    ).toBeNull();
    expect((await cashier.auth.signInWithPassword({ email, password })).error).toBeNull();

    await service.from("products").delete().in("id", [ids.simpleProduct, ids.burger]);
    expect(
      (
        await service.from("products").insert([
          {
            id: ids.simpleProduct,
            name: "Brownie POS",
            price: 12,
            pricing_mode: "simple",
          },
          {
            id: ids.burger,
            name: "X-Bacon POS",
            price: 0,
            pricing_mode: "variant",
          },
        ])
      ).error
    ).toBeNull();
    expect(
      (
        await service.from("product_variants").insert({
          id: ids.variant,
          product_id: ids.burger,
          name: "Grande",
          price: 28,
        })
      ).error
    ).toBeNull();
    expect(
      (
        await service.from("product_option_groups").insert([
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
        await service.from("product_options").insert([
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

    const existingSession = await service
      .from("cash_sessions")
      .select("id")
      .eq("status", "open")
      .maybeSingle();

    if (existingSession.data) {
      cashSessionId = existingSession.data.id;
    } else {
      const createdSession = await service
        .from("cash_sessions")
        .insert({ opening_balance: 100, opened_by: userId })
        .select("id")
        .single();
      expect(createdSession.error).toBeNull();
      cashSessionId = createdSession.data!.id;
      ownsCashSession = true;
    }
  });

  afterAll(async () => {
    if (references.length > 0) {
      const orders = await service
        .from("orders")
        .select("id")
        .in("cashier_reference", references);
      const orderIds = (orders.data ?? []).map((order) => order.id);
      if (orderIds.length > 0) {
        await service.from("orders").delete().in("id", orderIds);
      }
    }
    if (ownsCashSession && cashSessionId) {
      await service.from("cash_sessions").delete().eq("id", cashSessionId);
    }
    await service.from("products").delete().in("id", [ids.simpleProduct, ids.burger]);
    if (userId) {
      await service.auth.admin.deleteUser(userId);
    }
  });

  it("mantém produto simples e pagamento único", async () => {
    const item = await snapshot({ productId: ids.simpleProduct, quantity: 2 });
    const result = await sale([item], [
      {
        method: "pix",
        amount: 24,
        tendered_amount: null,
        change_amount: null,
      },
    ]);

    expect(result.error).toBeNull();
    expect(result.row).toMatchObject({ total: 24 });

    const saved = await service
      .from("order_items")
      .select("variant_id, base_unit_price, options_unit_price, unit_price, quantity")
      .eq("order_id", result.row.order_id)
      .single();
    expect(saved.data).toMatchObject({
      variant_id: null,
      base_unit_price: 12,
      options_unit_price: 0,
      unit_price: 12,
      quantity: 2,
    });
  });

  it("persiste variante, adicionais, observação e pagamento misto", async () => {
    const item = await snapshot({
      productId: ids.burger,
      variantId: ids.variant,
      optionIds: [ids.mediumPoint, ids.cheddar, ids.bacon],
      itemNotes: "sem cebola",
      quantity: 2,
    });
    const result = await sale([item], [
      { method: "cash", amount: 20, tendered_amount: 30, change_amount: 10 },
      { method: "pix", amount: 54, tendered_amount: null, change_amount: null },
    ]);

    expect(result.error).toBeNull();
    expect(result.row).toMatchObject({ total: 74 });

    const savedItem = await service
      .from("order_items")
      .select("id, variant_name, unit_price, item_notes, configuration_signature")
      .eq("order_id", result.row.order_id)
      .single();
    const savedOptions = await service
      .from("order_item_options")
      .select("option_name, price_delta")
      .eq("order_item_id", savedItem.data!.id)
      .order("group_sort_order")
      .order("option_sort_order");
    const payments = await service
      .from("order_payments")
      .select("method, amount, tendered_amount, change_amount")
      .eq("order_id", result.row.order_id)
      .order("method");

    expect(savedItem.data).toMatchObject({
      variant_name: "Grande",
      unit_price: 37,
      item_notes: "sem cebola",
    });
    expect(savedItem.data?.configuration_signature).toMatch(/^[0-9a-f]{64}$/);
    expect(savedOptions.data).toEqual([
      { option_name: "Ao ponto", price_delta: 0 },
      { option_name: "Cheddar", price_delta: 4 },
      { option_name: "Bacon", price_delta: 5 },
    ]);
    expect(payments.data).toEqual([
      { method: "cash", amount: 20, tendered_amount: 30, change_amount: 10 },
      { method: "pix", amount: 54, tendered_amount: null, change_amount: null },
    ]);
  });

  it("rejeita preço manipulado e mantém atomicidade", async () => {
    const valid = await snapshot({ productId: ids.simpleProduct, quantity: 1 });
    const before = await service
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("sales_channel", "cashier");
    const result = await sale(
      [{ ...valid, base_unit_price: 0.01, unit_price: 0.01 }],
      [{ method: "pix", amount: 0.01, tendered_amount: null, change_amount: null }]
    );
    const after = await service
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("sales_channel", "cashier");

    expect(result.error).not.toBeNull();
    expect(after.count).toBe(before.count);
  });

  it("rejeita grupo obrigatório ausente sem criar pedido parcial", async () => {
    const valid = await snapshot({
      productId: ids.burger,
      variantId: ids.variant,
      optionIds: [ids.mediumPoint, ids.cheddar],
      quantity: 1,
    });
    const withoutRequired = {
      ...valid,
      options: valid.options.filter(
        (option) => option.option_group_id !== ids.pointGroup
      ),
    };
    const result = await sale([withoutRequired], [
      { method: "pix", amount: 32, tendered_amount: null, change_amount: null },
    ]);

    expect(result.error?.message).toContain("INVALID_GROUP_SELECTION");
  });

  it("rejeita opção indisponível e preço alterado antes da finalização", async () => {
    const staleOption = await snapshot({
      productId: ids.burger,
      variantId: ids.variant,
      optionIds: [ids.mediumPoint, ids.cheddar],
      quantity: 1,
    });
    await service
      .from("product_options")
      .update({ available: false })
      .eq("id", ids.cheddar);
    const unavailable = await sale([staleOption], [
      { method: "pix", amount: 32, tendered_amount: null, change_amount: null },
    ]);
    expect(unavailable.error?.message).toContain("CATALOG_CHANGED");
    await service
      .from("product_options")
      .update({ available: true })
      .eq("id", ids.cheddar);

    const stalePrice = await snapshot({
      productId: ids.burger,
      variantId: ids.variant,
      optionIds: [ids.mediumPoint],
      quantity: 1,
    });
    await service
      .from("product_variants")
      .update({ price: 29 })
      .eq("id", ids.variant);
    const changedPrice = await sale([stalePrice], [
      { method: "pix", amount: 28, tendered_amount: null, change_amount: null },
    ]);
    expect(changedPrice.error?.message).toContain("CATALOG_CHANGED");
  });
});
