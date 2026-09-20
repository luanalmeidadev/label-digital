import { describe, expect, it } from "vitest";

function calculateCouponEligibleSubtotal(pricedItems: Array<{
  unitPrice: number;
  quantity: number;
  observedPromotionalBaseUnitPrice: number | null;
}>) {
  return pricedItems.reduce(
    (sum, item) =>
      item.observedPromotionalBaseUnitPrice == null
        ? sum + item.unitPrice * item.quantity
        : sum,
    0
  );
}

describe("Regra de Cupom - Elegibilidade por Promoção", () => {
  it("Produto normal R$10, Evento availability-only (CDL10) => desconto R$1", () => {
    // Evento de availability-only (destaque) não tem preço promocional (observedPromotionalBaseUnitPrice = null)
    const pricedItems = [
      {
        productName: "Produto normal",
        unitPrice: 10,
        quantity: 1,
        observedEventId: "evento-destaque-123",
        observedPromotionalBaseUnitPrice: null, // não alterou o preço
      }
    ];

    const eligibleSubtotal = calculateCouponEligibleSubtotal(pricedItems);
    expect(eligibleSubtotal).toBe(10); // R$10 é elegível

    // Simulando cupom CDL10 (10% de desconto)
    const discount = eligibleSubtotal * 0.10;
    expect(discount).toBe(1);
  });

  it("Produto promo R$20, Produto normal R$10 (CDL10) => desconto apenas R$1 sobre o normal", () => {
    const pricedItems = [
      {
        productName: "Produto promo",
        unitPrice: 20,
        quantity: 1,
        observedEventId: "evento-desconto-456",
        observedPromotionalBaseUnitPrice: 20, // preço promocional ativado
      },
      {
        productName: "Produto normal",
        unitPrice: 10,
        quantity: 1,
        observedEventId: null,
        observedPromotionalBaseUnitPrice: null, // sem promoção
      }
    ];

    const eligibleSubtotal = calculateCouponEligibleSubtotal(pricedItems);
    expect(eligibleSubtotal).toBe(10); // Somente o Produto normal é elegível (R$10)

    // Simulando cupom CDL10 (10% de desconto)
    const discount = eligibleSubtotal * 0.10;
    expect(discount).toBe(1);
  });
});
