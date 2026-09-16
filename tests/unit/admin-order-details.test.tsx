import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import OrderDetailsDialog from "@/components/admin/OrderDetailsDialog";

vi.mock("@/components/ui/dialog", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Dialog: ({ children }: any) => <div>{children}</div>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DialogContent: ({ children }: any) => <div>{children}</div>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DialogDescription: ({ children }: any) => <div>{children}</div>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DialogTrigger: ({ children }: any) => <div>{children}</div>,
}));

describe("OrderDetailsDialog - UI Snapshots", () => {
  const dummyOrder = {
    id: "1",
    order_number: 19,
    status: "confirmed",
    order_type: "delivery" as const,
    sales_channel: "online" as const,
    payment_method: "pix" as const,
    cash_change_for: null,
    cashier_customer_name: null,
    cancellation_reason: null,
    subtotal: 24.9,
    delivery_fee: 8.0,
    total: 30.41,
    coupon_code: "CDL10",
    discount_percent: 10,
    discount_amount: 2.49,
    notes: null,
    created_at: new Date().toISOString(),
    customer: {
      first_name: "John",
      last_name: "Doe",
      phone: "11999999999",
    },
    address: {
      street: "Rua",
      number: "123",
      complement: null,
      neighborhood: "Centro",
      city: "Palhoça",
      reference: null,
    },
    items: [],
  };

  const dummyProps = {
    pickupAddress: "Loja Principal",
    trackingToken: "token",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateStatusAction: async () => ({ success: true }) as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cancelSaleAction: async () => ({ success: true }) as any,
  };

  it("renderiza a linha de desconto quando houver cupom persistido no snapshot", () => {
    const html = renderToStaticMarkup(
      <OrderDetailsDialog order={dummyOrder} {...dummyProps} />
    );

    expect(html).toContain("CDL10");
    expect(html).toContain("(10%)");
    expect(html).toContain("2,49"); // formatCurrency will produce "R$&nbsp;2,49" or similar
  });

  it("não renderiza a linha de desconto se não houver cupom", () => {
    const html = renderToStaticMarkup(
      <OrderDetailsDialog
        order={{ ...dummyOrder, discount_amount: 0, coupon_code: null, discount_percent: null }}
        {...dummyProps}
      />
    );

    expect(html).not.toContain("CDL10");
  });
});
