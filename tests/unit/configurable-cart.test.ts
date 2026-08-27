import { describe, expect, it } from "vitest";

import {
  CART_STORAGE_VERSION,
  createCartConfigurationSignature,
  createConfiguredCartItem,
  createSimpleCartItem,
  deserializeCart,
  estimateCatalogSelection,
  getCatalogStartingPrice,
  isConfigurableProduct,
  mergeCartItem,
  serializeCart,
  synchronizeCartWithCatalog,
  type CartProduct,
} from "@/lib/cart";
import type { FoodCatalogConfiguration } from "@/lib/food-catalog/types";

const product: CartProduct = {
  catalogVersion: 1,
  id: "product-x-bacon",
  name: "X-Bacon",
  price: 28,
  image_url: "/x-bacon.jpg",
};

const configurableCatalog: FoodCatalogConfiguration = {
  pricingMode: "variant",
  variants: [
    {
      id: "variant-normal",
      productId: product.id,
      name: "Normal",
      sku: null,
      price: 28,
      active: true,
      available: true,
      sortOrder: 0,
    },
    {
      id: "variant-duplo",
      productId: product.id,
      name: "Duplo",
      sku: null,
      price: 34,
      active: true,
      available: true,
      sortOrder: 1,
    },
    {
      id: "variant-indisponivel",
      productId: product.id,
      name: "Triplo",
      sku: null,
      price: 40,
      active: true,
      available: false,
      sortOrder: 2,
    },
  ],
  optionGroups: [
    {
      id: "group-point",
      productId: product.id,
      name: "Ponto da carne",
      selectionMode: "single",
      minSelections: 1,
      maxSelections: 1,
      presentationMode: "choice",
      active: true,
      sortOrder: 0,
      options: [
        {
          id: "option-medium",
          optionGroupId: "group-point",
          name: "Ao ponto",
          priceDelta: 0,
          active: true,
          available: true,
          sortOrder: 0,
        },
        {
          id: "option-well-done",
          optionGroupId: "group-point",
          name: "Bem passado",
          priceDelta: 0,
          active: true,
          available: true,
          sortOrder: 1,
        },
      ],
    },
    {
      id: "group-additions",
      productId: product.id,
      name: "Adicionais",
      selectionMode: "multiple",
      minSelections: 0,
      maxSelections: 2,
      presentationMode: "addition",
      active: true,
      sortOrder: 1,
      options: [
        {
          id: "option-cheddar",
          optionGroupId: "group-additions",
          name: "Cheddar",
          priceDelta: 4,
          active: true,
          available: true,
          sortOrder: 0,
        },
        {
          id: "option-bacon",
          optionGroupId: "group-additions",
          name: "Bacon",
          priceDelta: 5,
          active: true,
          available: true,
          sortOrder: 1,
        },
        {
          id: "option-egg",
          optionGroupId: "group-additions",
          name: "Ovo",
          priceDelta: 3,
          active: true,
          available: true,
          sortOrder: 2,
        },
        {
          id: "option-unavailable",
          optionGroupId: "group-additions",
          name: "Cebola crispy",
          priceDelta: 2,
          active: true,
          available: false,
          sortOrder: 3,
        },
      ],
    },
  ],
};

const simpleCatalog: FoodCatalogConfiguration = {
  pricingMode: "simple",
  variants: [],
  optionGroups: [],
};

function validSelection(overrides: Record<string, unknown> = {}) {
  return {
    variantId: "variant-normal",
    optionIds: ["option-medium", "option-cheddar", "option-bacon"],
    itemNotes: "sem cebola",
    quantity: 1,
    ...overrides,
  };
}

