import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createActionFingerprint,
  validateIdempotencyKey,
} from "@/lib/public-action-security";

describe("proteção contra pedidos duplicados", () => {
  beforeEach(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY =
      "test-service-role-secret";
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
});
