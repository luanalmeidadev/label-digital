import { describe, expect, it } from "vitest";

import {
  priceConfiguredCatalogItem,
} from "@/lib/food-catalog/pricing";
import {
  CatalogPricingError,
  type FoodCatalogProduct,
} from "@/lib/food-catalog/types";

const ids = {
  simpleProduct: "11111111-1111-4111-8111-111111111111",
  burger: "22222222-2222-4222-8222-222222222222",
  variant: "33333333-3333-4333-8333-333333333333",
  pointGroup: "44444444-4444-4444-8444-444444444444",
  additionsGroup: "55555555-5555-4555-8555-555555555555",
  mediumPoint: "66666666-6666-4666-8666-666666666666",
  cheddar: "77777777-7777-4777-8777-777777777777",
  bacon: "88888888-8888-4888-8888-888888888888",
  unavailable: "99999999-9999-4999-8999-999999999999",
};

function createRepository(...products: FoodCatalogProduct[]) {
  return {
    async getProductById(productId: string) {
      return products.find((product) => product.id === productId) ?? null;
    },
  };
}

function createSimpleProduct(): FoodCatalogProduct {
  return {
    catalogVersion: 1,
    id: ids.simpleProduct,
    name: "Bolo de pote",
    price: 18.55,
    pricingMode: "simple",
    active: true,
    available: true,
    variants: [],
    optionGroups: [],
  };
}

function createBurger(): FoodCatalogProduct {
  return {
    catalogVersion: 1,
    id: ids.burger,
    name: "X-Bacon",
    price: 0,
    pricingMode: "variant",
    active: true,
    available: true,
    variants: [
      {
        id: ids.variant,
        productId: ids.burger,
        name: "Tradicional",
        sku: "XB-TRAD",
        price: 20,
        active: true,
        available: true,
        sortOrder: 0,
      },
    ],
    optionGroups: [
      {
        id: ids.pointGroup,
        productId: ids.burger,
        name: "Ponto da carne",
        selectionMode: "single",
        minSelections: 1,
        maxSelections: 1,
        presentationMode: "choice",
        active: true,
        sortOrder: 0,
        options: [
          {
            id: ids.mediumPoint,
            optionGroupId: ids.pointGroup,
            name: "Ao ponto",
            priceDelta: 0,
            active: true,
            available: true,
            sortOrder: 0,
          },
        ],
      },
      {
        id: ids.additionsGroup,
        productId: ids.burger,
        name: "Adicionais",
        selectionMode: "multiple",
        minSelections: 0,
        maxSelections: 2,
        presentationMode: "addition",
        active: true,
        sortOrder: 1,
        options: [
          {
            id: ids.cheddar,
            optionGroupId: ids.additionsGroup,
            name: "Cheddar",
            priceDelta: 4,
            active: true,
            available: true,
            sortOrder: 0,
          },
          {
            id: ids.bacon,
            optionGroupId: ids.additionsGroup,
            name: "Bacon",
            priceDelta: 5,
            active: true,
            available: true,
            sortOrder: 1,
          },
          {
            id: ids.unavailable,
            optionGroupId: ids.additionsGroup,
            name: "Cebola crispy",
            priceDelta: 3,
            active: true,
            available: false,
            sortOrder: 2,
          },
        ],
      },
    ],
  };
}

async function expectPricingError(
  operation: Promise<unknown>,
  code: CatalogPricingError["code"]
) {
  try {
    await operation;
    throw new Error("A operação deveria ter falhado.");
  } catch (error) {
    expect(error).toBeInstanceOf(CatalogPricingError);
    expect((error as CatalogPricingError).code).toBe(code);
  }
}

