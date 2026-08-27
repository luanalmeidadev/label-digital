import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { summarizeSoldOrderItems } from "@/lib/admin-reporting";

const localSupabaseUrl = process.env.LOCAL_SUPABASE_URL;
const localServiceRoleKey = process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;
const localAnonKey = process.env.LOCAL_SUPABASE_ANON_KEY;
const runLocalIntegration = Boolean(
  localSupabaseUrl && localServiceRoleKey && localAnonKey
);
const testSuite = runLocalIntegration ? describe : describe.skip;

const ids = {
  simpleProduct: "81000000-0000-4000-8000-000000000001",
  reportBurger: "81000000-0000-4000-8000-000000000002",
  reportVariant: "81000000-0000-4000-8000-000000000003",
  reportGroup: "81000000-0000-4000-8000-000000000004",
  cheddar: "81000000-0000-4000-8000-000000000005",
  bacon: "81000000-0000-4000-8000-000000000006",
  lossBurger: "81000000-0000-4000-8000-000000000007",
  lossVariant: "81000000-0000-4000-8000-000000000008",
  legacyOrder: "81000000-0000-4000-8000-000000000009",
  onlineOrder: "81000000-0000-4000-8000-000000000010",
  posOrder: "81000000-0000-4000-8000-000000000011",
  legacyItem: "81000000-0000-4000-8000-000000000012",
  onlineItem: "81000000-0000-4000-8000-000000000013",
  posItem: "81000000-0000-4000-8000-000000000014",
};

