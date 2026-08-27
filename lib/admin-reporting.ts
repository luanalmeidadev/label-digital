import {
  getOrderItemOptionLabel,
  normalizeOrderItemSnapshot,
  type OrderItemSnapshotInput,
} from "@/lib/order-item-display";

export const reportPeriodLabels = {
  today: "Hoje",
  "7d": "7 dias",
  "30d": "30 dias",
  month: "Este mês",
  all: "Todos",
} as const;

export type ReportPeriod = keyof typeof reportPeriodLabels;

type ReportSearchParams = {
  period?: string;
  from?: string;
  to?: string;
};

export type ResolvedReportPeriod = {
  selectedPeriod: ReportPeriod | "custom";
  label: string;
  from: string;
  to: string;
  startIso: string | null;
  endExclusiveIso: string | null;
  validationError: string | null;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function saoPauloDate(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function isValidDate(value: string) {
  if (!datePattern.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function shiftDate(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR").format(
    new Date(Date.UTC(year, month - 1, day))
  );
}

function boundaryIso(value: string) {
  // O Brasil não adota horário de verão desde 2019. 00:00 em São Paulo = 03:00 UTC.
  return `${value}T03:00:00.000Z`;
}

function customPeriod(from: string, to: string): ResolvedReportPeriod | null {
  if (!isValidDate(from) || !isValidDate(to) || from > to) return null;

  return {
    selectedPeriod: "custom",
    label: `${formatDate(from)} a ${formatDate(to)}`,
    from,
    to,
    startIso: boundaryIso(from),
    endExclusiveIso: boundaryIso(shiftDate(to, 1)),
    validationError: null,
  };
}

export function resolveReportPeriod(
  params: ReportSearchParams,
  now = new Date()
): ResolvedReportPeriod {
  const today = saoPauloDate(now);

  if (params.period === "custom") {
    const resolved = customPeriod(params.from ?? "", params.to ?? "");
    if (resolved) return resolved;
  }

  const selectedPeriod =
    params.period && params.period in reportPeriodLabels
      ? (params.period as ReportPeriod)
      : "30d";

  if (selectedPeriod === "all") {
    return {
      selectedPeriod,
      label: reportPeriodLabels[selectedPeriod],
      from: "",
      to: "",
      startIso: null,
      endExclusiveIso: null,
      validationError:
        params.period === "custom"
          ? "Informe um período válido, com a data inicial anterior à data final."
          : null,
    };
  }

  const from =
    selectedPeriod === "today"
      ? today
      : selectedPeriod === "month"
        ? `${today.slice(0, 8)}01`
        : shiftDate(today, selectedPeriod === "7d" ? -6 : -29);

  return {
    selectedPeriod,
    label: reportPeriodLabels[selectedPeriod],
    from,
    to: today,
    startIso: boundaryIso(from),
    endExclusiveIso: boundaryIso(shiftDate(today, 1)),
    validationError:
      params.period === "custom"
        ? "Informe um período válido, com a data inicial anterior à data final."
        : null,
  };
}

function csvCell(value: string | number) {
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildReportCsv(rows: Array<Array<string | number>>) {
  return rows.map((row) => row.map(csvCell).join(";")).join("\r\n");
}

export type ReportOrderItemInput = OrderItemSnapshotInput & {
  product_id?: string | null;
  variant_id?: string | null;
};

export type ProductSalesSummary = {
  key: string;
  name: string;
  quantity: number;
  revenue: number;
  baseRevenue: number;
  optionsRevenue: number;
};

export type VariantSalesSummary = {
  key: string;
  productName: string;
  variantName: string;
  quantity: number;
  revenue: number;
};

export type OptionSalesSummary = {
  key: string;
  productName: string;
  groupName: string;
  optionName: string;
  selections: number;
  revenue: number;
};

export type SoldItemDetail = {
  productName: string;
  variantName: string | null;
  optionLabels: string[];
  itemNotes: string | null;
  quantity: number;
  baseUnitPrice: number | null;
  optionsUnitPrice: number;
  unitPrice: number;
  total: number;
};

export type SoldItemsReport = {
  products: ProductSalesSummary[];
  variants: VariantSalesSummary[];
  options: OptionSalesSummary[];
  details: SoldItemDetail[];
};

function money(value: number) {
  return Number(value.toFixed(2));
}

export function summarizeSoldOrderItems(
  items: readonly ReportOrderItemInput[]
): SoldItemsReport {
  const products = new Map<string, ProductSalesSummary>();
  const variants = new Map<string, VariantSalesSummary>();
  const options = new Map<string, OptionSalesSummary>();
  const details: SoldItemDetail[] = [];

  for (const item of items) {
    const snapshot = normalizeOrderItemSnapshot(item);
    const productKey = item.product_id ?? `snapshot:${snapshot.productName}`;
    const baseUnitPrice = snapshot.baseUnitPrice ?? snapshot.unitPrice;
    const currentProduct = products.get(productKey) ?? {
      key: productKey,
      name: snapshot.productName,
      quantity: 0,
      revenue: 0,
      baseRevenue: 0,
      optionsRevenue: 0,
    };

    currentProduct.quantity += snapshot.quantity;
    currentProduct.revenue = money(
      currentProduct.revenue + snapshot.itemTotal
    );
    currentProduct.baseRevenue = money(
      currentProduct.baseRevenue + baseUnitPrice * snapshot.quantity
    );
    currentProduct.optionsRevenue = money(
      currentProduct.optionsRevenue +
        snapshot.optionsUnitPrice * snapshot.quantity
    );
    products.set(productKey, currentProduct);

    if (snapshot.variantName) {
      const variantKey = `${productKey}:variant:${
        item.variant_id ?? snapshot.variantName
      }`;
      const currentVariant = variants.get(variantKey) ?? {
        key: variantKey,
        productName: snapshot.productName,
        variantName: snapshot.variantName,
        quantity: 0,
        revenue: 0,
      };

      currentVariant.quantity += snapshot.quantity;
      currentVariant.revenue = money(
        currentVariant.revenue + snapshot.itemTotal
      );
      variants.set(variantKey, currentVariant);
    }

    for (const option of snapshot.options) {
      const optionKey = `${productKey}:option:${
        option.optionId ?? `${option.groupName}:${option.optionName}`
      }`;
      const currentOption = options.get(optionKey) ?? {
        key: optionKey,
        productName: snapshot.productName,
        groupName: option.groupName,
        optionName: option.optionName,
        selections: 0,
        revenue: 0,
      };

      currentOption.selections += snapshot.quantity;
      currentOption.revenue = money(
        currentOption.revenue + option.priceDelta * snapshot.quantity
      );
      options.set(optionKey, currentOption);
    }

    details.push({
      productName: snapshot.productName,
      variantName: snapshot.variantName,
      optionLabels: snapshot.options.map(getOrderItemOptionLabel),
      itemNotes: snapshot.itemNotes,
      quantity: snapshot.quantity,
      baseUnitPrice,
      optionsUnitPrice: snapshot.optionsUnitPrice,
      unitPrice: snapshot.unitPrice,
      total: money(snapshot.itemTotal),
    });
  }

  return {
    products: [...products.values()],
    variants: [...variants.values()],
    options: [...options.values()],
    details,
  };
}
