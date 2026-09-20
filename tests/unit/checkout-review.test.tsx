import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import CheckoutDrawer from "../../components/store/CheckoutDrawer";

// Setup mocks for CartProvider and router
const mockUseCart = vi.fn();
vi.mock("../../components/store/CartProvider", () => ({
  useCart: () => mockUseCart(),
}));

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock hooks used in CheckoutDrawer
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof React>();
  return {
    ...actual,
    useState: vi.fn((initial) => {
      // Mock step to be "review"
      if (initial === "customer") return ["review", vi.fn()];
      return [initial, vi.fn()];
    }),
    useTransition: () => [false, vi.fn()],
    useRef: () => ({ current: null }),
  };
});

vi.mock("../../app/store/checkout/actions", () => ({
  createOrder: vi.fn(),
}));

describe("CheckoutDrawer Review Step", () => {
  const storeSettings = {
    deliveryZones: [],
    minOrderValue: 0,
    storeId: "store_1",
    storeName: "La'Bel",
    pickupAddress: "Rua Teste",
  };

  const storeStatus = { isOpen: true, detail: "Aberto" };

  it("renders the review summary block accurately based on cart items", () => {
    // Setup Cart items (simple promotional, and variant with options)
    mockUseCart.mockReturnValue({
      items: [
        {
          lineKey: "line_1",
          id: "prod_1",
          name: "X-Burger",
          price: 20.0,
          quantity: 2, // quantity > 1
          basePrice: 24.9, // line total: 49.8
          optionsPrice: 0,
          pricingMode: "simple",
          variant: null,
          options: [],
          observedPromotionalBaseUnitPrice: 20.0, // Is promotional
        },
        {
          lineKey: "line_2",
          id: "prod_2",
          name: "X-Bacon",
          price: 32.0, // 20.0 + 12.0
          quantity: 1,
          basePrice: 20.0, // Not promotional
          optionsPrice: 12.0,
          pricingMode: "variant",
          variant: { id: "var_1", name: "Clássico", price: 20.0 },
          options: [{ id: "opt_1", groupId: "g1", groupName: "Add", name: "Cheddar", presentationMode: "addition", priceDelta: 12.0 }],
          observedPromotionalBaseUnitPrice: null,
        }
      ],
      totalItems: 3,
      subtotal: 72.0,
      clearCart: vi.fn(),
    });

    const mockOnBack = vi.fn();

    const html = renderToStaticMarkup(
      <CheckoutDrawer
        open={true}
        onClose={vi.fn()}
        onBack={mockOnBack}
        storeSettings={storeSettings as never}
        storeStatus={storeStatus as never}
      />
    ).replace(/\u00a0/g, " ");

    // Simple item with quantity > 1
    expect(html).toContain("2x X-Burger");
    expect(html).toContain("R$ 40,00"); // 2x 20
    expect(html).toContain("OFERTA");
    expect(html).toContain("R$ 49,80"); // line-through original price (2x 24.90)

    // Variant item with additions
    expect(html).toContain("1x X-Bacon");
    expect(html).toContain("Clássico");
    expect(html).toContain("+ Cheddar");
    expect(html).toContain("R$ 32,00");

    // Bottom total
    expect(html).toContain("R$ 72,00");

    // Verify "Editar sacola" is present
    expect(html).toContain("Editar sacola");
  });
});
