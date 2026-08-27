export const catalogPricingModes = ["simple", "variant"] as const;
export type CatalogPricingMode = (typeof catalogPricingModes)[number];

export const optionSelectionModes = ["single", "multiple"] as const;
export type OptionSelectionMode = (typeof optionSelectionModes)[number];

export const optionPresentationModes = [
  "choice",
  "addition",
  "removal",
] as const;
export type OptionPresentationMode =
  (typeof optionPresentationModes)[number];

export type ProductVariant = {
  id: string;
  productId: string;
  name: string;
  sku: string | null;
  price: number;
  active: boolean;
  available: boolean;
  sortOrder: number;
};

export type ProductOption = {
  id: string;
  optionGroupId: string;
  name: string;
  priceDelta: number;
  active: boolean;
  available: boolean;
  sortOrder: number;
};

export type ProductOptionGroup = {
  id: string;
  productId: string;
  name: string;
  selectionMode: OptionSelectionMode;
  minSelections: number;
  maxSelections: number | null;
  presentationMode: OptionPresentationMode;
  active: boolean;
  sortOrder: number;
  options: ProductOption[];
};

export type FoodCatalogProduct = {
  id: string;
  name: string;
  price: number;
  catalogVersion: number;
  pricingMode: CatalogPricingMode;
  active: boolean;
  available: boolean;
  variants: ProductVariant[];
  optionGroups: ProductOptionGroup[];
};

export type FoodCatalogConfiguration = Pick<
  FoodCatalogProduct,
  "pricingMode" | "variants" | "optionGroups"
>;

export type SelectedCatalogItemConfiguration = {
  productId: string;
  variantId?: string | null;
  optionIds?: readonly string[];
  quantity: number;
  itemNotes?: string | null;
};

export type OrderItemOptionSnapshot = {
  optionGroupId: string | null;
  optionId: string | null;
  groupName: string;
  optionName: string;
  presentationMode: OptionPresentationMode;
  priceDelta: number;
  groupSortOrder: number;
  optionSortOrder: number;
};

export type PricedCatalogItem = {
  productId: string;
  productName: string;
  catalogVersion: number;
  variantId: string | null;
  variantName: string | null;
  quantity: number;
  baseUnitPrice: number;
  optionsUnitPrice: number;
  unitPrice: number;
  itemTotal: number;
  itemNotes: string | null;
  optionSnapshots: OrderItemOptionSnapshot[];
};

export type OrderItemSnapshotInsert = {
  product_id: string;
  product_name: string;
  variant_id: string | null;
  variant_name: string | null;
  quantity: number;
  base_unit_price: number;
  options_unit_price: number;
  unit_price: number;
  item_notes: string | null;
  configuration_signature: string;
};

export type OrderItemOptionSnapshotInsert = {
  option_group_id: string | null;
  option_id: string | null;
  group_name: string;
  option_name: string;
  presentation_mode: OptionPresentationMode;
  price_delta: number;
  group_sort_order: number;
  option_sort_order: number;
};

export type PersistableOrderItemSnapshot = {
  item: OrderItemSnapshotInsert;
  options: OrderItemOptionSnapshotInsert[];
};

export const catalogPricingErrorCodes = [
  "INVALID_IDENTIFIER",
  "INVALID_QUANTITY",
  "INVALID_NOTES",
  "TOO_MANY_OPTIONS",
  "DUPLICATE_OPTION",
  "PRODUCT_NOT_FOUND",
  "PRODUCT_UNAVAILABLE",
  "VARIANT_REQUIRED",
  "VARIANT_NOT_ALLOWED",
  "VARIANT_INVALID",
  "VARIANT_UNAVAILABLE",
  "OPTION_INVALID",
  "OPTION_UNAVAILABLE",
  "GROUP_CONFIGURATION_INVALID",
  "GROUP_SELECTION_REQUIRED",
  "GROUP_SELECTION_LIMIT",
  "INVALID_CATALOG_PRICE",
] as const;

export type CatalogPricingErrorCode =
  (typeof catalogPricingErrorCodes)[number];

export class CatalogPricingError extends Error {
  readonly code: CatalogPricingErrorCode;
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(
    code: CatalogPricingErrorCode,
    message: string,
    details?: Readonly<Record<string, unknown>>
  ) {
    super(message);
    this.name = "CatalogPricingError";
    this.code = code;
    this.details = details;
  }
}
