import type {
  CatalogPricingMode,
  FoodCatalogConfiguration,
  OptionPresentationMode,
  ProductOption,
  ProductVariant,
} from "@/lib/food-catalog/types";

export const CART_STORAGE_VERSION = 2 as const;
export const MAX_CART_ITEM_QUANTITY = 999;
export const MAX_ITEM_NOTES_LENGTH = 300;
const MAX_OPTIONS_PER_ITEM = 50;

export type CartProduct = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
};

export type CartVariantSnapshot = {
  id: string;
  name: string;
  price: number;
};

export type CartOptionSnapshot = {
  id: string;
  groupId: string;
  groupName: string;
  name: string;
  presentationMode: OptionPresentationMode;
  priceDelta: number;
};

export type CartItem = CartProduct & {
  lineKey: string;
  configurationSignature: string;
  pricingMode: CatalogPricingMode;
  variant: CartVariantSnapshot | null;
  options: CartOptionSnapshot[];
  itemNotes: string | null;
  basePrice: number;
  optionsPrice: number;
  quantity: number;
};

export type CartCatalogProduct = CartProduct & {
  available: boolean;
  configuration: FoodCatalogConfiguration;
};

export type CatalogSelection = {
  variantId?: string | null;
  optionIds?: readonly string[];
  itemNotes?: string | null;
  quantity?: number;
};

export type CatalogSelectionErrors = {
  variant?: string;
  options?: string;
  notes?: string;
  quantity?: string;
  groups: Record<string, string>;
};

export type CatalogSelectionEstimate = {
  valid: boolean;
  basePrice: number;
  optionsPrice: number;
  unitPrice: number;
  totalPrice: number;
  quantity: number;
  itemNotes: string | null;
  variant: ProductVariant | null;
  options: Array<{
    groupId: string;
    groupName: string;
    presentationMode: OptionPresentationMode;
    option: ProductOption;
  }>;
  errors: CatalogSelectionErrors;
};

