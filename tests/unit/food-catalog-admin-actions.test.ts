import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminPermission: vi.fn(),
  updateCatalogPricingMode: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({
  requireAdminPermission: mocks.requireAdminPermission,
}));
vi.mock("@/lib/admin-audit", () => ({ recordAdminAudit: vi.fn() }));
vi.mock("@/lib/food-catalog/admin-repository", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/food-catalog/admin-repository")
  >("@/lib/food-catalog/admin-repository");
  return {
    ...actual,
    updateCatalogPricingMode: mocks.updateCatalogPricingMode,
  };
});

import { setCatalogPricingMode } from "@/app/admin/(dashboard)/produtos/catalog-actions";

describe("segurança das ações do catálogo configurável", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("nega a ação antes de tocar no catálogo sem permissão catalog", async () => {
    mocks.requireAdminPermission.mockRejectedValueOnce(
      new Error("Sem permissão")
    );
    const formData = new FormData();
    formData.set("product_id", "40000000-0000-4000-8000-000000000001");
    formData.set("pricing_mode", "variant");

    await expect(setCatalogPricingMode(formData)).rejects.toThrow(
      "Sem permissão"
    );
    expect(mocks.requireAdminPermission).toHaveBeenCalledWith("catalog");
    expect(mocks.updateCatalogPricingMode).not.toHaveBeenCalled();
  });
});
