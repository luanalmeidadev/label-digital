import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
  getPreorderCatalog: vi.fn(),
  savePreorderRequest: vi.fn(),
  reserveNextPreorderNumber: vi.fn(),
  beginIdempotentRequest: vi.fn(),
  completeIdempotentRequest: vi.fn(),
  createActionFingerprint: vi.fn(() => "fingerprint"),
  enforcePublicOrderRateLimit: vi.fn(),
  inspectIdempotentRequest: vi.fn(),
  releaseIdempotentRequest: vi.fn(),
  validateIdempotencyKey: vi.fn(),
  verifyTurnstileToken: vi.fn(),
}));

vi.mock("@/lib/preorder-catalog-store", () => ({
  getPreorderCatalog: mocks.getPreorderCatalog,
}));

vi.mock("@/lib/preorder-request-store", () => ({
  savePreorderRequest: mocks.savePreorderRequest,
}));

vi.mock("@/lib/sales-number-store", () => ({
  reserveNextPreorderNumber: mocks.reserveNextPreorderNumber,
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

import { createPreorderRequest } from "@/app/encomendas/actions";

function createForm(overrides: Record<string, string> = {}) {
  const values = {
    idempotency_key: "550e8400-e29b-41d4-a716-446655440000",
    turnstile_token: "token",
    customer_name: "Luan Almeida",
    customer_phone: "(48) 99999-9999",
    product_name: "Linha premium",
    option_label: "Valor do cento",
    quantity: "25",
    desired_date: "2026-08-25",
    fulfillment_type: "pickup",
    delivery_address: "",
    notes: "",
    flavors: JSON.stringify(["Ninho"]),
    ...overrides,
  };
  const formData = new FormData();

  Object.entries(values).forEach(([key, value]) => {
    formData.set(key, value);
  });

  return formData;
}

describe("criação de encomenda", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-17T15:00:00.000Z"));
    vi.clearAllMocks();
    mocks.validateIdempotencyKey.mockReturnValue(true);
    mocks.inspectIdempotentRequest.mockResolvedValue({
      state: "missing",
    });
    mocks.enforcePublicOrderRateLimit.mockResolvedValue({
      success: true,
      ip: "127.0.0.1",
    });
    mocks.verifyTurnstileToken.mockResolvedValue({ success: true });
    mocks.beginIdempotentRequest.mockResolvedValue({ state: "missing" });
    mocks.reserveNextPreorderNumber.mockResolvedValue("ENC-001");
    mocks.getPreorderCatalog.mockResolvedValue([
      {
        id: "doces",
        name: "Doces",
        eyebrow: "Cento",
        products: [
          {
            name: "Linha premium",
            description: "",
            image: "",
            imageAlt: "",
            prices: [
              { label: "Valor do cento", value: "R$ 190,00" },
            ],
            flavors: ["Ninho", "Churros"],
            minimumQuantity: 25,
            allowedQuantities: [25, 50, 75, 100],
            quantityIncrement: 25,
            quantityUnit: "docinho(s)",
            priceBaseQuantity: 100,
            flavorQuantityStep: 25,
            leadTimeDays: 2,
          },
        ],
      },
    ]);
  });

  it("registra uma encomenda válida com total proporcional", async () => {
    const result = await createPreorderRequest(createForm());

    expect(result.success).toBe(true);
    expect(result.requestNumber).toBe("ENC-001");
    expect(mocks.savePreorderRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        requestNumber: "ENC-001",
        quantity: 25,
        flavors: ["Ninho"],
        total: 47.5,
      })
    );
    expect(mocks.completeIdempotentRequest).toHaveBeenCalledOnce();
  });

  it("recusa chave de idempotência inválida", async () => {
    mocks.validateIdempotencyKey.mockReturnValue(false);

    const result = await createPreorderRequest(createForm());

    expect(result.success).toBe(false);
    expect(result.error).toContain("identificar esta solicitação");
    expect(mocks.inspectIdempotentRequest).not.toHaveBeenCalled();
  });

  it("recusa quantidade fora dos múltiplos permitidos", async () => {
    const result = await createPreorderRequest(
      createForm({ quantity: "110" })
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("quantidades de 25 em 25");
    expect(mocks.savePreorderRequest).not.toHaveBeenCalled();
  });

  it("recusa sabores acima do limite da quantidade", async () => {
    const result = await createPreorderRequest(
      createForm({
        flavors: JSON.stringify(["Ninho", "Churros"]),
      })
    );

    expect(result).toEqual({
      success: false,
      error: "Escolha sabores válidos.",
    });
  });
});