describe("configurador público do catálogo", () => {
  it("mantém produto simples sem configurador e com o mesmo preço", () => {
    expect(isConfigurableProduct(simpleCatalog)).toBe(false);
    expect(getCatalogStartingPrice(product.price, simpleCatalog)).toBe(28);

    const item = createSimpleCartItem(product);
    expect(item).toMatchObject({
      id: product.id,
      price: 28,
      basePrice: 28,
      optionsPrice: 0,
      variant: null,
      options: [],
      itemNotes: null,
      quantity: 1,
    });
  });

  it("calcula variante, adicionais, observação e quantidade apenas para exibição", () => {
    const estimate = estimateCatalogSelection(
      product,
      configurableCatalog,
      validSelection({ quantity: 2, itemNotes: "  sem cebola  " })
    );

    expect(estimate.valid).toBe(true);
    expect(estimate.basePrice).toBe(28);
    expect(estimate.optionsPrice).toBe(9);
    expect(estimate.unitPrice).toBe(37);
    expect(estimate.totalPrice).toBe(74);
    expect(estimate.itemNotes).toBe("sem cebola");
  });

  it("usa a menor variante disponível como preço inicial", () => {
    expect(isConfigurableProduct(configurableCatalog)).toBe(true);
    expect(getCatalogStartingPrice(99, configurableCatalog)).toBe(28);
  });

  it("exige variante e grupo obrigatório", () => {
    const estimate = estimateCatalogSelection(product, configurableCatalog, {
      quantity: 1,
    });

    expect(estimate.valid).toBe(false);
    expect(estimate.errors.variant).toBeTruthy();
    expect(estimate.errors.groups["group-point"]).toBeTruthy();
  });

  it("rejeita mais de uma escolha em grupo único", () => {
    const estimate = estimateCatalogSelection(
      product,
      configurableCatalog,
      validSelection({
        optionIds: ["option-medium", "option-well-done"],
      })
    );

    expect(estimate.valid).toBe(false);
    expect(estimate.errors.groups["group-point"]).toMatch(/somente uma/i);
  });

  it("rejeita máximo excedido em grupo múltiplo", () => {
    const estimate = estimateCatalogSelection(
      product,
      configurableCatalog,
      validSelection({
        optionIds: [
          "option-medium",
          "option-cheddar",
          "option-bacon",
          "option-egg",
        ],
      })
    );

    expect(estimate.valid).toBe(false);
    expect(estimate.errors.groups["group-additions"]).toMatch(/máximo 2/i);
  });

  it("rejeita opção e variante indisponíveis", () => {
    const unavailableOption = estimateCatalogSelection(
      product,
      configurableCatalog,
      validSelection({
        optionIds: ["option-medium", "option-unavailable"],
      })
    );
    const unavailableVariant = estimateCatalogSelection(
      product,
      configurableCatalog,
      validSelection({ variantId: "variant-indisponivel" })
    );

    expect(unavailableOption.valid).toBe(false);
    expect(unavailableOption.errors.groups["group-additions"]).toMatch(
      /indisponível/i
    );
    expect(unavailableVariant.valid).toBe(false);
    expect(unavailableVariant.errors.variant).toMatch(/indisponível/i);
  });
});

