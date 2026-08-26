import { createHash } from "node:crypto";

import type {
  PersistableOrderItemSnapshot,
  PricedCatalogItem,
} from "@/lib/food-catalog/types";

export function createCatalogConfigurationSignature(
  item: PricedCatalogItem
) {
  const canonicalConfiguration = JSON.stringify({
    productId: item.productId,
    variantId: item.variantId,
    optionIds: item.optionSnapshots
      .map((option) => option.optionId)
      .filter((optionId): optionId is string => optionId !== null)
      .sort(),
    itemNotes: item.itemNotes,
  });

  return createHash("sha256")
    .update(canonicalConfiguration, "utf8")
    .digest("hex");
}

export function buildPersistableOrderItemSnapshot(
  item: PricedCatalogItem
): PersistableOrderItemSnapshot {
  return {
    item: {
      product_id: item.productId,
      product_name: item.productName,
      variant_id: item.variantId,
      variant_name: item.variantName,
      quantity: item.quantity,
      base_unit_price: item.baseUnitPrice,
      options_unit_price: item.optionsUnitPrice,
      unit_price: item.unitPrice,
      item_notes: item.itemNotes,
      configuration_signature: createCatalogConfigurationSignature(item),
    },
    options: item.optionSnapshots.map((option) => ({
      option_group_id: option.optionGroupId,
      option_id: option.optionId,
      group_name: option.groupName,
      option_name: option.optionName,
      presentation_mode: option.presentationMode,
      price_delta: option.priceDelta,
      group_sort_order: option.groupSortOrder,
      option_sort_order: option.optionSortOrder,
    })),
  };
}

