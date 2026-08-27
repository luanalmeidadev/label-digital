import { describe, expect, it } from "vitest";

import {
  demoBurgerAdmin,
  demoBurgerCatalog,
} from "../../scripts/demo-burger-catalog.mjs";

describe("catálogo comercial Brasa Burger", () => {
  it("mantém um catálogo fictício, completo e sem dados da La'Bel", () => {
    expect(demoBurgerCatalog.categories.map((category) => category.name)).toEqual([
      "Hambúrgueres",
      "Combos",
      "Porções",
      "Bebidas",
    ]);
    expect(demoBurgerCatalog.products).toHaveLength(5);
    expect(demoBurgerAdmin.email).toMatch(/@brasa-burger\.test$/);

    const serialized = JSON.stringify({ demoBurgerAdmin, demoBurgerCatalog });
    expect(serialized).not.toMatch(/La'Bel|Confeitaria|label_confeitaria/i);
    expect(serialized).not.toMatch(/489\d{8}/);
  });

  it("modela simples, variantes, adicionais e remoções sem simular combo avançado", () => {
    const xBurger = demoBurgerCatalog.products.find(
      (product) => product.name === "X-Burger"
    );
    const xBacon = demoBurgerCatalog.products.find(
      (product) => product.name === "X-Bacon"
    );
    const combo = demoBurgerCatalog.products.find(
      (product) => product.name === "Combo Burger"
    );

    expect(xBurger?.pricing_mode).toBe("simple");
    expect(xBacon?.pricing_mode).toBe("variant");
    expect(combo?.pricing_mode).toBe("simple");
    expect(demoBurgerCatalog.variants.filter((variant) => variant.product_id === xBacon?.id)).toHaveLength(2);

    expect(demoBurgerCatalog.optionGroups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Ponto da carne",
          selection_mode: "single",
          min_selections: 1,
          max_selections: 1,
        }),
        expect.objectContaining({
          name: "Adicionais",
          presentation_mode: "addition",
          max_selections: 3,
        }),
        expect.objectContaining({
          name: "Remover ingredientes",
          presentation_mode: "removal",
        }),
      ])
    );
    expect(demoBurgerCatalog.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Cheddar", price_delta: 4 }),
        expect.objectContaining({ name: "Bacon", price_delta: 5 }),
        expect.objectContaining({ name: "Ovo", price_delta: 3 }),
      ])
    );
  });

  it("usa somente assets neutros e locais para todos os produtos", () => {
    for (const product of demoBurgerCatalog.products) {
      expect(product.image_url).toMatch(/^\/demo-burger\/products\/.+\.svg$/);
    }
  });
});