describe("identidade e persistência do carrinho V2", () => {
  it("gera assinatura determinística sem depender da ordem das opções", () => {
    const first = createCartConfigurationSignature({
      productId: product.id,
      variantId: "variant-normal",
      optionIds: ["option-bacon", "option-cheddar"],
      itemNotes: " sem cebola ",
    });
    const second = createCartConfigurationSignature({
      productId: product.id,
      variantId: "variant-normal",
      optionIds: ["option-cheddar", "option-bacon", "option-bacon"],
      itemNotes: "sem cebola",
    });

    expect(first).toBe(second);
  });

  it("agrupa configurações iguais e separa adicionais ou observações diferentes", () => {
    const cheddar = createConfiguredCartItem({
      product,
      configuration: configurableCatalog,
      selection: validSelection({
        optionIds: ["option-medium", "option-cheddar"],
        itemNotes: null,
      }),
    });
    const sameCheddar = createConfiguredCartItem({
      product,
      configuration: configurableCatalog,
      selection: validSelection({
        optionIds: ["option-cheddar", "option-medium"],
        itemNotes: null,
      }),
    });
    const noCheddar = createConfiguredCartItem({
      product,
      configuration: configurableCatalog,
      selection: validSelection({
        optionIds: ["option-medium"],
        itemNotes: null,
      }),
    });
    const note = createConfiguredCartItem({
      product,
      configuration: configurableCatalog,
      selection: validSelection({
        optionIds: ["option-medium", "option-cheddar"],
        itemNotes: "sem cebola",
      }),
    });

    const items = [sameCheddar, noCheddar, note].reduce(
      (current, item) => mergeCartItem(current, item),
      mergeCartItem([], cheddar)
    );

    expect(items).toHaveLength(3);
    expect(items.find((item) => item.lineKey === cheddar.lineKey)?.quantity).toBe(
      2
    );
  });

  it("persiste e reidrata o envelope versionado", () => {
    const item = createConfiguredCartItem({
      product,
      configuration: configurableCatalog,
      selection: validSelection(),
    });
    const raw = serializeCart([item]);
    const restored = deserializeCart(raw);

    expect(JSON.parse(raw).version).toBe(CART_STORAGE_VERSION);
    expect(restored).toEqual([item]);
  });

  it("migra o carrinho legado simples sem quebrar a aplicação", () => {
    const restored = deserializeCart(
      JSON.stringify([{ ...product, quantity: 2 }])
    );

    expect(restored).toHaveLength(1);
    expect(restored[0]).toMatchObject({
      id: product.id,
      quantity: 2,
      variant: null,
      options: [],
      itemNotes: null,
      pricingMode: "simple",
      catalogVersion: 0,
    });
  });

  it("migra o envelope V2 e recebe a versão atual ao sincronizar", () => {
    const current = createConfiguredCartItem({
      product,
      configuration: configurableCatalog,
      selection: validSelection(),
    });
    const { catalogVersion, ...legacyItem } = current;
    expect(catalogVersion).toBe(1);
    const restored = deserializeCart(
      JSON.stringify({ version: 2, items: [legacyItem] })
    );

    expect(restored[0].catalogVersion).toBe(0);

    const synchronized = synchronizeCartWithCatalog(restored, [
      {
        ...product,
        catalogVersion: 7,
        available: true,
        configuration: configurableCatalog,
      },
    ]);

    expect(synchronized[0].catalogVersion).toBe(7);
  });

  it("ignora JSON corrompido e itens inválidos de forma controlada", () => {
    expect(deserializeCart("{quebrado")).toEqual([]);
    expect(
      deserializeCart(
        JSON.stringify({ version: CART_STORAGE_VERSION, items: [{ id: 123 }] })
      )
    ).toEqual([]);
  });

  it("ressincroniza preços configurados com o catálogo público atual", () => {
    const item = createConfiguredCartItem({
      product,
      configuration: configurableCatalog,
      selection: validSelection({
        optionIds: ["option-medium", "option-cheddar"],
      }),
    });
    const updatedCatalog: FoodCatalogConfiguration = {
      ...configurableCatalog,
      optionGroups: configurableCatalog.optionGroups.map((group) =>
        group.id === "group-additions"
          ? {
              ...group,
              options: group.options.map((option) =>
                option.id === "option-cheddar"
                  ? { ...option, priceDelta: 6 }
                  : option
              ),
            }
          : group
      ),
    };

    const synchronized = synchronizeCartWithCatalog([item], [
      {
        ...product,
        catalogVersion: 2,
        available: true,
        configuration: updatedCatalog,
      },
    ]);

    expect(synchronized[0].price).toBe(34);
    expect(synchronized[0].optionsPrice).toBe(6);
    expect(synchronized[0].catalogVersion).toBe(2);
  });
});
