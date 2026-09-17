import { describe, expect, it } from "vitest";
import { normalizeOrderItemSnapshot } from "../../lib/order-item-display";

describe("Manual Discount Presentation Normalization", () => {
  it("normalizes item without discount correctly", () => {
    const snapshot = normalizeOrderItemSnapshot({
      product_name: "X-Burger",
      quantity: 2,
      unit_price: 24.9,
    });

    expect(snapshot.itemTotal).toBe(49.8);
    expect(snapshot.manualDiscountAmount).toBeNull();
  });

  it("normalizes item with fixed manual discount", () => {
    const snapshot = normalizeOrderItemSnapshot({
      product_name: "X-Burger",
      quantity: 1,
      unit_price: 24.9,
      manual_discount_type: "fixed",
      manual_discount_value: 5,
      manual_discount_amount: 5,
      manual_discount_reason: "Última unidade",
    });

    expect(snapshot.itemTotal).toBe(19.9);
    expect(snapshot.manualDiscountType).toBe("fixed");
    expect(snapshot.manualDiscountValue).toBe(5);
    expect(snapshot.manualDiscountAmount).toBe(5);
    expect(snapshot.manualDiscountReason).toBe("Última unidade");
  });

  it("normalizes item with percent manual discount and calculates amount", () => {
    const snapshot = normalizeOrderItemSnapshot({
      product_name: "X-Burger",
      quantity: 1,
      unit_price: 30,
      manual_discount_type: "percent",
      manual_discount_value: 10,
      manual_discount_amount: 3,
    });

    expect(snapshot.itemTotal).toBe(27);
    expect(snapshot.manualDiscountType).toBe("percent");
    expect(snapshot.manualDiscountValue).toBe(10);
    expect(snapshot.manualDiscountAmount).toBe(3);
    expect(snapshot.manualDiscountReason).toBeNull(); // Missing reason shouldn't crash
  });

  it("never calculates negative total for item if discount exceeds amount", () => {
    const snapshot = normalizeOrderItemSnapshot({
      product_name: "X-Burger",
      quantity: 1,
      unit_price: 10,
      manual_discount_type: "fixed",
      manual_discount_value: 15,
      manual_discount_amount: 15,
    });

    expect(snapshot.itemTotal).toBe(0); // Bounded at 0
  });
});
