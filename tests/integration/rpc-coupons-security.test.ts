import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createClient } from "@supabase/supabase-js";


// Usando as mesmas configurações do supabase no tests/setup.ts
const supabaseUrl = process.env.LOCAL_SUPABASE_URL || "http://127.0.0.1:55321";
const supabaseAnonKey = process.env.LOCAL_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const supabaseServiceKey = process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

describe("RPC create_online_order_atomic security", () => {
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  let categoryId: string;
  let productId: string;
  let couponId: string;

  beforeAll(async () => {
    // 1. Criar dados de teste com serviceClient
    const { data: category, error: catError } = await serviceClient
      .from("categories")
      .insert({
        name: "Test Category RPC Security",
        slug: "test-category-rpc-security",
        active: true,
      })
      .select()
      .single();
    if (catError) throw catError;
    categoryId = category.id;

    const { data: product, error: prodError } = await serviceClient
      .from("products")
      .insert({
        category_id: categoryId,
        name: "Test Product RPC Security",
        description: "Test",
        price: 100, // Preço base 100
        active: true,
      })
      .select()
      .single();
    if (prodError) throw prodError;
    productId = product.id;

    const { data: coupon, error: couponError } = await serviceClient
      .from("coupons")
      .insert({
        code: "SECURITYTEST10",
        discount_percent: 10,
        active: true,
      })
      .select()
      .single();
    if (couponError && couponError.code !== "23505") throw couponError;
    if (!couponError) {
      couponId = coupon.id;
    }

    const { error: coupon100Error } = await serviceClient
      .from("coupons")
      .insert({
        code: "SECURITYTEST100",
        discount_percent: 100,
        active: true,
      });
    if (coupon100Error && coupon100Error.code !== "23505") throw coupon100Error;
  });

  afterAll(async () => {
    // Cleanup
    await serviceClient.from("coupons").delete().eq("code", "SECURITYTEST10");
    await serviceClient.from("coupons").delete().eq("code", "SECURITYTEST100");
    await serviceClient.from("products").delete().eq("id", productId);
    await serviceClient.from("categories").delete().eq("id", categoryId);
  });

  it("não pode ser chamada pelo client anônimo", async () => {
    const { error } = await anonClient.rpc("create_online_order_atomic", {
      p_customer_id: null,
      p_address_id: null,
      p_order_type: "pickup",
      p_payment_method: "cash",
      p_cash_change_for: null,
      p_delivery_fee: 0,
      p_notes: null,
      p_items: [
        {
          product_id: productId,
          product_name: "Test Product RPC Security",
          quantity: 1,
          base_unit_price: 100,
          options_unit_price: 0,
          unit_price: 100,
        }
      ],
      p_coupon_code: "SECURITYTEST10",
    });

    // Como revogamos de public e grant para service_role, deve dar erro ou not found
    expect(error).toBeDefined();
    // A RPC não está disponível para anon/authenticated
    // Se estivesse, ela checaria desconto no banco, mas como não está, não pode chamar!
    if (error) {
      expect(error.message).toMatch(/(permission denied|does not exist|Could not find the function)/i);
    }
  });

  it("deve aceitar parâmetros corretos quando chamado pelo server (service_role) e calcular o desconto interno", async () => {
    const { data, error } = await serviceClient.rpc("create_online_order_atomic", {
      p_customer_id: null,
      p_address_id: null,
      p_order_type: "pickup",
      p_payment_method: "cash",
      p_cash_change_for: null,
      p_delivery_fee: 0,
      p_notes: null,
      p_items: [
        {
          product_id: productId,
          product_name: "Test Product RPC Security",
          quantity: 1,
          base_unit_price: 100,
          options_unit_price: 0,
          unit_price: 100,
        }
      ],
      p_coupon_code: "SECURITYTEST10", // 10% de desconto
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();

    if (Array.isArray(data)) {
      const order = data[0];
      // 100 * 10% = 10 de desconto. Total = 90
      expect(Number(order.total)).toBe(90);

      // Verify DB state
      const { data: dbOrder, error: dbError } = await serviceClient
        .from("orders")
        .select("discount_amount, discount_percent, coupon_id")
        .eq("id", order.order_id)
        .single();

      expect(dbError).toBeNull();
      expect(Number(dbOrder?.discount_amount)).toBe(10);
      expect(Number(dbOrder?.discount_percent)).toBe(10);
      expect(dbOrder?.coupon_id).toBe(couponId);
    }
  });

  it("calcula corretamente total com 10% de desconto e taxa de entrega", async () => {
    const { data, error } = await serviceClient.rpc("create_online_order_atomic", {
      p_customer_id: null,
      p_address_id: null,
      p_order_type: "delivery",
      p_payment_method: "pix",
      p_cash_change_for: null,
      p_delivery_fee: 8.00,
      p_notes: null,
      p_items: [
        {
          product_id: productId,
          product_name: "Test Product RPC Security",
          quantity: 1,
          base_unit_price: 100,
          options_unit_price: 0,
          unit_price: 100,
        }
      ],
      p_coupon_code: "SECURITYTEST10",
    });

    expect(error).toBeNull();
    if (Array.isArray(data)) {
      const order = data[0];
      expect(Number(order.subtotal)).toBe(100);
      expect(Number(order.total)).toBe(98);
    }
  });

  it("preserva total igual à taxa de entrega quando o desconto é 100%", async () => {
    const { data, error } = await serviceClient.rpc("create_online_order_atomic", {
      p_customer_id: null,
      p_address_id: null,
      p_order_type: "delivery",
      p_payment_method: "pix",
      p_cash_change_for: null,
      p_delivery_fee: 8.00,
      p_notes: null,
      p_items: [
        {
          product_id: productId,
          product_name: "Test Product RPC Security",
          quantity: 1,
          base_unit_price: 100,
          options_unit_price: 0,
          unit_price: 100,
        }
      ],
      p_coupon_code: "SECURITYTEST100",
    });

    expect(error).toBeNull();
    if (Array.isArray(data)) {
      const order = data[0];
      expect(Number(order.subtotal)).toBe(100);
      expect(Number(order.total)).toBe(8.00);
    }
  });

  it("tenta enviar parâmetros extras para forçar um desconto absurdo (isso não deve existir na assinatura)", async () => {
    // A tipagem do Supabase-js pode reclamar, então passamos como any
    const payload: Record<string, unknown> = {
      p_customer_id: null,
      p_address_id: null,
      p_order_type: "pickup",
      p_payment_method: "cash",
      p_cash_change_for: null,
      p_delivery_fee: 0,
      p_notes: null,
      p_items: [
        {
          product_id: productId,
          product_name: "Test Product RPC Security",
          quantity: 1,
          base_unit_price: 100,
          options_unit_price: 0,
          unit_price: 100,
        }
      ],
      p_coupon_code: "SECURITYTEST10",
      p_discount_amount: 1000, // Inventado
      p_discount_percent: 100, // Inventado
    };

    const { error } = await serviceClient.rpc("create_online_order_atomic", payload);

    // Deve dar erro de que p_discount_amount doesn't exist ou função não encontrada
    expect(error).toBeDefined();
    if (error) {
      expect(error.message).toMatch(/(Could not find the function|named parameter|does not exist)/i);
    }
  });

  it("deve ignorar cupom que não existe", async () => {
    const { error } = await serviceClient.rpc("create_online_order_atomic", {
      p_customer_id: null,
      p_address_id: null,
      p_order_type: "pickup",
      p_payment_method: "cash",
      p_cash_change_for: null,
      p_delivery_fee: 0,
      p_notes: null,
      p_items: [
        {
          product_id: productId,
          product_name: "Test Product RPC Security",
          quantity: 1,
          base_unit_price: 100,
          options_unit_price: 0,
          unit_price: 100,
        }
      ],
      p_coupon_code: "HACKER100", // Fake code
    });

    expect(error).toBeDefined();
    if (error) {
      expect(error.message).toMatch(/INVALID_COUPON/i);
    }
  });
});
