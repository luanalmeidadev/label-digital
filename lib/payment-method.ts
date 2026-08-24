export const paymentMethods = [
  "cash",
  "pix",
  "debit_card",
  "credit_card",
] as const;

export type PaymentMethod =
  (typeof paymentMethods)[number];

export const paymentMethodLabels: Record<
  PaymentMethod | "mixed",
  string
> = {
  cash: "Dinheiro",
  pix: "Pix",
  debit_card: "Cartão de débito",
  credit_card: "Cartão de crédito",
  mixed: "Pagamento misto",
};

export function isPaymentMethod(
  value: unknown
): value is PaymentMethod {
  return paymentMethods.includes(
    value as PaymentMethod
  );
}

export function validateCashChange(
  method: PaymentMethod,
  changeFor: number | null,
  total: number
) {
  if (method !== "cash") {
    return changeFor === null;
  }

  return (
    changeFor === null ||
    (Number.isFinite(changeFor) &&
      changeFor >= total &&
      changeFor <= 1000000)
  );
}

