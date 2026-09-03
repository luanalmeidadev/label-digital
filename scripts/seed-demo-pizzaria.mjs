import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

import { createClient } from "@supabase/supabase-js";

import {
  demoPizzariaAdmin,
  demoPizzariaCatalog,
  demoPizzariaIds,
  getDemoPizzariaCatalogIds,
} from "./demo-pizzaria-catalog.mjs";
import { getLocalSupabaseEnvironment } from "./local-supabase-env.mjs";

function assertSuccess(label, result) {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }
  return result.data;
}

async function upsertRows(client, table, rows, conflictColumns = "id") {
  assertSuccess(
    `Falha ao gravar ${table}`,
    await client.from(table).upsert(rows, { onConflict: conflictColumns })
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
  let user = users.users.find((candidate) => candidate.email === demoPizzariaAdmin.email);

  if (!user) {
    const created = assertSuccess(
      "Falha ao criar administrador demo",
      await client.auth.admin.createUser({
        email: demoPizzariaAdmin.email,
        password: demoPizzariaAdmin.password,
        email_confirm: true,
        app_metadata: {
          label_role: "admin",
          label_permissions: [],
        },
        user_metadata: { name: demoPizzariaAdmin.name },
      })
    );
    user = created.user;
  } else {
    const updated = assertSuccess(
      "Falha ao atualizar administrador demo",
      await client.auth.admin.updateUserById(user.id, {
        password: demoPizzariaAdmin.password,
        email_confirm: true,
        app_metadata: {
          label_role: "admin",
          label_permissions: [],
        },
        user_metadata: { name: demoPizzariaAdmin.name },
      })
    );
    user = updated.user;
  }

  await upsertRows(client, "admin_profiles", [
    { id: user.id, name: demoPizzariaAdmin.name },
  ]);
  return user;
}

async function clearDemoData(client) {
  const { categoryIds, productIds, orderIds } = getDemoPizzariaCatalogIds();
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
      .eq("product_id", demoPizzariaIds.products.marguerita)
      .eq("variant_id", demoPizzariaIds.variants.margueritaLarge)
      .eq("item_notes", "Sem cebola")
      .eq("unit_price", 55)
  );
  const legacyVisualOrderIds = [
    ...new Set(legacyVisualItems.map((item) => item.order_id)),
  ];

  assertSuccess(
    "Falha ao limpar perdas demo",
    await client.from("product_losses").delete().eq("id", demoPizzariaIds.loss)
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
      id: "d2000000-0000-4000-8000-000000000201",
      store_name: "Pizzaria Demo",
      whatsapp: "5511999990000",
      instagram: "@bellanapoli_demo",
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
      id: demoPizzariaIds.customer,
      first_name: "Cliente",
      last_name: "Demonstração",
      phone: "11900000001",
    },
  ]);

  await upsertRows(client, "orders", [
    {
      id: demoPizzariaIds.onlineOrder,
      customer_id: demoPizzariaIds.customer,
      order_type: "pickup",
      status: "completed",
      subtotal: 65,
      delivery_fee: 0,
      total: 65,
      notes: "Pedido fictício para demonstração comercial",
      sales_channel: "online",
      payment_method: "pix",
      completed_at: earlier,
      created_at: earlier,
    },
    {
      id: demoPizzariaIds.cashierOrder,
      order_type: "pickup",
      status: "completed",
      subtotal: 61.9,
      delivery_fee: 0,
      total: 61.9,
      notes: "Venda fictícia no balcão",
      sales_channel: "cashier",
      payment_method: "pix",
      cash_session_id: cashSessionId,
      cashier_customer_name: "Cliente Balcão Demo",
      created_by: adminId,
      cashier_reference: "d2000000-0000-4000-8000-000000000063",
      completed_at: recent,
      created_at: recent,
    },
  ]);

  assertSuccess(
    "Falha ao recriar itens demo",
    await client
      .from("order_items")
      .delete()
      .in("order_id", [demoPizzariaIds.onlineOrder, demoPizzariaIds.cashierOrder])
  );

  await upsertRows(client, "order_items", [
    {
      id: demoPizzariaIds.onlineItem,
      order_id: demoPizzariaIds.onlineOrder,
      product_id: demoPizzariaIds.products.marguerita,
      product_name: "Pizza Marguerita",
      variant_id: demoPizzariaIds.variants.margueritaLarge,
      variant_name: "Grande",
      quantity: 1,
      base_unit_price: 55,
      options_unit_price: 10,
      unit_price: 65,
      item_notes: "Sem manjericão",
      configuration_signature: signature("demo-online-marguerita-grande-catupiry"),
    },
    {
      id: demoPizzariaIds.cashierPizzaItem,
      order_id: demoPizzariaIds.cashierOrder,
      product_id: demoPizzariaIds.products.calabresa,
      product_name: "Pizza Calabresa",
      quantity: 1,
      base_unit_price: 49.9,
      options_unit_price: 0,
      unit_price: 49.9,
      item_notes: "",
      configuration_signature: signature("demo-pos-calabresa"),
    },
    {
      id: demoPizzariaIds.cashierSodaItem,
      order_id: demoPizzariaIds.cashierOrder,
      product_id: demoPizzariaIds.products.soda,
      product_name: "Refrigerante",
      variant_id: demoPizzariaIds.variants.sodaBottle,
      variant_name: "Garrafa 2L",
      quantity: 1,
      base_unit_price: 12,
      options_unit_price: 0,
      unit_price: 12,
      configuration_signature: signature("demo-pos-soda-2l"),
    },
  ]);

  await upsertRows(client, "order_item_options", [
    {
      id: "d2000000-0000-4000-8000-000000000101",
      order_item_id: demoPizzariaIds.onlineItem,
      option_group_id: demoPizzariaIds.groups.edge,
      option_id: demoPizzariaIds.options.catupiryEdge,
      group_name: "Borda recheada",
      option_name: "Borda de Catupiry",
      presentation_mode: "addition",
      price_delta: 10,
      group_sort_order: 10,
      option_sort_order: 10,
    }
  ]);

  await upsertRows(client, "order_payments", [
    {
      id: demoPizzariaIds.payment,
      order_id: demoPizzariaIds.cashierOrder,
      cash_session_id: cashSessionId,
      method: "pix",
      amount: 61.9,
      tendered_amount: null,
      change_amount: null,
      created_by: adminId,
      created_at: recent,
    },
  ]);

  await upsertRows(client, "product_losses", [
    {
      id: demoPizzariaIds.loss,
      loss_reference: demoPizzariaIds.lossReference,
      cash_session_id: cashSessionId,
      product_id: demoPizzariaIds.products.soda,
      product_name: "Refrigerante",
      variant_id: demoPizzariaIds.variants.sodaCan,
      variant_name: "Lata 350 ml",
      quantity: 1,
      reason: "production",
      notes: "Amostra fictícia da demonstração",
      estimated_value: 15,
      created_by: adminId,
      created_at: recent,
    },
  ]);
}

