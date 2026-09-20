import { describe, it, expect } from "vitest";
import { createSimpleCartItem, createConfiguredCartItem, type CartCatalogProduct } from "../../lib/cart";

describe("Cart Promotion Regression", () => {
  it("preserves promotional prices for simple products", () => {
    const product: CartCatalogProduct = {
      id: "prod_1",
      name: "X-Burger",
      price: 24.9, // normal base price
      image_url: null,
      catalogVersion: 1,
      available: true,
      configuration: {
        pricingMode: "simple",
        variants: [],
        optionGroups: [],
      },
      observedEventId: "evt_1",
      promotionalBaseUnitPrice: 20.0,
      effectiveBaseUnitPrice: 20.0,
      effectiveAvailable: true,
    };

    const cartItem = createSimpleCartItem(product, 1);

    expect(cartItem.basePrice).toBe(24.9);
    expect(cartItem.observedPromotionalBaseUnitPrice).toBe(20.0);
    expect(cartItem.observedEffectiveBasePrice).toBe(20.0);
    expect(cartItem.price).toBe(20.0); // subtotal should use 20.0
  });

  it("preserves promotional prices for variant products with options", () => {
    const product: CartCatalogProduct = {
      id: "prod_2",
      name: "Pizza",
      price: 28.0, // normal base price
      image_url: null,
      catalogVersion: 1,
      available: true,
      configuration: {
        pricingMode: "variant",
        variants: [
          {
            id: "var_1",
            productId: "prod_2",
            sku: "SKU_VAR_1",
            sortOrder: 1,
            name: "Média",
            price: 28.0,
            active: true,
            available: true,
            observedEventId: "evt_1",
            promotionalBaseUnitPrice: 20.0,
            effectiveBaseUnitPrice: 20.0,
            effectiveAvailable: true,
          }
        ],
        optionGroups: [
          {
            id: "grp_1",
            productId: "prod_2",
            sortOrder: 1,
            name: "Borda",
            active: true,
            minSelections: 0,
            maxSelections: 1,
            selectionMode: "single",
            presentationMode: "addition",
            options: [
              {
                id: "opt_1",
                optionGroupId: "grp_1",
                sortOrder: 1,
                name: "Catupiry",
                priceDelta: 5.0,
                active: true,
                available: true,
              }
            ]
          }
        ],
      },
      observedEventId: null,
      promotionalBaseUnitPrice: null,
      effectiveBaseUnitPrice: 28.0,
      effectiveAvailable: true,
    };

    const cartItem = createConfiguredCartItem({
      product,
      configuration: product.configuration,
      selection: {
        variantId: "var_1",
        optionIds: ["opt_1"],
      }
    });

    expect(cartItem.basePrice).toBe(28.0);
    expect(cartItem.observedPromotionalBaseUnitPrice).toBe(20.0);
    expect(cartItem.observedEffectiveBasePrice).toBe(20.0);
    expect(cartItem.optionsPrice).toBe(5.0);
    expect(cartItem.price).toBe(25.0); // 20.0 + 5.0
  });
});