describe("precificação autoritativa do catálogo", () => {
  it("mantém o produto legado simples com o mesmo preço", async () => {
    const product = createSimpleProduct();
    const result = await priceConfiguredCatalogItem(
      createRepository(product),
      {
        productId: product.id,
        quantity: 2,
      }
    );

    expect(result).toMatchObject({
      productName: "Bolo de pote",
      variantId: null,
      baseUnitPrice: 18.55,
      optionsUnitPrice: 0,
      unitPrice: 18.55,
      itemTotal: 37.1,
      optionSnapshots: [],
    });
  });

  it("reconstrói variante, opções gratuitas e pagas sem preço do cliente", async () => {
    const product = createBurger();
    const result = await priceConfiguredCatalogItem(
      createRepository(product),
      {
        productId: product.id,
        variantId: ids.variant,
        optionIds: [ids.bacon, ids.mediumPoint, ids.cheddar],
        quantity: 2,
        itemNotes: "  cortar ao meio  ",
      }
    );

    expect(result).toMatchObject({
      variantName: "Tradicional",
      baseUnitPrice: 20,
      optionsUnitPrice: 9,
      unitPrice: 29,
      itemTotal: 58,
      itemNotes: "cortar ao meio",
    });
    expect(result.optionSnapshots.map((option) => option.optionName)).toEqual([
      "Ao ponto",
      "Cheddar",
      "Bacon",
    ]);
  });

  it("exige variante em produto configurado", async () => {
    const product = createBurger();

    await expectPricingError(
      priceConfiguredCatalogItem(createRepository(product), {
        productId: product.id,
        optionIds: [ids.mediumPoint],
        quantity: 1,
      }),
      "VARIANT_REQUIRED"
    );
  });

  it("rejeita grupo obrigatório não preenchido", async () => {
    const product = createBurger();

    await expectPricingError(
      priceConfiguredCatalogItem(createRepository(product), {
        productId: product.id,
        variantId: ids.variant,
        quantity: 1,
      }),
      "GROUP_SELECTION_REQUIRED"
    );
  });

  it("rejeita opção duplicada, desconhecida e indisponível", async () => {
    const product = createBurger();
    const base = {
      productId: product.id,
      variantId: ids.variant,
      quantity: 1,
    };

    await expectPricingError(
      priceConfiguredCatalogItem(createRepository(product), {
        ...base,
        optionIds: [ids.mediumPoint, ids.cheddar, ids.cheddar],
      }),
      "DUPLICATE_OPTION"
    );

    await expectPricingError(
      priceConfiguredCatalogItem(createRepository(product), {
        ...base,
        optionIds: [
          ids.mediumPoint,
          "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        ],
      }),
      "OPTION_INVALID"
    );

    await expectPricingError(
      priceConfiguredCatalogItem(createRepository(product), {
        ...base,
        optionIds: [ids.mediumPoint, ids.unavailable],
      }),
      "OPTION_UNAVAILABLE"
    );
  });

  it("rejeita variante indisponível e produto inativo", async () => {
    const unavailableVariantProduct = createBurger();
    unavailableVariantProduct.variants[0].available = false;

    await expectPricingError(
      priceConfiguredCatalogItem(
        createRepository(unavailableVariantProduct),
        {
          productId: unavailableVariantProduct.id,
          variantId: ids.variant,
          optionIds: [ids.mediumPoint],
          quantity: 1,
        }
      ),
      "VARIANT_UNAVAILABLE"
    );

    const inactiveProduct = createSimpleProduct();
    inactiveProduct.active = false;

    await expectPricingError(
      priceConfiguredCatalogItem(createRepository(inactiveProduct), {
        productId: inactiveProduct.id,
        quantity: 1,
      }),
      "PRODUCT_UNAVAILABLE"
    );
  });

  it("rejeita quantidade, observação e identificador inválidos", async () => {
    const product = createSimpleProduct();
    const repository = createRepository(product);

    await expectPricingError(
      priceConfiguredCatalogItem(repository, {
        productId: product.id,
        quantity: 0,
      }),
      "INVALID_QUANTITY"
    );

    await expectPricingError(
      priceConfiguredCatalogItem(repository, {
        productId: product.id,
        quantity: 1,
        itemNotes: "a".repeat(301),
      }),
      "INVALID_NOTES"
    );

    await expectPricingError(
      priceConfiguredCatalogItem(repository, {
        productId: "não-é-uuid",
        quantity: 1,
      }),
      "INVALID_IDENTIFIER"
    );
  });
});