export async function seedDemoPizzaria({ reset = false } = {}) {
  let apiUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  console.log("Seeder Env Check:", { apiUrl, hasServiceKey: !!serviceRoleKey });

  if (!apiUrl || !serviceRoleKey) {
    console.log("Falling back to getLocalSupabaseEnvironment");
    const env = getLocalSupabaseEnvironment();
    apiUrl = env.apiUrl;
    serviceRoleKey = env.serviceRoleKey;
  }

  const client = createClient(apiUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (reset) await clearDemoData(client);

  await ensureLocalSecurityBucket(client);
  await ensureDemoBusinessHours(client);
  await ensureDemoStoreSettings(client);
  const admin = await findOrCreateDemoAdmin(client);
  await upsertRows(client, "categories", demoPizzariaCatalog.categories);
  await upsertRows(client, "products", demoPizzariaCatalog.products);
  await upsertRows(client, "product_variants", demoPizzariaCatalog.variants);
  await upsertRows(client, "product_option_groups", demoPizzariaCatalog.optionGroups);
  await upsertRows(client, "product_options", demoPizzariaCatalog.options);
  await seedOperationalDemo(client, admin.id);

  return {
    apiUrl,
    adminEmail: demoPizzariaAdmin.email,
    categoryCount: demoPizzariaCatalog.categories.length,
    productCount: demoPizzariaCatalog.products.length,
  };
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  const result = await seedDemoPizzaria({ reset: process.argv.includes("--reset") });
  console.log(
    `Demo Pizzaria pronto em ${result.apiUrl}: ${result.categoryCount} categorias, ${result.productCount} produtos.`
  );
  console.log(`Admin local: ${result.adminEmail}`);
}
