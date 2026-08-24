import { describe, expect, it } from "vitest";

import {
  isPaymentMethod,
  validateCashChange,
} from "./payment-method";

describe("payment methods", () => {
  it("accepts the supported methods", () => {
    expect(isPaymentMethod("cash")).toBe(true);
    expect(isPaymentMethod("pix")).toBe(true);
    expect(isPaymentMethod("debit_card")).toBe(true);
    expect(isPaymentMethod("credit_card")).toBe(true);
    expect(isPaymentMethod("mixed")).toBe(false);
  });

  it("accepts cash without change or with enough tendered value", () => {
    expect(validateCashChange("cash", null, 20)).toBe(true);
    expect(validateCashChange("cash", 50, 20)).toBe(true);
    expect(validateCashChange("cash", 10, 20)).toBe(false);
  });

  it("rejects change values for non-cash methods", () => {
    expect(validateCashChange("pix", null, 20)).toBe(true);
    expect(validateCashChange("pix", 50, 20)).toBe(false);
  });
});
