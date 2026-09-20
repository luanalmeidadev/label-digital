import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const localSupabaseUrl = process.env.LOCAL_SUPABASE_URL;
const localServiceRoleKey = process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;
const runLocalIntegration = Boolean(
  localSupabaseUrl && localServiceRoleKey
);
const testSuite = runLocalIntegration ? describe : describe.skip;

testSuite("resolve_active_promotion", () => {
  const service = createClient(
    localSupabaseUrl ?? "http://127.0.0.1:54321",
    localServiceRoleKey ?? "local-integration-not-configured",
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );

  const productSimpleId = crypto.randomUUID();
  const productVariantId = crypto.randomUUID();
  const variantId = crypto.randomUUID();

  beforeAll(async () => {
    // Setup products
    await service.from("categories").insert({ id: crypto.randomUUID(), name: "Test Category", slug: "test-category", active: true });

    // Create simple product
    await service.from("products").insert({
      id: productSimpleId,
      name: "Simple Product",
      description: "Test",
      price: 100,
      pricing_mode: "simple",
      active: true,
      available: true
    });

    // Create variant product
    await service.from("products").insert({
      id: productVariantId,
      name: "Variant Product",
      description: "Test",
      price: 0,
      pricing_mode: "variant",
      active: true,
      available: true
    });

    await service.from("product_variants").insert({
      id: variantId,
      product_id: productVariantId,
      name: "Variant A",
      price: 150,
      active: true,
      available: true
    });
  });

  afterAll(async () => {
    // Cleanup products
    await service.from("product_variants").delete().eq("id", variantId);
    await service.from("products").delete().in("id", [productSimpleId, productVariantId]);
  });

  async function resolvePromotion(productId: string, variantId: string | null, now: string, tz = "America/Sao_Paulo") {
    const { data, error } = await service.rpc("resolve_active_promotion", {
      p_product_id: productId,
      p_variant_id: variantId,
      p_timezone: tz,
      p_at: now
    });

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  }

  it("resolve weekly ativo para produto simple", async () => {
    const eventId = crypto.randomUUID();
    await service.from("promotional_events").insert({
      id: eventId,
      name: "Weekly Ativo",
      schedule_type: "weekly",
      active: true,
      weekdays: [1], // Monday
      start_time: "10:00",
      end_time: "14:00"
    });
    await service.from("promotional_event_products").insert({
      event_id: eventId,
      product_id: productSimpleId,
      promotional_price: 80,
      availability_mode: "inherit"
    });

    // Simulate Monday 12:00 in America/Sao_Paulo
    // 2026-09-14 is a Monday
    const result = await resolvePromotion(productSimpleId, null, "2026-09-14T12:00:00-03:00");

    expect(result).not.toBeNull();
    expect(result.event_id).toBe(eventId);
    expect(result.promotional_price).toBe(80);

    // Cleanup
    await service.from("promotional_event_products").delete().eq("event_id", eventId);
    await service.from("promotional_events").delete().eq("id", eventId);
  });

  it("ignora weekly no dia errado", async () => {
    const eventId = crypto.randomUUID();
    await service.from("promotional_events").insert({
      id: eventId,
      name: "Weekly Errado",
      schedule_type: "weekly",
      active: true,
      weekdays: [1], // Monday
      start_time: "10:00",
      end_time: "14:00"
    });
    await service.from("promotional_event_products").insert({
      event_id: eventId,
      product_id: productSimpleId,
      promotional_price: 80,
      availability_mode: "inherit"
    });

    // Simulate Tuesday
    const result = await resolvePromotion(productSimpleId, null, "2026-09-15T12:00:00-03:00");
    expect(result).toBeNull();

    // Cleanup
    await service.from("promotional_event_products").delete().eq("event_id", eventId);
    await service.from("promotional_events").delete().eq("id", eventId);
  });

  it("ignora weekly no horário errado", async () => {
    const eventId = crypto.randomUUID();
    await service.from("promotional_events").insert({
      id: eventId,
      name: "Weekly Hora Errada",
      schedule_type: "weekly",
      active: true,
      weekdays: [1], // Monday
      start_time: "10:00",
      end_time: "14:00"
    });
    await service.from("promotional_event_products").insert({
      event_id: eventId,
      product_id: productSimpleId,
      promotional_price: 80,
      availability_mode: "inherit"
    });

    // Simulate Monday 09:00
    const result = await resolvePromotion(productSimpleId, null, "2026-09-14T09:00:00-03:00");
    expect(result).toBeNull();

    // Cleanup
    await service.from("promotional_event_products").delete().eq("event_id", eventId);
    await service.from("promotional_events").delete().eq("id", eventId);
  });

  it("resolve period ativo", async () => {
    const eventId = crypto.randomUUID();
    await service.from("promotional_events").insert({
      id: eventId,
      name: "Period Ativo",
      schedule_type: "period",
      active: true,
      starts_at: "2026-09-10T00:00:00-03:00",
      ends_at: "2026-09-20T23:59:59-03:00"
    });
    await service.from("promotional_event_products").insert({
      event_id: eventId,
      product_id: productVariantId,
      variant_id: variantId,
      promotional_price: 120,
      availability_mode: "inherit"
    });

    const result = await resolvePromotion(productVariantId, variantId, "2026-09-15T12:00:00-03:00");
    expect(result).not.toBeNull();
    expect(result.event_id).toBe(eventId);
    expect(result.promotional_price).toBe(120);

    // Cleanup
    await service.from("promotional_event_products").delete().eq("event_id", eventId);
    await service.from("promotional_events").delete().eq("id", eventId);
  });

  it("ignora period expirado ou futuro", async () => {
    const eventId = crypto.randomUUID();
    await service.from("promotional_events").insert({
      id: eventId,
      name: "Period",
      schedule_type: "period",
      active: true,
      starts_at: "2026-09-10T00:00:00-03:00",
      ends_at: "2026-09-20T23:59:59-03:00"
    });
    await service.from("promotional_event_products").insert({
      event_id: eventId,
      product_id: productVariantId,
      variant_id: variantId,
      promotional_price: 120,
      availability_mode: "inherit"
    });

    // Futuro
    const resultFuture = await resolvePromotion(productVariantId, variantId, "2026-09-01T12:00:00-03:00");
    expect(resultFuture).toBeNull();

    // Expirado
    const resultPast = await resolvePromotion(productVariantId, variantId, "2026-09-25T12:00:00-03:00");
    expect(resultPast).toBeNull();

    // Cleanup
    await service.from("promotional_event_products").delete().eq("event_id", eventId);
    await service.from("promotional_events").delete().eq("id", eventId);
  });

  it("retorna PROMOTION_CONFLICT (fail closed) se múltiplos eventos coincidirem", async () => {
    const event1Id = crypto.randomUUID();
    const event2Id = crypto.randomUUID();

    await service.from("promotional_events").insert([
      {
        id: event1Id,
        name: "Promo 1",
        schedule_type: "weekly",
        active: true,
        weekdays: [1],
        start_time: "00:00",
        end_time: "23:59"
      },
      {
        id: event2Id,
        name: "Promo 2",
        schedule_type: "weekly",
        active: true,
        weekdays: [1],
        start_time: "10:00",
        end_time: "15:00"
      }
    ]);

    await service.from("promotional_event_products").insert([
      { event_id: event1Id, product_id: productSimpleId, promotional_price: 80 },
      { event_id: event2Id, product_id: productSimpleId, promotional_price: 70 }
    ]);

    // Ocorre conflito
    await expect(resolvePromotion(productSimpleId, null, "2026-09-14T12:00:00-03:00")).rejects.toThrowError(/PROMOTION_CONFLICT/);

    // Cleanup
    await service.from("promotional_event_products").delete().in("event_id", [event1Id, event2Id]);
    await service.from("promotional_events").delete().in("id", [event1Id, event2Id]);
  });
});