type PersistedCart = {
  version: typeof CART_STORAGE_VERSION;
  items: readonly CartItem[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeMoney(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function normalizeQuantity(value: unknown) {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > MAX_CART_ITEM_QUANTITY
  ) {
    return null;
  }

  return value;
}

export function normalizeCartNotes(value: string | null | undefined) {
  if (value == null) {
    return null;
  }

  const normalized = value.replace(/\r\n/g, "\n").trim();
  return normalized || null;
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort();
}

export function createCartConfigurationSignature(input: {
  productId: string;
  variantId?: string | null;
  optionIds?: readonly string[];
  itemNotes?: string | null;
}) {
  return JSON.stringify({
    productId: input.productId,
    variantId: input.variantId ?? null,
    optionIds: uniqueSorted(input.optionIds ?? []),
    itemNotes: normalizeCartNotes(input.itemNotes),
  });
}

export function createCartLineKey(input: {
  productId: string;
  variantId?: string | null;
  optionIds?: readonly string[];
  itemNotes?: string | null;
}) {
  return `cart-v${CART_STORAGE_VERSION}:${createCartConfigurationSignature(input)}`;
}

export function isConfigurableProduct(
  configuration: FoodCatalogConfiguration
) {
  return (
    configuration.pricingMode === "variant" ||
    configuration.optionGroups.some((group) => group.active)
  );
}

export function getCatalogStartingPrice(
  productPrice: number,
  configuration: FoodCatalogConfiguration
) {
  if (configuration.pricingMode !== "variant") {
    return productPrice;
  }

  const availablePrices = configuration.variants
    .filter((variant) => variant.active && variant.available)
    .map((variant) => variant.price);

  return availablePrices.length > 0
    ? Math.min(...availablePrices)
    : productPrice;
}

export function estimateCatalogSelection(
  product: CartProduct,
  configuration: FoodCatalogConfiguration,
  selection: CatalogSelection
): CatalogSelectionEstimate {
  const errors: CatalogSelectionErrors = { groups: {} };
  const selectedOptionIds = uniqueSorted(selection.optionIds ?? []);
  const quantity = normalizeQuantity(selection.quantity ?? 1);
  const itemNotes = normalizeCartNotes(selection.itemNotes);

  if (quantity === null) {
    errors.quantity = `A quantidade deve ficar entre 1 e ${MAX_CART_ITEM_QUANTITY}.`;
  }

  if ((itemNotes?.length ?? 0) > MAX_ITEM_NOTES_LENGTH) {
    errors.notes = `A observação deve ter no máximo ${MAX_ITEM_NOTES_LENGTH} caracteres.`;
  }

  let variant: ProductVariant | null = null;
  let basePrice = product.price;

  if (configuration.pricingMode === "variant") {
    if (!selection.variantId) {
      errors.variant = "Escolha uma opção para continuar.";
    } else {
      variant =
        configuration.variants.find(
          (candidate) => candidate.id === selection.variantId && candidate.active
        ) ?? null;

      if (!variant) {
        errors.variant = "A opção escolhida não pertence a este produto.";
      } else if (!variant.available) {
        errors.variant = "Esta opção está indisponível no momento.";
      } else {
        basePrice = variant.price;
      }
    }
  } else if (selection.variantId) {
    errors.variant = "Este produto não aceita variante.";
  }

  const activeGroups = configuration.optionGroups.filter((group) => group.active);
  const optionLookup = new Map(
    activeGroups.flatMap((group) =>
      group.options
        .filter((option) => option.active)
        .map((option) => [option.id, { group, option }] as const)
    )
  );
  const selectedOptions: CatalogSelectionEstimate["options"] = [];

  for (const optionId of selectedOptionIds) {
    const resolved = optionLookup.get(optionId);

    if (!resolved) {
      errors.options = "Uma das opções escolhidas não pertence a este produto.";
      continue;
    }

    if (!resolved.option.available) {
      errors.groups[resolved.group.id] = `${resolved.option.name} está indisponível.`;
      continue;
    }

    selectedOptions.push({
      groupId: resolved.group.id,
      groupName: resolved.group.name,
      presentationMode: resolved.group.presentationMode,
      option: resolved.option,
    });
  }

  for (const group of activeGroups) {
    const selectedCount = selectedOptions.filter(
      (selectionItem) => selectionItem.groupId === group.id
    ).length;
    const maximum =
      group.selectionMode === "single"
        ? Math.min(group.maxSelections ?? 1, 1)
        : group.maxSelections;

    if (selectedCount < group.minSelections) {
      errors.groups[group.id] =
        group.minSelections === 1
          ? "Escolha pelo menos uma opção."
          : `Escolha pelo menos ${group.minSelections} opções.`;
    } else if (maximum !== null && selectedCount > maximum) {
      errors.groups[group.id] =
        maximum === 1
          ? "Escolha somente uma opção."
          : `Escolha no máximo ${maximum} opções.`;
    }
  }

  const optionsPrice = selectedOptions.reduce(
    (total, selected) => total + selected.option.priceDelta,
    0
  );
  const unitPrice = basePrice + optionsPrice;
  const safeQuantity = quantity ?? 1;
  const valid =
    !errors.variant &&
    !errors.options &&
    !errors.notes &&
    !errors.quantity &&
    Object.keys(errors.groups).length === 0;

  return {
    valid,
    basePrice,
    optionsPrice,
    unitPrice,
    totalPrice: unitPrice * safeQuantity,
    quantity: safeQuantity,
    itemNotes,
    variant,
    options: selectedOptions,
    errors,
  };
}

export function createSimpleCartItem(
  product: CartProduct,
  quantity = 1
): CartItem {
  const safeQuantity = normalizeQuantity(quantity);

  if (safeQuantity === null || !isSafeMoney(product.price)) {
    throw new Error("Produto simples inválido para o carrinho.");
  }

  const identity = {
    productId: product.id,
    variantId: null,
    optionIds: [] as string[],
    itemNotes: null,
  };

  return {
    ...product,
    lineKey: createCartLineKey(identity),
    configurationSignature: createCartConfigurationSignature(identity),
    pricingMode: "simple",
    variant: null,
    options: [],
    itemNotes: null,
    basePrice: product.price,
    optionsPrice: 0,
    quantity: safeQuantity,
  };
}

export function createConfiguredCartItem(input: {
  product: CartProduct;
  configuration: FoodCatalogConfiguration;
  selection: CatalogSelection;
}) {
  const estimate = estimateCatalogSelection(
    input.product,
    input.configuration,
    input.selection
  );

  if (!estimate.valid) {
    throw new Error("Configuração inválida para o carrinho.");
  }

  const optionIds = estimate.options.map(({ option }) => option.id);
  const identity = {
    productId: input.product.id,
    variantId: estimate.variant?.id ?? null,
    optionIds,
    itemNotes: estimate.itemNotes,
  };

  return {
    ...input.product,
    price: estimate.unitPrice,
    lineKey: createCartLineKey(identity),
    configurationSignature: createCartConfigurationSignature(identity),
    pricingMode: input.configuration.pricingMode,
    variant: estimate.variant
      ? {
          id: estimate.variant.id,
          name: estimate.variant.name,
          price: estimate.variant.price,
        }
      : null,
    options: estimate.options.map(({ groupId, groupName, presentationMode, option }) => ({
      id: option.id,
      groupId,
      groupName,
      name: option.name,
      presentationMode,
      priceDelta: option.priceDelta,
    })),
    itemNotes: estimate.itemNotes,
    basePrice: estimate.basePrice,
    optionsPrice: estimate.optionsPrice,
    quantity: estimate.quantity,
  } satisfies CartItem;
}

export function mergeCartItem(items: readonly CartItem[], incoming: CartItem) {
  const existing = items.find((item) => item.lineKey === incoming.lineKey);

  if (!existing) {
    return [...items, incoming];
  }

  const quantity = Math.min(
    MAX_CART_ITEM_QUANTITY,
    existing.quantity + incoming.quantity
  );

  return items.map((item) =>
    item.lineKey === incoming.lineKey ? { ...incoming, quantity } : item
  );
}

function parseVariantSnapshot(value: unknown): CartVariantSnapshot | null {
  if (value == null) {
    return null;
  }

  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    !isSafeMoney(value.price)
  ) {
    throw new Error("Variante persistida inválida.");
  }

  return { id: value.id, name: value.name, price: value.price };
}

function parseOptionSnapshots(value: unknown): CartOptionSnapshot[] {
  if (!Array.isArray(value)) {
    throw new Error("Opções persistidas inválidas.");
  }

  return value.map((option) => {
    if (
      !isRecord(option) ||
      typeof option.id !== "string" ||
      typeof option.groupId !== "string" ||
      typeof option.groupName !== "string" ||
      typeof option.name !== "string" ||
      !["choice", "addition", "removal"].includes(
        String(option.presentationMode)
      ) ||
      !isSafeMoney(option.priceDelta)
    ) {
      throw new Error("Opção persistida inválida.");
    }

    return {
      id: option.id,
      groupId: option.groupId,
      groupName: option.groupName,
      name: option.name,
      presentationMode: option.presentationMode as OptionPresentationMode,
      priceDelta: option.priceDelta,
    };
  });
}

function parseV2Item(value: unknown): CartItem | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    !(typeof value.image_url === "string" || value.image_url === null) ||
    !isSafeMoney(value.price) ||
    !isSafeMoney(value.basePrice) ||
    !isSafeMoney(value.optionsPrice) ||
    (value.pricingMode !== "simple" && value.pricingMode !== "variant")
  ) {
    return null;
  }

  const quantity = normalizeQuantity(value.quantity);
  if (quantity === null) {
    return null;
  }

  try {
    const variant = parseVariantSnapshot(value.variant);
    const options = parseOptionSnapshots(value.options);
    const itemNotes = normalizeCartNotes(
      typeof value.itemNotes === "string" ? value.itemNotes : null
    );

    if (
      options.length > MAX_OPTIONS_PER_ITEM ||
      (itemNotes?.length ?? 0) > MAX_ITEM_NOTES_LENGTH ||
      (value.pricingMode === "simple" && variant) ||
      (value.pricingMode === "variant" && !variant)
    ) {
      return null;
    }

    const pricingMode = value.pricingMode;
    const identity = {
      productId: value.id,
      variantId: variant?.id ?? null,
      optionIds: options.map((option) => option.id),
      itemNotes,
    };

    return {
      id: value.id,
      name: value.name,
      price: value.price,
      image_url: value.image_url,
      lineKey: createCartLineKey(identity),
      configurationSignature: createCartConfigurationSignature(identity),
      pricingMode,
      variant,
      options,
      itemNotes,
      basePrice: value.basePrice,
      optionsPrice: value.optionsPrice,
      quantity,
    };
  } catch {
    return null;
  }
}

