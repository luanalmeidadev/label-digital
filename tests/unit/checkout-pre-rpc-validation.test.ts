import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  beginIdempotentRequest: vi.fn(),
  completeIdempotentRequest: vi.fn(),
  createActionFingerprint: vi.fn(),
  enforcePublicOrderRateLimit: vi.fn(),
  getPublicRequestIp: vi.fn(),
  inspectIdempotentRequest: vi.fn(),
  releaseIdempotentRequest: vi.fn(),
  validateIdempotencyKey: vi.fn(),
  verifyTurnstileToken: vi.fn(),
  priceConfiguredCatalogItem: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient,
}));

vi.mock("@/lib/food-catalog/pricing", () => ({
  priceConfiguredCatalogItem: mocks.priceConfiguredCatalogItem,
}));

vi.mock("@/lib/public-action-security", () => ({
  beginIdempotentRequest: mocks.beginIdempotentRequest,
  completeIdempotentRequest: mocks.completeIdempotentRequest,
  createActionFingerprint: mocks.createActionFingerprint,
  enforcePublicOrderRateLimit: mocks.enforcePublicOrderRateLimit,
  getPublicRequestIp: mocks.getPublicRequestIp,
  inspectIdempotentRequest: mocks.inspectIdempotentRequest,
  releaseIdempotentRequest: mocks.releaseIdempotentRequest,
  validateIdempotencyKey: mocks.validateIdempotencyKey,
  verifyTurnstileToken: mocks.verifyTurnstileToken,
}));

import { createOrder } from "@/app/store/checkout/actions";

const validBaseInput = {
  idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
  turnstileToken: "development-bypass",
  firstName: "Luan",
  lastName: "Almeida",
  phone: "48999999999",
  orderType: "pickup" as const,
  paymentMethod: "pix" as const,
  items: [{ productId: "60000000-0000-4000-8000-000000000002", catalogVersion: 1, quantity: 1 }],
};

describe("Validação sequencial de pré-checks do Checkout (Pre-RPC)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-secret";
    mocks.getPublicRequestIp.mockResolvedValue("127.0.0.1");
    mocks.verifyTurnstileToken.mockResolvedValue({ success: true });
    mocks.enforcePublicOrderRateLimit.mockResolvedValue({ success: true, ip: "127.0.0.1" });
    mocks.validateIdempotencyKey.mockReturnValue(true);
    mocks.inspectIdempotentRequest.mockResolvedValue({ state: "missing" });
    mocks.beginIdempotentRequest.mockResolvedValue({ state: "missing" });
    mocks.completeIdempotentRequest.mockResolvedValue(undefined);

    const defaultFrom = (table: string) => {
      if (table === "business_hours") {
        return {
          select: () => ({
            order: () => Promise.resolve({
              data: Array.from({ length: 7 }, (_, weekday) => ({
                weekday,
                is_open: true,
                opens_at: "00:00:00",
                closes_at: "23:59:00",
              })),
              error: null,
            }),
          }),
        };
      }
      if (table === "store_settings") {
        return {
          select: () => ({
            limit: () => ({
              maybeSingle: () => Promise.resolve({
                data: { pickup_enabled: true, delivery_enabled: true },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "customers") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: { id: "cust-1" }, error: null }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      };
    };

    mocks.createSupabaseAdminClient.mockImplementation(() => ({
      from: defaultFrom,
      rpc: mocks.rpc,
    }));

    mocks.priceConfiguredCatalogItem.mockResolvedValue({
      productId: "60000000-0000-4000-8000-000000000002",
      productName: "X-Burger",
      variantId: null,
      variantName: null,
      quantity: 1,
      baseUnitPrice: 20,
      optionsUnitPrice: 0,
      unitPrice: 20,
      itemTotal: 20,
      catalogVersion: 1,
      itemNotes: null,
      observedEventId: null,
      observedPromotionalBaseUnitPrice: null,
      optionSnapshots: [],
    });
  });

  it("1. Bloqueia se Turnstile falhar", async () => {
    mocks.verifyTurnstileToken.mockResolvedValue({ success: false, error: "Segurança falhou" });
    const result = await createOrder(validBaseInput);
    expect(result.success).toBe(false);
    expect(mocks.enforcePublicOrderRateLimit).not.toHaveBeenCalled();
  });

  it("2. Bloqueia se Rate Limit falhar", async () => {
    mocks.enforcePublicOrderRateLimit.mockResolvedValue({ success: false, error: "Limite excedido" });
    const result = await createOrder(validBaseInput);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Limite excedido");
  });

  it("3. Bloqueia se Store Hours falhar/estiver vazio", async () => {
    mocks.createSupabaseAdminClient.mockReturnValue({
      from: (table: string) => {
        if (table === "business_hours") {
          return { select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) };
        }
        return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) };
      },
    });

    const result = await createOrder(validBaseInput);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("Não foi possível confirmar o horário");
  });

  it("4. Bloqueia se Store Settings (formas de recebimento) falhar/estiver vazio", async () => {
    mocks.createSupabaseAdminClient.mockReturnValue({
      from: (table: string) => {
        if (table === "business_hours") {
          return {
            select: () => ({
              order: () => Promise.resolve({
                data: Array.from({ length: 7 }, (_, weekday) => ({ weekday, is_open: true, opens_at: "00:00:00", closes_at: "23:59:00" })),
                error: null,
              }),
            }),
          };
        }
        if (table === "store_settings") {
          return { select: () => ({ limit: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) };
        }
        return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) };
      },
    });

    const result = await createOrder(validBaseInput);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("Não foi possível verificar as formas de recebimento");
  });

  it("5. Avança por todas as validações pré-RPC e chama create_online_order_atomic", async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ order_id: "order-100", order_number: 101, total: 20, delivery_fee: 0 }],
      error: null,
    });

    const result = await createOrder(validBaseInput);
    expect(result.success).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith("create_online_order_atomic", expect.anything());
  });
});
