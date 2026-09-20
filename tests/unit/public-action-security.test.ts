import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  upload: vi.fn(),
  from: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: (key: string) => (key === "x-forwarded-for" ? "127.0.0.1" : null),
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    storage: {
      from: mocks.from,
    },
  }),
}));

import {
  createActionFingerprint,
  enforcePublicOrderRateLimit,
  validateIdempotencyKey,
} from "@/lib/public-action-security";

describe("proteção contra pedidos duplicados", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-secret";
    mocks.from.mockReturnValue({ upload: mocks.upload });
  });

  it("aceita somente UUID v4", () => {
    expect(
      validateIdempotencyKey(
        "550e8400-e29b-41d4-a716-446655440000"
      )
    ).toBe(true);
    expect(validateIdempotencyKey("pedido-123")).toBe(false);
    expect(
      validateIdempotencyKey(
        "550e8400-e29b-11d4-a716-446655440000"
      )
    ).toBe(false);
  });

  it("gera a mesma impressão para a mesma solicitação", () => {
    const request = {
      phone: "5548999999999",
      items: [{ id: "produto-1", quantity: 2 }],
    };

    expect(createActionFingerprint(request)).toBe(
      createActionFingerprint(request)
    );
    expect(createActionFingerprint(request)).not.toBe(
      createActionFingerprint({
        ...request,
        items: [{ id: "produto-1", quantity: 3 }],
      })
    );
  });

  describe("enforcePublicOrderRateLimit (A, B, C, D)", () => {
    it("A) e B) permite pedido quando storage está disponível e solicitações estão abaixo do limite", async () => {
      mocks.upload.mockResolvedValue({ data: { path: "ok" }, error: null });

      const result = await enforcePublicOrderRateLimit(
        "daily-order",
        "48999990000",
        "127.0.0.1"
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.ip).toBe("127.0.0.1");
      }
    });

    it("C) bloqueia solicitação quando o limite de tentativas é excedido", async () => {
      // Simula 5 slots de telefone ocupados (erro 409 conflict)
      mocks.upload.mockResolvedValue({
        data: null,
        error: { message: "The resource already exists", statusCode: "409" },
      });

      const result = await enforcePublicOrderRateLimit(
        "daily-order",
        "48999990000",
        "127.0.0.1"
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Muitas solicitações foram feitas para este WhatsApp");
      }
    });

    it("D) executa fail closed lançando exceção se o storage estiver indisponível (ex: NoSuchBucket)", async () => {
      mocks.upload.mockResolvedValue({
        data: null,
        error: { message: "Bucket not found", statusCode: "404", code: "NoSuchBucket" },
      });

      await expect(
        enforcePublicOrderRateLimit("daily-order", "48999990000", "127.0.0.1")
      ).rejects.toThrow("Não foi possível verificar o limite de solicitações.");
    });
  });
});
