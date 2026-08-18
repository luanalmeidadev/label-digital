import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  beginIdempotentRequest: vi.fn(),
  completeIdempotentRequest: vi.fn(),
  createActionFingerprint: vi.fn(),
  enforcePublicOrderRateLimit: vi.fn(),
  inspectIdempotentRequest: vi.fn(),
  releaseIdempotentRequest: vi.fn(),
  validateIdempotencyKey: vi.fn(),
  verifyTurnstileToken: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient:
    mocks.createSupabaseAdminClient,
}));

vi.mock("@/lib/public-action-security", () => ({
  beginIdempotentRequest: mocks.beginIdempotentRequest,
  completeIdempotentRequest: mocks.completeIdempotentRequest,
  createActionFingerprint: mocks.createActionFingerprint,
  enforcePublicOrderRateLimit:
    mocks.enforcePublicOrderRateLimit,
  inspectIdempotentRequest: mocks.inspectIdempotentRequest,
  releaseIdempotentRequest: mocks.releaseIdempotentRequest,
  validateIdempotencyKey: mocks.validateIdempotencyKey,
  verifyTurnstileToken: mocks.verifyTurnstileToken,
}));

import { createOrder } from "@/app/store/checkout/actions";

const baseInput = {
  idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
  turnstileToken: "token",
  firstName: "Luan",
  lastName: "Almeida",
  phone: "(48) 99999-9999",
  orderType: "pickup" as const,
  items: [{ productId: "produto-1", quantity: 1 }],
};

function useBusinessHours(
  data: Array<{
    weekday: number;
    is_open: boolean;
    opens_at: string | null;
    closes_at: string | null;
  }> | null,
  error: unknown = null
) {
  const order = vi.fn().mockResolvedValue({ data, error });
  const select = vi.fn(() => ({ order }));
  const from = vi.fn(() => ({ select }));
  mocks.createSupabaseAdminClient.mockReturnValue({ from });
}

describe("criação de pedido diário", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-18T12:00:00.000Z"));
    vi.clearAllMocks();
  });

  it("mantém o carrinho e bloqueia o envio com a loja fechada", async () => {
    useBusinessHours([
      {
        weekday: 2,
        is_open: true,
        opens_at: "10:00",
        closes_at: "19:00",
      },
    ]);

    const result = await createOrder(baseInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("loja está fechada");
      expect(result.error).toContain("carrinho continua salvo");
    }
    expect(mocks.inspectIdempotentRequest).not.toHaveBeenCalled();
  });

  it("falha de forma segura quando o horário não pode ser consultado", async () => {
    useBusinessHours(null, new Error("database unavailable"));

    const result = await createOrder(baseInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain(
        "Não foi possível confirmar o horário"
      );
      expect(result.error).toContain("carrinho continua salvo");
    }
  });

  it("valida nome e sobrenome antes de processar o pedido", async () => {
    useBusinessHours([
      {
        weekday: 2,
        is_open: true,
        opens_at: "09:00",
        closes_at: "19:00",
      },
    ]);

    const result = await createOrder({
      ...baseInput,
      firstName: "L",
    });

    expect(result).toEqual({
      success: false,
      error: "Informe seu nome e sobrenome.",
    });
  });
});
