import { describe, expect, it } from "vitest";

import {
  calculateCashDifference,
  calculateExpectedCash,
} from "@/lib/cash-register";

describe("resumo do caixa", () => {
  it("soma abertura, vendas e suprimentos e desconta saídas", () => {
    expect(
      calculateExpectedCash({
        openingBalance: 100,
        cashSales: 85.5,
        supplies: 20,
        withdrawals: 30,
        expenses: 12.25,
      })
    ).toBe(163.25);
  });

  it("calcula sobra e falta a partir do dinheiro contado", () => {
    expect(calculateCashDifference(105, 100)).toBe(5);
    expect(calculateCashDifference(95, 100)).toBe(-5);
  });

  it("mantém precisão de centavos", () => {
    expect(
      calculateExpectedCash({
        openingBalance: 0.1,
        cashSales: 0.2,
        supplies: 0,
        withdrawals: 0,
        expenses: 0,
      })
    ).toBe(0.3);
  });
});
