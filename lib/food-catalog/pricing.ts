import type { FoodCatalogProductRepository } from "@/lib/food-catalog/repository";
import {
  CatalogPricingError,
  type FoodCatalogProduct,
  type OrderItemOptionSnapshot,
  type PricedCatalogItem,
  type SelectedCatalogItemConfiguration,
} from "@/lib/food-catalog/types";

const maximumItemQuantity = 999;
const maximumOptionsPerItem = 50;
const maximumItemNotesLength = 300;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertIdentifier(value: string, field: string) {
  if (!uuidPattern.test(value)) {
    throw new CatalogPricingError(
      "INVALID_IDENTIFIER",
      `Identificador inválido em ${field}.`,
      { field }
    );
  }
}

function toMoneyCents(value: number, field: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new CatalogPricingError(
      "INVALID_CATALOG_PRICE",
      `Preço inválido no catálogo: ${field}.`,
      { field }
    );
  }

  const cents = Math.round(value * 100);

  if (Math.abs(cents / 100 - value) > Number.EPSILON * 100) {
    throw new CatalogPricingError(
      "INVALID_CATALOG_PRICE",
      `Preço com precisão inválida no catálogo: ${field}.`,
      { field }
    );
  }

  return cents;
}

function fromMoneyCents(value: number) {
  return value / 100;
}

function normalizeNotes(value: string | null | undefined) {
  if (value == null) {
    return null;
  }

  const normalized = value.trim();

  if (normalized.length > maximumItemNotesLength) {
    throw new CatalogPricingError(
      "INVALID_NOTES",
      `A observação do item deve ter no máximo ${maximumItemNotesLength} caracteres.`
    );
  }

  return normalized || null;
}

function validateSelectionInput(
  selection: SelectedCatalogItemConfiguration
) {
  assertIdentifier(selection.productId, "productId");

  if (
    !Number.isInteger(selection.quantity) ||
    selection.quantity < 1 ||
    selection.quantity > maximumItemQuantity
  ) {
    throw new CatalogPricingError(
      "INVALID_QUANTITY",
      `A quantidade deve ser um inteiro entre 1 e ${maximumItemQuantity}.`
    );
  }

  if (selection.variantId) {
    assertIdentifier(selection.variantId, "variantId");
  }

  const optionIds = [...(selection.optionIds ?? [])];

  if (optionIds.length > maximumOptionsPerItem) {
    throw new CatalogPricingError(
      "TOO_MANY_OPTIONS",
      `Cada item aceita no máximo ${maximumOptionsPerItem} opções.`
    );
  }

  optionIds.forEach((optionId) => assertIdentifier(optionId, "optionIds"));

  if (new Set(optionIds).size !== optionIds.length) {
    throw new CatalogPricingError(
      "DUPLICATE_OPTION",
      "Uma mesma opção não pode ser enviada mais de uma vez."
    );
  }

  return {
    optionIds,
    itemNotes: normalizeNotes(selection.itemNotes),
  };
}

function resolveBasePrice(
  product: FoodCatalogProduct,
  variantId: string | null
) {
  if (product.pricingMode === "simple") {
    if (variantId) {
      throw new CatalogPricingError(
        "VARIANT_NOT_ALLOWED",
        "Este produto não aceita variante."
      );
    }

    return {
      variantId: null,
      variantName: null,
      baseUnitPriceCents: toMoneyCents(product.price, "products.price"),
    };
  }

  if (!variantId) {
    throw new CatalogPricingError(
      "VARIANT_REQUIRED",
      "Escolha uma variante para este produto."
    );
  }

  const variant = product.variants.find((item) => item.id === variantId);

  if (!variant || variant.productId !== product.id) {
    throw new CatalogPricingError(
      "VARIANT_INVALID",
      "A variante não pertence a este produto."
    );
  }

  if (!variant.active || !variant.available) {
    throw new CatalogPricingError(
      "VARIANT_UNAVAILABLE",
      "A variante escolhida está indisponível."
    );
  }

  return {
    variantId: variant.id,
    variantName: variant.name,
    baseUnitPriceCents: toMoneyCents(
      variant.price,
      "product_variants.price"
    ),
  };
}

