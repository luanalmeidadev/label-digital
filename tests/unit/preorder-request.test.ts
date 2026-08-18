import { describe, expect, it } from "vitest";

import {
  calculatePreorderTotal,
  getPreorderBalance,
  getPreorderDepositAmount,
  getPreorderMaxFlavors,
  getPreorderPaymentStatus,
  isAllowedPreorderQuantity,
  isPreorderRequestStatus,
  parsePreorderPrice,
} from "@/lib/preorder-request";

const candyProduct = {
  minimumQuantity: 25,
  allowedQuantities: [25, 50, 75, 100],
  quantityIncrement: 25,
  flavors: ["Ninho", "Churros", "Brigadeiro", "Morango", "Maracujá"],
  flavorQuantityStep: 25,
  maxFlavors: 5,
  priceBaseQuantity: 100,
};

describe("regras de quantidade das encomendas", () => {
  it.each([25, 50, 75, 100, 125, 150, 250])(
    "aceita %i unidades",
    (quantity) => {
      expect(
        isAllowedPreorderQuantity(candyProduct, quantity)
      ).toBe(true);
    }
  );

  it.each([0, 24, 26, 110, 10001, 25.5])(
    "recusa %s unidades",
    (quantity) => {
      expect(
        isAllowedPreorderQuantity(candyProduct, quantity)
      ).toBe(false);
    }
  );

  it.each([
    [25, 1],
    [50, 2],
    [75, 3],
    [100, 4],
    [125, 5],
    [250, 5],
  ])(
    "limita %i doces a %i sabores",
    (quantity, maxFlavors) => {
      expect(
        getPreorderMaxFlavors(candyProduct, quantity)
      ).toBe(maxFlavors);
    }
  );
});

describe("valores das encomendas", () => {
  it("interpreta preços brasileiros e calcula proporcionalmente", () => {
    expect(parsePreorderPrice("R$ 1.234,56")).toBe(1234.56);
    expect(
      calculatePreorderTotal(
        candyProduct,
        "R$ 190,00",
        25
      )
    ).toBe(47.5);
  });

  it("calcula sinal, saldo e situação do pagamento", () => {
    expect(getPreorderDepositAmount(199.99)).toBe(100);
    expect(
      getPreorderBalance({ total: 199.99, amountPaid: 50 })
    ).toBe(149.99);
    expect(
      getPreorderPaymentStatus({ total: 200, amountPaid: 0 })
    ).toBe("awaiting_deposit");
    expect(
      getPreorderPaymentStatus({ total: 200, amountPaid: 80 })
    ).toBe("partial");
    expect(
      getPreorderPaymentStatus({ total: 200, amountPaid: 100 })
    ).toBe("deposit_paid");
    expect(
      getPreorderPaymentStatus({ total: 200, amountPaid: 200 })
    ).toBe("paid");
  });
});

describe("status das encomendas", () => {
  it.each([
    "new",
    "confirmed",
    "in_production",
    "ready",
    "completed",
    "cancelled",
  ])("reconhece %s", (status) => {
    expect(isPreorderRequestStatus(status)).toBe(true);
  });

  it("recusa status desconhecido", () => {
    expect(isPreorderRequestStatus("deleted")).toBe(false);
  });
});
