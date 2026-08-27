import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

import { createClient } from "@supabase/supabase-js";

import {
  demoBurgerAdmin,
  demoBurgerCatalog,
  demoBurgerIds,
  getDemoBurgerCatalogIds,
} from "./demo-burger-catalog.mjs";
import { getLocalSupabaseEnvironment } from "./local-supabase-env.mjs";

function assertSuccess(label, result) {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }
  return result.data;
}

async function upsertRows(client, table, rows) {
  assertSuccess(
    `Falha ao gravar ${table}`,
    await client.from(table).upsert(rows, { onConflict: "id" })
  );
}

function signature(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function findOrCreateDemoAdmin(client) {
  const users = assertSuccess(
    "Falha ao listar usuários locais",
    await client.auth.admin.listUsers({ page: 1, perPage: 1000 })
  );
  let user = users.users.find((candidate) => candidate.email === demoBurgerAdmin.email);

  if (!user) {
    const created = assertSuccess(
      "Falha ao criar administrador demo",
      await client.auth.admin.createUser({
        email: demoBurgerAdmin.email,
        password: demoBurgerAdmin.password,
        email_confirm: true,
        app_metadata: {
          label_role: "admin",
          label_permissions: [],
        },
        user_metadata: { name: demoBurgerAdmin.name },
      })
    );
    user = created.user;
  } else {
    const updated = assertSuccess(
      "Falha ao atualizar administrador demo",
      await client.auth.admin.updateUserById(user.id, {
        password: demoBurgerAdmin.password,
        email_confirm: true,
        app_metadata: {
          label_role: "admin",
          label_permissions: [],
        },
        user_metadata: { name: demoBurgerAdmin.name },
      })
    );
    user = updated.user;
  }

  await upsertRows(client, "admin_profiles", [
    { id: user.id, name: demoBurgerAdmin.name },
  ]);
  return user;
}

async function clearDemoData(client) {
  const { categoryIds, productIds, orderIds } = getDemoBurgerCatalogIds();
  const demoCustomers = assertSuccess(
    "Falha ao localizar clientes demo",
    await client
      .from("customers")
      .select("id")
      .in("phone", ["11900000001", "11900000002"])
  );
  const demoCustomerIds = demoCustomers.map((customer) => customer.id);
  const legacyVisualItems = assertSuccess(
    "Falha ao localizar vendas visuais antigas",
    await client
      .from("order_items")
      .select("order_id")
      .eq("product_id", demoBurgerIds.products.xBacon)
      .eq("variant_id", demoBurgerIds.variants.xBaconClassic)
      .eq("item_notes", "Sem cebola")
      .eq("unit_price", 37)
  );
  const legacyVisualOrderIds = [
    ...new Set(legacyVisualItems.map((item) => item.order_id)),
  ];

  assertSuccess(
    "Falha ao limpar perdas demo",
    await client.from("product_losses").delete().eq("id", demoBurgerIds.loss)
  );
  assertSuccess(
    "Falha ao limpar vendas visuais demo",
    await client
      .from("orders")
      .delete()
      .eq("cashier_customer_name", "Cliente POS Visual")
  );
  if (legacyVisualOrderIds.length > 0) {
    assertSuccess(
      "Falha ao limpar vendas visuais antigas",
      await client.from("orders").delete().in("id", legacyVisualOrderIds)
    );
  }
  if (demoCustomerIds.length > 0) {
    assertSuccess(
      "Falha ao limpar pedidos de clientes demo",
      await client.from("orders").delete().in("customer_id", demoCustomerIds)
    );
  }
  assertSuccess(
    "Falha ao limpar pedidos demo",
    await client.from("orders").delete().in("id", orderIds)
  );
  if (demoCustomerIds.length > 0) {
    assertSuccess(
      "Falha ao limpar clientes demo",
      await client.from("customers").delete().in("id", demoCustomerIds)
    );
  }
  assertSuccess(
    "Falha ao limpar produtos demo",
    await client.from("products").delete().in("id", productIds)
  );
  assertSuccess(
    "Falha ao limpar categorias demo",
    await client.from("categories").delete().in("id", categoryIds)
  );
}

async function ensureOpenCashSession(client, adminId) {
  const existing = assertSuccess(
    "Falha ao consultar caixa local",
    await client
      .from("cash_sessions")
      .select("id")
      .eq("status", "open")
      .maybeSingle()
  );

  if (existing) return existing.id;

  const created = assertSuccess(
    "Falha ao abrir caixa demo",
    await client
      .from("cash_sessions")
      .insert({ opening_balance: 100, opened_by: adminId })
      .select("id")
      .single()
  );
  return created.id;
}

async function ensureLocalSecurityBucket(client) {
  const buckets = assertSuccess(
    "Falha ao consultar buckets locais",
    await client.storage.listBuckets()
  );

  if (buckets.some((bucket) => bucket.name === "product-images")) return;

  assertSuccess(
    "Falha ao criar bucket local de segurança",
    await client.storage.createBucket("product-images", {
      public: false,
      fileSizeLimit: 6 * 1024 * 1024,
    })
  );
}

async function ensureDemoBusinessHours(client) {
  const existing = assertSuccess(
    "Falha ao consultar horários locais",
    await client.from("business_hours").select("id").limit(1)
  );

  if (existing.length > 0) return;

  await upsertRows(
    client,
    "business_hours",
    Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      is_open: true,
      opens_at: "00:00:00",
      closes_at: "23:59:00",
    })),
    "weekday"
  );
}