function resolveOptionSnapshots(
  product: FoodCatalogProduct,
  selectedOptionIds: readonly string[]
) {
  const selectedIds = new Set(selectedOptionIds);
  const optionById = new Map(
    product.optionGroups.flatMap((group) =>
      group.options.map((option) => [option.id, { group, option }] as const)
    )
  );

  for (const optionId of selectedIds) {
    const selection = optionById.get(optionId);

    if (!selection || !selection.group.active) {
      throw new CatalogPricingError(
        "OPTION_INVALID",
        "Uma das opções não pertence a este produto.",
        { optionId }
      );
    }

    if (!selection.option.active || !selection.option.available) {
      throw new CatalogPricingError(
        "OPTION_UNAVAILABLE",
        "Uma das opções escolhidas está indisponível.",
        { optionId }
      );
    }
  }

  const snapshots: OrderItemOptionSnapshot[] = [];
  let optionsUnitPriceCents = 0;

  for (const group of product.optionGroups.filter((item) => item.active)) {
    const purchasableOptions = group.options.filter(
      (option) => option.active && option.available
    );
    const selectedOptions = group.options.filter((option) =>
      selectedIds.has(option.id)
    );

    if (purchasableOptions.length < group.minSelections) {
      throw new CatalogPricingError(
        "GROUP_CONFIGURATION_INVALID",
        `O grupo “${group.name}” não possui opções disponíveis suficientes.`,
        { groupId: group.id }
      );
    }

    if (selectedOptions.length < group.minSelections) {
      throw new CatalogPricingError(
        "GROUP_SELECTION_REQUIRED",
        `Selecione ao menos ${group.minSelections} opção(ões) em “${group.name}”.`,
        { groupId: group.id }
      );
    }

    const maximum =
      group.selectionMode === "single"
        ? 1
        : group.maxSelections ?? maximumOptionsPerItem;

    if (selectedOptions.length > maximum) {
      throw new CatalogPricingError(
        "GROUP_SELECTION_LIMIT",
        `Selecione no máximo ${maximum} opção(ões) em “${group.name}”.`,
        { groupId: group.id }
      );
    }

    for (const option of selectedOptions) {
      const priceDeltaCents = toMoneyCents(
        option.priceDelta,
        "product_options.price_delta"
      );
      optionsUnitPriceCents += priceDeltaCents;
      snapshots.push({
        optionGroupId: group.id,
        optionId: option.id,
        groupName: group.name,
        optionName: option.name,
        presentationMode: group.presentationMode,
        priceDelta: fromMoneyCents(priceDeltaCents),
        groupSortOrder: group.sortOrder,
        optionSortOrder: option.sortOrder,
      });
    }
  }

  snapshots.sort(
    (left, right) =>
      left.groupSortOrder - right.groupSortOrder ||
      left.optionSortOrder - right.optionSortOrder ||
      (left.optionId ?? "").localeCompare(right.optionId ?? "")
  );

  return { snapshots, optionsUnitPriceCents };
}

export async function priceConfiguredCatalogItem(
  repository: FoodCatalogProductRepository,
  selection: SelectedCatalogItemConfiguration
): Promise<PricedCatalogItem> {
  const normalized = validateSelectionInput(selection);
  const product = await repository.getProductById(selection.productId);

  if (!product) {
    throw new CatalogPricingError(
      "PRODUCT_NOT_FOUND",
      "Produto não encontrado."
    );
  }

  if (!product.active || !product.available) {
    throw new CatalogPricingError(
      "PRODUCT_UNAVAILABLE",
      "Este produto está indisponível."
    );
  }

  const base = resolveBasePrice(product, selection.variantId ?? null);
  const options = resolveOptionSnapshots(product, normalized.optionIds);
  const unitPriceCents =
    base.baseUnitPriceCents + options.optionsUnitPriceCents;
  const itemTotalCents = unitPriceCents * selection.quantity;

  return {
    productId: product.id,
    productName: product.name,
    catalogVersion: product.catalogVersion,
    variantId: base.variantId,
    variantName: base.variantName,
    quantity: selection.quantity,
    baseUnitPrice: fromMoneyCents(base.baseUnitPriceCents),
    optionsUnitPrice: fromMoneyCents(options.optionsUnitPriceCents),
    unitPrice: fromMoneyCents(unitPriceCents),
    itemTotal: fromMoneyCents(itemTotalCents),
    itemNotes: normalized.itemNotes,
    optionSnapshots: options.snapshots,
  };
}
