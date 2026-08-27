import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/store/AddToCartButton", () => ({
  default: () => <button type="button">Adicionar direto</button>,
}));

vi.mock("@/components/store/ProductConfiguratorDialog", () => ({
  default: () => <button type="button">Escolher opções</button>,
}));

import MenuSections from "@/components/store/MenuSections";
import type { FoodCatalogConfiguration } from "@/lib/food-catalog/types";

const simpleConfiguration: FoodCatalogConfiguration = {
  pricingMode: "simple",
  variants: [],
  optionGroups: [],
};

const configurableConfiguration: FoodCatalogConfiguration = {
  pricingMode: "variant",
  variants: [
    {
      id: "variant-p",
      productId: "product-1",
      name: "P",
      sku: null,
      price: 24,
      active: true,
      available: true,
      sortOrder: 0,
    },
  ],
  optionGroups: [],
};

function renderProduct(configuration: FoodCatalogConfiguration) {
  return renderToStaticMarkup(
    <MenuSections
      categories={[{ id: "category-1", name: "Lanches", slug: "lanches" }]}
      products={[
        {
          id: "product-1",
          category_id: "category-1",
          name: "Produto teste",
          description: null,
          price: 28,
          image_url: null,
          image_position_x: 50,
          image_position_y: 50,
          image_zoom: 100,
          product_type: "unit",
          available: true,
          featured: false,
          configuration,
        },
      ]}
    />
  );
}

describe("decisão do card de produto público", () => {
  it("mantém adição direta para produto simples", () => {
    const html = renderProduct(simpleConfiguration);

    expect(html).toContain("Adicionar direto");
    expect(html).not.toContain("Escolher opções");
    expect(html).not.toContain("A partir de");
  });

  it("abre o configurador e apresenta preço inicial para produto configurável", () => {
    const html = renderProduct(configurableConfiguration);

    expect(html).toContain("Escolher opções");
    expect(html).not.toContain("Adicionar direto");
    expect(html).toContain("A partir de");
    expect(html).toContain("R$\u00a024,00");
  });
});