async function ensureDemoStoreSettings(client) {
  const existing = assertSuccess(
    "Falha ao consultar configurações locais",
    await client.from("store_settings").select("id").limit(1)
  );

  if (existing.length > 0) return;

  await upsertRows(client, "store_settings", [
    {
      id: "db000000-0000-4000-8000-000000000201",
      store_name: "Brasa Burger Demo",
      whatsapp: "5511999990000",
      instagram: "@brasaburger_demo",
      pickup_enabled: true,
      delivery_enabled: true,
      address_street: "Avenida Exemplo",
      address_number: "123",
      address_city: "Curitiba",
      address_state: "PR",
    },
  ]);
}

async function seedOperationalDemo(client, adminId) {
  const cashSessionId = await ensureOpenCashSession(client, adminId);
  const now = new Date();
  const earlier = new Date(now.getTime() - 45 * 60 * 1000).toISOString();
  const recent = new Date(now.getTime() - 15 * 60 * 1000).toISOString();

  await upsertRows(client, "customers", [
    {
      id: demoBurgerIds.customer,
      first_name: "Cliente",
      last_name: "Demonstração",
      phone: "11900000001",
    },
  ]);

  await upsertRows(client, "orders", [
    {
      id: demoBurgerIds.onlineOrder,
      customer_id: demoBurgerIds.customer,
      order_type: "pickup",
      status: "completed",
      subtotal: 45,
      delivery_fee: 0,
      total: 45,
      notes: "Pedido fictício para demonstração comercial",
      sales_channel: "online",
      payment_method: "pix",
      completed_at: earlier,
      created_at: earlier,
    },
    {
      id: demoBurgerIds.cashierOrder,
      order_type: "pickup",
      status: "completed",
      subtotal: 80.8,
      delivery_fee: 0,
      total: 80.8,
      notes: "Venda fictícia no balcão",
      sales_channel: "cashier",
      payment_method: "pix",
      cash_session_id: cashSessionId,
      cashier_customer_name: "Cliente Balcão Demo",
      created_by: adminId,
      cashier_reference: "db000000-0000-4000-8000-000000000063",
      completed_at: recent,
      created_at: recent,
    },
  ]);

  assertSuccess(
    "Falha ao recriar itens demo",
    await client
      .from("order_items")
      .delete()
      .in("order_id", [demoBurgerIds.onlineOrder, demoBurgerIds.cashierOrder])
  );

  await upsertRows(client, "order_items", [
    {
      id: demoBurgerIds.onlineItem,
      order_id: demoBurgerIds.onlineOrder,
      product_id: demoBurgerIds.products.xBacon,
      product_name: "X-Bacon",
      variant_id: demoBurgerIds.variants.xBaconDouble,
      variant_name: "Duplo",
      quantity: 1,
      base_unit_price: 36,
      options_unit_price: 9,
      unit_price: 45,
      item_notes: "Sem cebola",
      configuration_signature: signature("demo-online-x-bacon-duplo-cheddar-bacon-sem-cebola"),
    },
    {
      id: demoBurgerIds.cashierBurgerItem,
      order_id: demoBurgerIds.cashierOrder,
      product_id: demoBurgerIds.products.xBacon,
      product_name: "X-Bacon",
      variant_id: demoBurgerIds.variants.xBaconClassic,
      variant_name: "Clássico",
      quantity: 1,
      base_unit_price: 28,
      options_unit_price: 3,
      unit_price: 31,
      item_notes: "Cortar ao meio",
      configuration_signature: signature("demo-pos-x-bacon-classico-ovo-cortar-ao-meio"),
    },
    {
      id: demoBurgerIds.cashierSimpleItem,
      order_id: demoBurgerIds.cashierOrder,
      product_id: demoBurgerIds.products.xBurger,
      product_name: "X-Burger",
      quantity: 2,
      base_unit_price: 24.9,
      options_unit_price: 0,
      unit_price: 24.9,
      configuration_signature: signature("demo-pos-x-burger-simple"),
    },
  ]);

  await upsertRows(client, "order_item_options", [
    {
      id: "db000000-0000-4000-8000-000000000101",
      order_item_id: demoBurgerIds.onlineItem,
      option_group_id: demoBurgerIds.groups.meatPoint,
      option_id: demoBurgerIds.options.medium,
      group_name: "Ponto da carne",
      option_name: "Ao ponto",
      presentation_mode: "choice",
      price_delta: 0,
      group_sort_order: 10,
      option_sort_order: 10,
    },
    {
      id: "db000000-0000-4000-8000-000000000102",
      order_item_id: demoBurgerIds.onlineItem,
      option_group_id: demoBurgerIds.groups.additions,
      option_id: demoBurgerIds.options.cheddar,
      group_name: "Adicionais",
      option_name: "Cheddar",
      presentation_mode: "addition",
      price_delta: 4,
      group_sort_order: 20,
      option_sort_order: 10,
    },
    {
      id: "db000000-0000-4000-8000-000000000103",
      order_item_id: demoBurgerIds.onlineItem,
      option_group_id: demoBurgerIds.groups.additions,
      option_id: demoBurgerIds.options.bacon,
      group_name: "Adicionais",
      option_name: "Bacon",
      presentation_mode: "addition",
      price_delta: 5,
      group_sort_order: 20,
      option_sort_order: 20,
    },
    {
      id: "db000000-0000-4000-8000-000000000104",
      order_item_id: demoBurgerIds.cashierBurgerItem,
      option_group_id: demoBurgerIds.groups.meatPoint,
      option_id: demoBurgerIds.options.wellDone,
      group_name: "Ponto da carne",
      option_name: "Bem passado",
      presentation_mode: "choice",
      price_delta: 0,
      group_sort_order: 10,
      option_sort_order: 20,
    },
    {
      id: "db000000-0000-4000-8000-000000000105",
      order_item_id: demoBurgerIds.cashierBurgerItem,
      option_group_id: demoBurgerIds.groups.additions,
      option_id: demoBurgerIds.options.egg,
      group_name: "Adicionais",
      option_name: "Ovo",
      presentation_mode: "addition",
      price_delta: 3,
      group_sort_order: 20,
      option_sort_order: 30,
    },
  ]);

  await upsertRows(client, "order_payments", [
    {
      id: demoBurgerIds.payment,
      order_id: demoBurgerIds.cashierOrder,
      cash_session_id: cashSessionId,
      method: "pix",
      amount: 80.8,
      tendered_amount: null,
      change_amount: null,
      created_by: adminId,
      created_at: recent,
    },
  ]);

  await upsertRows(client, "product_losses", [
    {
      id: demoBurgerIds.loss,
      loss_reference: demoBurgerIds.lossReference,
      cash_session_id: cashSessionId,
      product_id: demoBurgerIds.products.fries,
      product_name: "Batata Frita",
      variant_id: demoBurgerIds.variants.friesMedium,
      variant_name: "M",
      quantity: 1,
      reason: "production",
      notes: "Amostra fictícia da demonstração",
      estimated_value: 15,
      created_by: adminId,
      created_at: recent,
    },
  ]);
}