testSuite("relatórios e perdas configuráveis no Supabase local", () => {
  const service = createClient(
    localSupabaseUrl ?? "http://127.0.0.1:54321",
    localServiceRoleKey ?? "local-integration-not-configured",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const admin = createClient(
    localSupabaseUrl ?? "http://127.0.0.1:54321",
    localAnonKey ?? "local-integration-not-configured",
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  let userId = "";
  let cashSessionId = "";
  let ownsCashSession = false;
  const lossReferences: string[] = [];

  beforeAll(async () => {
    const email = `reports-${Date.now()}@label.test`;
    const password = "Admin-Local-123!";
    const createdUser = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { label_role: "admin", label_permissions: [] },
    });

    expect(createdUser.error).toBeNull();
    userId = createdUser.data.user!.id;
    expect(
      (
        await service
          .from("admin_profiles")
          .insert({ id: userId, name: "Relatórios locais" })
      ).error
    ).toBeNull();
    expect((await admin.auth.signInWithPassword({ email, password })).error).toBeNull();

    await service
      .from("orders")
      .delete()
      .in("id", [ids.legacyOrder, ids.onlineOrder, ids.posOrder]);
    await service
      .from("products")
      .delete()
      .in("id", [ids.simpleProduct, ids.reportBurger, ids.lossBurger]);

    expect(
      (
        await service.from("products").insert([
          {
            id: ids.simpleProduct,
            name: "Brownie relatório",
            price: 12,
            pricing_mode: "simple",
          },
          {
            id: ids.reportBurger,
            name: "X-Bacon relatório",
            price: 0,
            pricing_mode: "variant",
          },
          {
            id: ids.lossBurger,
            name: "X-Bacon perda",
            price: 0,
            pricing_mode: "variant",
          },
        ])
      ).error
    ).toBeNull();
    expect(
      (
        await service.from("product_variants").insert([
          {
            id: ids.reportVariant,
            product_id: ids.reportBurger,
            name: "Grande relatório",
            price: 28,
          },
          {
            id: ids.lossVariant,
            product_id: ids.lossBurger,
            name: "Grande perda",
            price: 30,
          },
        ])
      ).error
    ).toBeNull();
    expect(
      (
        await service.from("product_option_groups").insert({
          id: ids.reportGroup,
          product_id: ids.reportBurger,
          name: "Adicionais relatório",
          selection_mode: "multiple",
          min_selections: 0,
          max_selections: 2,
          presentation_mode: "addition",
        })
      ).error
    ).toBeNull();
    expect(
      (
        await service.from("product_options").insert([
          {
            id: ids.cheddar,
            option_group_id: ids.reportGroup,
            name: "Cheddar relatório",
            price_delta: 4,
            sort_order: 0,
          },
          {
            id: ids.bacon,
            option_group_id: ids.reportGroup,
            name: "Bacon relatório",
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

    expect(
      (
        await service.from("orders").insert([
          {
            id: ids.legacyOrder,
            order_type: "pickup",
            status: "completed",
            subtotal: 24,
            total: 24,
            sales_channel: "online",
            payment_method: "pix",
            completed_at: new Date().toISOString(),
          },
          {
            id: ids.onlineOrder,
            order_type: "pickup",
            status: "completed",
            subtotal: 74,
            total: 74,
            sales_channel: "online",
            payment_method: "pix",
            completed_at: new Date().toISOString(),
          },
          {
            id: ids.posOrder,
            order_type: "pickup",
            status: "completed",
            subtotal: 37,
            total: 37,
            sales_channel: "cashier",
            cash_session_id: cashSessionId,
            payment_method: "credit_card",
            completed_at: new Date().toISOString(),
          },
        ])
      ).error
    ).toBeNull();
    expect(
      (
        await service.from("order_items").insert({
          id: ids.legacyItem,
          order_id: ids.legacyOrder,
          product_id: ids.simpleProduct,
          product_name: "Brownie snapshot",
          quantity: 2,
          unit_price: 12,
        })
      ).error
    ).toBeNull();
    expect(
      (
        await service.from("order_items").insert([
          {
            id: ids.onlineItem,
            order_id: ids.onlineOrder,
            product_id: ids.reportBurger,
            product_name: "X-Bacon snapshot",
            variant_id: ids.reportVariant,
            variant_name: "Grande snapshot",
            quantity: 2,
            base_unit_price: 28,
            options_unit_price: 9,
            unit_price: 37,
            item_notes: "sem cebola",
          },
          {
            id: ids.posItem,
            order_id: ids.posOrder,
            product_id: ids.reportBurger,
            product_name: "X-Bacon snapshot",
            variant_id: ids.reportVariant,
            variant_name: "Grande snapshot",
            quantity: 1,
            base_unit_price: 28,
            options_unit_price: 9,
            unit_price: 37,
          },
        ])
      ).error
    ).toBeNull();

    const optionSnapshots = [ids.onlineItem, ids.posItem].flatMap(
      (orderItemId) => [
        {
          order_item_id: orderItemId,
          option_group_id: ids.reportGroup,
          option_id: ids.cheddar,
          group_name: "Adicionais snapshot",
          option_name: "Cheddar snapshot",
          presentation_mode: "addition",
          price_delta: 4,
          group_sort_order: 0,
          option_sort_order: 0,
        },
        {
          order_item_id: orderItemId,
          option_group_id: ids.reportGroup,
          option_id: ids.bacon,
          group_name: "Adicionais snapshot",
          option_name: "Bacon snapshot",
          presentation_mode: "addition",
          price_delta: 5,
          group_sort_order: 0,
          option_sort_order: 1,
        },
      ]
    );
    expect((await service.from("order_item_options").insert(optionSnapshots)).error).toBeNull();
  });

  afterAll(async () => {
    if (lossReferences.length > 0) {
      await service
        .from("product_losses")
        .delete()
        .in("loss_reference", lossReferences);
    }
    await service
      .from("orders")
      .delete()
      .in("id", [ids.legacyOrder, ids.onlineOrder, ids.posOrder]);
    if (ownsCashSession && cashSessionId) {
      await service.from("cash_sessions").delete().eq("id", cashSessionId);
    }
    await service
      .from("products")
      .delete()
      .in("id", [ids.simpleProduct, ids.reportBurger, ids.lossBurger]);
    if (userId) await service.auth.admin.deleteUser(userId);
  });

  async function reportItems() {
    const result = await admin
      .from("order_items")
      .select(`
        id, product_id, product_name, variant_id, variant_name, quantity,
        base_unit_price, options_unit_price, unit_price, item_notes,
        order_item_options (
          id, option_id, group_name, option_name, presentation_mode,
          price_delta, group_sort_order, option_sort_order
        ),
        orders!inner(status)
      `)
      .in("order_id", [ids.legacyOrder, ids.onlineOrder, ids.posOrder])
      .eq("orders.status", "completed");
    expect(result.error).toBeNull();
    return result.data ?? [];
  }

  it("agrega produto simples, online e POS pelo produto principal", async () => {
    const report = summarizeSoldOrderItems(await reportItems());
    const brownie = report.products.find(
      (product) => product.key === ids.simpleProduct
    );
    const burger = report.products.find(
      (product) => product.key === ids.reportBurger
    );

    expect(brownie).toMatchObject({ quantity: 2, revenue: 24 });
    expect(burger).toMatchObject({
      name: "X-Bacon snapshot",
      quantity: 3,
      baseRevenue: 84,
      optionsRevenue: 27,
      revenue: 111,
    });
    expect(report.variants).toEqual([
      expect.objectContaining({ variantName: "Grande snapshot", quantity: 3 }),
    ]);
    expect(report.options).toEqual([
      expect.objectContaining({ optionName: "Cheddar snapshot", selections: 3, revenue: 12 }),
      expect.objectContaining({ optionName: "Bacon snapshot", selections: 3, revenue: 15 }),
    ]);
  });

  it("mantém snapshots após remover o produto e a variante do catálogo", async () => {
    expect(
      (await service.from("products").delete().eq("id", ids.reportBurger)).error
    ).toBeNull();
    const report = summarizeSoldOrderItems(await reportItems());
    const burger = report.products.find(
      (product) => product.name === "X-Bacon snapshot"
    );

    expect(burger).toMatchObject({ quantity: 3, revenue: 111 });
    expect(report.variants[0].variantName).toBe("Grande snapshot");
    expect(report.options.map((option) => option.optionName)).toEqual([
      "Cheddar snapshot",
      "Bacon snapshot",
    ]);
  });

  it("registra perda simples e com variante usando preço atual no servidor", async () => {
    const simpleReference = crypto.randomUUID();
    const variantReference = crypto.randomUUID();
    lossReferences.push(simpleReference, variantReference);

    const simple = await admin.rpc("create_configured_product_loss", {
      p_cash_session_id: cashSessionId,
      p_loss_reference: simpleReference,
      p_product_id: ids.simpleProduct,
      p_variant_id: null,
      p_quantity: 2,
      p_reason: "damaged",
      p_notes: "teste simples",
    });
    const configured = await admin.rpc("create_configured_product_loss", {
      p_cash_session_id: cashSessionId,
      p_loss_reference: variantReference,
      p_product_id: ids.lossBurger,
      p_variant_id: ids.lossVariant,
      p_quantity: 2,
      p_reason: "production",
      p_notes: "teste variante",
    });

    expect(simple.error).toBeNull();
    expect(configured.error).toBeNull();
    expect(simple.data?.[0].estimated_value).toBe(24);
    expect(configured.data?.[0].estimated_value).toBe(60);

    await service
      .from("products")
      .update({ name: "Produto renomeado" })
      .eq("id", ids.lossBurger);
    await service
      .from("product_variants")
      .delete()
      .eq("id", ids.lossVariant);
    const savedLoss = await service
      .from("product_losses")
      .select("product_name, variant_id, variant_name, estimated_value")
      .eq("loss_reference", variantReference)
      .single();

    expect(savedLoss.data).toEqual({
      product_name: "X-Bacon perda",
      variant_id: null,
      variant_name: "Grande perda",
      estimated_value: 60,
    });
  });
});