function parseLegacyItem(value: unknown): CartItem | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    !(typeof value.image_url === "string" || value.image_url === null) ||
    !isSafeMoney(value.price)
  ) {
    return null;
  }

  const quantity = normalizeQuantity(value.quantity);
  if (quantity === null) {
    return null;
  }

  return createSimpleCartItem(
    {
      id: value.id,
      name: value.name,
      price: value.price,
      image_url: value.image_url,
    },
    quantity
  );
}

export function serializeCart(items: readonly CartItem[]) {
  return JSON.stringify({
    version: CART_STORAGE_VERSION,
    items,
  } satisfies PersistedCart);
}

export function deserializeCart(raw: string | null) {
  if (!raw) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  const candidates = Array.isArray(parsed)
    ? parsed.map(parseLegacyItem)
    : isRecord(parsed) &&
        parsed.version === CART_STORAGE_VERSION &&
        Array.isArray(parsed.items)
      ? parsed.items.map(parseV2Item)
      : [];

  return candidates
    .filter((item): item is CartItem => item !== null)
    .reduce<CartItem[]>((items, item) => mergeCartItem(items, item), []);
}

export function synchronizeCartWithCatalog(
  items: readonly CartItem[],
  catalogProducts: readonly CartCatalogProduct[]
) {
  const catalog = new Map(
    catalogProducts.map((product) => [product.id, product])
  );

  return items.reduce<CartItem[]>((synchronized, item) => {
    const product = catalog.get(item.id);

    if (!product?.available) {
      return synchronized;
    }

    try {
      const nextItem = isConfigurableProduct(product.configuration)
        ? createConfiguredCartItem({
            product,
            configuration: product.configuration,
            selection: {
              variantId: item.variant?.id ?? null,
              optionIds: item.options.map((option) => option.id),
              itemNotes: item.itemNotes,
              quantity: item.quantity,
            },
          })
        : createSimpleCartItem(product, item.quantity);

      return mergeCartItem(synchronized, nextItem);
    } catch {
      return synchronized;
    }
  }, []);
}
