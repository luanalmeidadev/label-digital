import { describe, expect, it } from "vitest";

import {
  isPaymentMethod,
  validateCashChange,
} from "@/lib/payment-method";

describe("formas de pagamento", () => {
  it("aceita as formas suportadas", () => {
    expect(isPaymentMethod("cash")).toBe(true);
    expect(isPaymentMethod("pix")).toBe(true);
    expect(isPaymentMethod("debit_card")).toBe(true);
    expect(isPaymentMethod("credit_card")).toBe(true);
    expect(isPaymentMethod("mixed")).toBe(false);
  });

  it("aceita dinheiro sem troco ou com valor suficiente", () => {
    expect(validateCashChange("cash", null, 20)).toBe(true);
    expect(validateCashChange("cash", 50, 20)).toBe(true);
    expect(validateCashChange("cash", 10, 20)).toBe(false);
  });

  it("rejeita valor de troco em pagamentos que não são dinheiro", () => {
    expect(validateCashChange("pix", null, 20)).toBe(true);
    expect(validateCashChange("pix", 50, 20)).toBe(false);
  });
});
