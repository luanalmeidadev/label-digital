import { describe, expect, it } from "vitest";

import {
  buildPersistableOrderItemSnapshot,
  createCatalogConfigurationSignature,
} from "@/lib/food-catalog/snapshot";
import type { PricedCatalogItem } from "@/lib/food-catalog/types";

function createPricedItem(): PricedCatalogItem {
  return {
    productId: "22222222-2222-4222-8222-222222222222",
    productName: "X-Bacon",
    variantId: "33333333-3333-4333-8333-333333333333",
    variantName: "Tradicional",
    quantity: 2,
    baseUnitPrice: 20,
    optionsUnitPrice: 4,
    unitPrice: 24,
    itemTotal: 48,
    itemNotes: "cortar ao meio",
    optionSnapshots: [
      {
        optionGroupId: "44444444-4444-4444-8444-444444444444",
        optionId: "77777777-7777-4777-8777-777777777777",
        groupName: "Adicionais",
        optionName: "Cheddar",
        presentationMode: "addition",
        priceDelta: 4,
        groupSortOrder: 1,
        optionSortOrder: 0,
      },
    ],
  };
}

describe("snapshot imutável do item", () => {
  it("gera payload aditivo para order_items e order_item_options", () => {
    const snapshot = buildPersistableOrderItemSnapshot(createPricedItem());

    expect(snapshot.item).toMatchObject({
      product_name: "X-Bacon",
      variant_name: "Tradicional",
      base_unit_price: 20,
      options_unit_price: 4,
      unit_price: 24,
      item_notes: "cortar ao meio",
    });
    expect(snapshot.item.configuration_signature).toMatch(/^[0-9a-f]{64}$/);
    expect(snapshot.options).toEqual([
      expect.objectContaining({
        group_name: "Adicionais",
        option_name: "Cheddar",
        price_delta: 4,
      }),
    ]);
  });

  it("mantém assinatura igual ao variar somente a quantidade", () => {
    const first = createPricedItem();
    const second = { ...createPricedItem(), quantity: 5, itemTotal: 120 };

    expect(createCatalogConfigurationSignature(first)).toBe(
      createCatalogConfigurationSignature(second)
    );
  });

  it("muda a assinatura quando a configuração muda", () => {
    const first = createPricedItem();
    const second = { ...createPricedItem(), itemNotes: null };

    expect(createCatalogConfigurationSignature(first)).not.toBe(
      createCatalogConfigurationSignature(second)
    );
  });
});

