import type { PreorderProduct } from "@/lib/preorder-menu";

export type PreorderRequestStatus =
  | "new"
  | "confirmed"
  | "in_production"
  | "ready"
  | "completed"
  | "cancelled";

export type PreorderRequest = {
  id: string;
  requestNumber: string;
  status: PreorderRequestStatus;
  createdAt: string;
  updatedAt: string;
  desiredDate: string;
  customerName: string;
  customerPhone: string;
  productName: string;
  optionLabel: string;
  optionPrice: string;
  total: number;
  amountPaid: number;
  quantity: number;
  quantityUnit: string;
  flavors: string[];
  fulfillmentType: "pickup" | "delivery";
  deliveryAddress: string;
  notes: string;
  completedAt: string | null;
  source: "online" | "manual";
};

export type PreorderPaymentStatus =
  | "awaiting_deposit"
  | "partial"
  | "deposit_paid"
  | "paid";

export const preorderPaymentStatusLabels: Record<
  PreorderPaymentStatus,
  string
> = {
  awaiting_deposit: "Aguardando sinal",
  partial: "Pagamento parcial",
  deposit_paid: "Sinal pago",
  paid: "Pago integralmente",
};

export const preorderPaymentStatusClasses: Record<
  PreorderPaymentStatus,
  string
> = {
  awaiting_deposit: "bg-red-100 text-red-700",
  partial: "bg-orange-100 text-orange-700",
  deposit_paid: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
};

export function getPreorderPaymentStatus(
  request: Pick<PreorderRequest, "total" | "amountPaid">
): PreorderPaymentStatus {
  if (request.total <= 0 || request.amountPaid <= 0) {
    return "awaiting_deposit";
  }

  if (request.amountPaid >= request.total - 0.005) {
    return "paid";
  }

  if (request.amountPaid >= request.total * 0.5 - 0.005) {
    return "deposit_paid";
  }

  return "partial";
}

export function getPreorderDepositAmount(total: number) {
  return Number((Math.max(total, 0) * 0.5).toFixed(2));
}

export function getPreorderBalance(
  request: Pick<PreorderRequest, "total" | "amountPaid">
) {
  return Number(
    Math.max(request.total - request.amountPaid, 0).toFixed(2)
  );
}

export function parsePreorderPrice(value: string) {
  const normalized = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculatePreorderTotal(
  product: Pick<PreorderProduct, "priceBaseQuantity">,
  priceValue: string,
  quantity: number
) {
  const priceBaseQuantity =
    product.priceBaseQuantity ?? 1;

  return Number(
    (
      (parsePreorderPrice(priceValue) * quantity) /
      priceBaseQuantity
    ).toFixed(2)
  );
}

export function isAllowedPreorderQuantity(
  product: Pick<
    PreorderProduct,
    | "allowedQuantities"
    | "minimumQuantity"
    | "quantityIncrement"
  >,
  quantity: number
) {
  if (
    !Number.isInteger(quantity) ||
    quantity < (product.minimumQuantity ?? 1) ||
    quantity > 10000
  ) {
    return false;
  }

  const allowedQuantities =
    product.allowedQuantities ?? [];

  if (allowedQuantities.includes(quantity)) {
    return true;
  }

  if (!product.quantityIncrement) {
    return allowedQuantities.length === 0;
  }

  const incrementBase = allowedQuantities.length
    ? Math.max(...allowedQuantities)
    : product.minimumQuantity ?? 1;

  return (
    (allowedQuantities.length
      ? quantity > incrementBase
      : quantity >= incrementBase) &&
    (quantity - incrementBase) %
      product.quantityIncrement ===
      0
  );
}

export function getPreorderMaxFlavors(
  product: Pick<
    PreorderProduct,
    "flavors" | "flavorQuantityStep" | "maxFlavors"
  >,
  quantity: number
) {
  const registeredFlavors =
    product.flavors?.length ?? 0;

  if (registeredFlavors === 0) {
    return 0;
  }

  const quantityLimit = product.flavorQuantityStep
    ? Math.max(
        1,
        Math.floor(quantity / product.flavorQuantityStep)
      )
    : registeredFlavors;
  const configuredLimit =
    product.maxFlavors ?? registeredFlavors;

  return Math.min(
    quantityLimit,
    configuredLimit,
    registeredFlavors
  );
}

export function formatPreorderCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export const preorderRequestStatusLabels: Record<
  PreorderRequestStatus,
  string
> = {
  new: "Nova solicitação",
  confirmed: "Confirmada",
  in_production: "Em produção",
  ready: "Pronta",
  completed: "Finalizada",
  cancelled: "Cancelada",
};

export const preorderRequestStatusClasses: Record<
  PreorderRequestStatus,
  string
> = {
  new: "bg-blue-100 text-blue-700",
  confirmed: "bg-amber-100 text-amber-700",
  in_production:
    "bg-orange-100 text-orange-700",
  ready: "bg-emerald-100 text-emerald-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

export function isPreorderRequestStatus(
  value: string
): value is PreorderRequestStatus {
  return Object.prototype.hasOwnProperty.call(
    preorderRequestStatusLabels,
    value
  );
}