export async function seedDemoBurger({ reset = false } = {}) {
  const { apiUrl, serviceRoleKey } = getLocalSupabaseEnvironment();
  const client = createClient(apiUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (reset) await clearDemoData(client);

  await ensureLocalSecurityBucket(client);
  await ensureDemoBusinessHours(client);
  await ensureDemoStoreSettings(client);
  const admin = await findOrCreateDemoAdmin(client);
  await upsertRows(client, "categories", demoBurgerCatalog.categories);
  await upsertRows(client, "products", demoBurgerCatalog.products);
  await upsertRows(client, "product_variants", demoBurgerCatalog.variants);
  await upsertRows(client, "product_option_groups", demoBurgerCatalog.optionGroups);
  await upsertRows(client, "product_options", demoBurgerCatalog.options);
  await seedOperationalDemo(client, admin.id);

  return {
    apiUrl,
    adminEmail: demoBurgerAdmin.email,
    categoryCount: demoBurgerCatalog.categories.length,
    productCount: demoBurgerCatalog.products.length,
  };
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  const result = await seedDemoBurger({ reset: process.argv.includes("--reset") });
  console.log(
    `Demo Brasa Burger pronto em ${result.apiUrl}: ${result.categoryCount} categorias, ${result.productCount} produtos.`
  );
  console.log(`Admin local: ${result.adminEmail}`);
}
