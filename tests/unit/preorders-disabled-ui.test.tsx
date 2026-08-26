import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { demoBurgerInstallationPreset } from "@/config/installation/presets/demo-burger";

vi.mock("@/config/installation/public", () => ({
  getPublicInstallationProfile: () => demoBurgerInstallationPreset,
}));

import CategoryGrid from "@/components/store/CategoryGrid";
import PreorderBanner from "@/components/store/PreorderBanner";

describe("interface com encomendas desativadas", () => {
  it("não renderiza banner nem atalho de encomendas", () => {
    expect(PreorderBanner()).toBeNull();

    const html = renderToStaticMarkup(
      <CategoryGrid
        categories={[
          { id: "burgers", name: "Burgers", slug: "burgers" },
        ]}
      />
    );

    expect(html).toContain("Burgers");
    expect(html).not.toContain("/encomendas");
    expect(html).not.toMatch(/encomenda/i);
  });
});
