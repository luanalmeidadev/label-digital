import type { OptionPresentationMode } from "@/lib/food-catalog/types";

export type OrderItemOptionSnapshotInput = {
  id?: string;
  group_name: string;
  option_name: string;
  presentation_mode: string;
  price_delta: number | string;
  group_sort_order: number;
  option_sort_order: number;
};

export type OrderItemSnapshotInput = {
  id?: string;
  product_name: string;
  quantity: number;
  unit_price: number | string;
  variant_name?: string | null;
  base_unit_price?: number | string | null;
  options_unit_price?: number | string | null;
  item_notes?: string | null;
  configuration_signature?: string | null;
  order_item_options?: OrderItemOptionSnapshotInput[] | null;
};

export type OrderItemOptionSnapshotView = {
  id?: string;
  groupName: string;
  optionName: string;
  presentationMode: OptionPresentationMode;
  priceDelta: number;
  groupSortOrder: number;
  optionSortOrder: number;
};

export type OrderItemSnapshotView = {
  id?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  itemTotal: number;
  variantName: string | null;
  baseUnitPrice: number | null;
  optionsUnitPrice: number;
  itemNotes: string | null;
  configurationSignature: string | null;
  options: OrderItemOptionSnapshotView[];
  hasConfiguration: boolean;
};

function toFiniteNumber(value: number | string | null | undefined, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizePresentationMode(value: string): OptionPresentationMode {
  if (value === "addition" || value === "removal") {
    return value;
  }

  return "choice";
}

function normalizeOptionalText(value: string | null | undefined) {
  const text = value?.trim();
  return text ? text : null;
}

export function normalizeOrderItemSnapshot(
  item: OrderItemSnapshotInput
): OrderItemSnapshotView {
  const quantity = Math.max(0, Math.trunc(toFiniteNumber(item.quantity)));
  const unitPrice = Math.max(0, toFiniteNumber(item.unit_price));
  const baseUnitPrice =
    item.base_unit_price === null || item.base_unit_price === undefined
      ? null
      : Math.max(0, toFiniteNumber(item.base_unit_price));
  const options = (item.order_item_options ?? [])
    .map((option) => ({
      id: option.id,
      groupName: option.group_name.trim(),
      optionName: option.option_name.trim(),
      presentationMode: normalizePresentationMode(option.presentation_mode),
      priceDelta: Math.max(0, toFiniteNumber(option.price_delta)),
      groupSortOrder: Math.max(0, Math.trunc(toFiniteNumber(option.group_sort_order))),
      optionSortOrder: Math.max(0, Math.trunc(toFiniteNumber(option.option_sort_order))),
    }))
    .sort(
      (left, right) =>
        left.groupSortOrder - right.groupSortOrder ||
        left.optionSortOrder - right.optionSortOrder ||
        left.optionName.localeCompare(right.optionName, "pt-BR")
    );
  const variantName = normalizeOptionalText(item.variant_name);
  const itemNotes = normalizeOptionalText(item.item_notes);

  return {
    id: item.id,
    productName: item.product_name,
    quantity,
    unitPrice,
    itemTotal: unitPrice * quantity,
    variantName,
    baseUnitPrice,
    optionsUnitPrice: Math.max(0, toFiniteNumber(item.options_unit_price)),
    itemNotes,
    configurationSignature: normalizeOptionalText(item.configuration_signature),
    options,
    hasConfiguration: Boolean(variantName || itemNotes || options.length > 0),
  };
}

export function getOrderItemOptionLabel(option: OrderItemOptionSnapshotView) {
  if (option.presentationMode === "addition") {
    return `+ ${option.optionName}`;
  }

  if (option.presentationMode === "removal") {
    return `- ${option.optionName}`;
  }

  return `${option.groupName}: ${option.optionName}`;
}

export function buildOrderItemWhatsAppLines(
  item: OrderItemSnapshotInput,
  formatCurrency: (value: number) => string
) {
  const snapshot = normalizeOrderItemSnapshot(item);
  const lines = [
    `${snapshot.quantity}x ${snapshot.productName} — ${formatCurrency(snapshot.itemTotal)}`,
  ];

  if (snapshot.variantName) {
    lines.push(`• Variante: ${snapshot.variantName}`);
  }

  for (const option of snapshot.options) {
    lines.push(`• ${getOrderItemOptionLabel(option)}`);
  }

  if (snapshot.itemNotes) {
    lines.push(`• Obs: ${snapshot.itemNotes}`);
  }

  return lines;
}

export function buildOrderItemsWhatsAppText(
  items: readonly OrderItemSnapshotInput[],
  formatCurrency: (value: number) => string
) {
  return items
    .map((item) => buildOrderItemWhatsAppLines(item, formatCurrency).join("\n"))
    .join("\n");
}
