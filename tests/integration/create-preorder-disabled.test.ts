import { describe, expect, it, vi } from "vitest";

import { demoBurgerInstallationPreset } from "@/config/installation/presets/demo-burger";

vi.mock("@/lib/preorder-catalog-store", () => ({
  getPreorderCatalog: vi.fn(),
}));
vi.mock("@/lib/preorder-request-store", () => ({
  savePreorderRequest: vi.fn(),
}));
vi.mock("@/lib/sales-number-store", () => ({
  reserveNextPreorderNumber: vi.fn(),
}));
vi.mock("@/lib/public-action-security", () => ({
  beginIdempotentRequest: vi.fn(),
  completeIdempotentRequest: vi.fn(),
  createActionFingerprint: vi.fn(),
  enforcePublicOrderRateLimit: vi.fn(),
  getPublicRequestIp: vi.fn(),
  inspectIdempotentRequest: vi.fn(),
  releaseIdempotentRequest: vi.fn(),
  validateIdempotencyKey: vi.fn(),
  verifyTurnstileToken: vi.fn(),
}));
vi.mock("@/config/installation/public", () => ({
  getPublicInstallationProfile: () => demoBurgerInstallationPreset,
}));

import { createPreorderRequest } from "@/app/encomendas/actions";

describe("encomendas desativadas", () => {
  it("recusa a ação pública antes de acessar catálogo ou Storage", async () => {
    const result = await createPreorderRequest(new FormData());

    expect(result).toEqual({
      success: false,
      error: "Encomendas não estão disponíveis nesta instalação.",
    });
  });
});
