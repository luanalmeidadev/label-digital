import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import OrderDetailsDialog from "../../components/admin/OrderDetailsDialog";
import { normalizeOrderItemSnapshot } from "../../lib/order-item-display";


vi.mock("../../components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

describe("OrderDetailsDialog manual discount presentation", () => {
  it("renders manual discount breakdown correctly", () => {
    // 1. Supabase-shaped item as returned by the DB
    const dbItem = {
      id: "test-item-id",
      product_name: "X-Bacon",
      quantity: 1,
      unit_price: 33.0,
      variant_name: "Clássico",
      base_unit_price: 28.0,
      options_unit_price: 5.0,
      item_notes: null,
      configuration_signature: "sig",
      manual_discount_type: "percent",
      manual_discount_value: 10,
      manual_discount_amount: 3.3,
      manual_discount_reason: null,
      order_item_options: [
        {
          id: "opt-1",
          group_name: "Adicionais",
          option_name: "Bacon",
          presentation_mode: "addition",
          price_delta: 5.0,
          group_sort_order: 1,
          option_sort_order: 1,
        },
      ],
    };

    // 2. Mapper used by the page.tsx (with the newly added fields)
    const mappedItem = {
      id: dbItem.id,
      product_name: dbItem.product_name,
      quantity: dbItem.quantity,
      unit_price: Number(dbItem.unit_price),
      variant_name: dbItem.variant_name,
      base_unit_price: Number(dbItem.base_unit_price),
      options_unit_price: Number(dbItem.options_unit_price),
      item_notes: dbItem.item_notes,
      configuration_signature: dbItem.configuration_signature,
      manual_discount_type: dbItem.manual_discount_type,
      manual_discount_value: Number(dbItem.manual_discount_value),
      manual_discount_amount: Number(dbItem.manual_discount_amount),
      manual_discount_reason: dbItem.manual_discount_reason,
      order_item_options: dbItem.order_item_options,
    };

    // Confirm that normalizer parses it without crashing
    const snapshot = normalizeOrderItemSnapshot(mappedItem as unknown as Parameters<typeof normalizeOrderItemSnapshot>[0]);
    expect(snapshot.manualDiscountAmount).toBe(3.3);
    expect(snapshot.itemTotal).toBe(29.7);

    // 3. Render OrderDetailsDialog
    const order = {
      id: "test-order-id",
      order_number: 17,
      status: "completed",
      order_type: "delivery",
      sales_channel: "admin",
      payment_method: "cash",
      cash_change_for: null,
      cashier_customer_name: null,
      cancellation_reason: null,
      subtotal: 33.0,
      delivery_fee: 0,
      total: 29.7,
      coupon_code: null,
      discount_amount: null,
      discount_percent: null,
      notes: null,
      created_at: new Date().toISOString(),
      customer: null,
      address: null,
      items: [mappedItem as unknown as Parameters<typeof normalizeOrderItemSnapshot>[0] & { id: string }],
    };

    // Using renderToStaticMarkup to get the HTML string
    const html = renderToStaticMarkup(
      <OrderDetailsDialog
        pickupAddress="Rua Teste, 123"
        trackingToken="token-123"
        order={order as unknown as Parameters<typeof OrderDetailsDialog>[0]["order"]}
        updateStatusAction={async () => ({ success: true, newStatus: "completed" as unknown as "completed", notification: null, error: null })}
        cancelSaleAction={async () => ({ success: true })}
      />
    );

    // Assert that the HTML contains the expected text blocks
    expect(html).toContain("Preço bruto da linha");
    expect(html).toContain("Desconto manual (10%)");
    expect(html).toContain(`-R$\u00A03,30`); // formatCurrency uses non-breaking space
    expect(html).toContain("Total do item");
    expect(html).toContain(`R$\u00A029,70`);
    expect(html).toContain("Descontos manuais");
  });
});
