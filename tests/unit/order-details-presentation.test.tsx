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

  it("exibe snapshots históricos de promoção no detalhe do pedido do Admin", () => {
    const promoItem = {
      id: "promo-item-id",
      product_name: "X-Burger",
      quantity: 1,
      unit_price: 20.0,
      variant_name: null,
      base_unit_price: 24.9,
      options_unit_price: 0,
      item_notes: null,
      configuration_signature: "sig-burger",
      manual_discount_type: null,
      manual_discount_value: null,
      manual_discount_amount: null,
      manual_discount_reason: null,
      promotional_event_id: "evt-123",
      promotional_event_name: "Dia do X-Burger",
      promotional_base_unit_price: 20.0,
      order_item_options: [],
    };

    const regularItem = {
      id: "regular-item-id",
      product_name: "Refrigerante",
      quantity: 1,
      unit_price: 8.0,
      variant_name: null,
      base_unit_price: 8.0,
      options_unit_price: 0,
      item_notes: null,
      configuration_signature: "sig-soda",
      promotional_event_id: null,
      promotional_event_name: null,
      promotional_base_unit_price: null,
      order_item_options: [],
    };

    const order = {
      id: "promo-order-id",
      order_number: 114,
      status: "sent_to_whatsapp",
      order_type: "delivery",
      sales_channel: "online",
      payment_method: "pix",
      cash_change_for: null,
      cashier_customer_name: null,
      cancellation_reason: null,
      subtotal: 28.0,
      delivery_fee: 8.0,
      total: 36.0,
      coupon_code: null,
      discount_amount: null,
      discount_percent: null,
      notes: null,
      created_at: new Date().toISOString(),
      customer: null,
      address: null,
      items: [promoItem, regularItem],
    };

    const html = renderToStaticMarkup(
      <OrderDetailsDialog
        pickupAddress="Rua Teste, 123"
        trackingToken="token-114"
        order={order as unknown as Parameters<typeof OrderDetailsDialog>[0]["order"]}
        updateStatusAction={async () => ({ success: true, newStatus: "completed" as unknown as "completed", notification: null, error: null })}
        cancelSaleAction={async () => ({ success: true })}
      />
    );

    // D) Admin exibe snapshots promocionais
    expect(html).toContain("Preço normal:");
    expect(html).toContain("24,90");
    expect(html).toContain("Promo &quot;Dia do X-Burger&quot;:");
    expect(html).toContain("20,00");

    // E) Item sem promoção mantém apresentação normal sem tag promo
    expect(html).toContain("Refrigerante");
    expect(html).not.toContain('Promo "Dia do Refrigerante"');
  });

  it("exibe a cadeia completa (Normal -> Promo -> Desconto Manual -> Líquido) para pedido do Caixa com promoção e desconto manual (Cenário #121)", () => {
    const cashierItem = {
      id: "cashier-item-121",
      product_name: "X-Burger",
      quantity: 1,
      unit_price: 20.0,
      variant_name: null,
      base_unit_price: 24.9,
      options_unit_price: 0,
      item_notes: null,
      configuration_signature: "sig-burger",
      manual_discount_type: "percent",
      manual_discount_value: 10,
      manual_discount_amount: 2.0,
      manual_discount_reason: null,
      promotional_event_id: "evt-123",
      promotional_event_name: "Dia do X-Burger",
      promotional_base_unit_price: 20.0,
      order_item_options: [],
    };

    const order = {
      id: "order-121-id",
      order_number: 121,
      status: "completed",
      order_type: "pickup",
      sales_channel: "cashier",
      payment_method: "pix",
      cash_change_for: null,
      cashier_customer_name: null,
      cancellation_reason: null,
      subtotal: 20.0,
      delivery_fee: 0,
      total: 18.0,
      coupon_code: null,
      discount_amount: null,
      discount_percent: null,
      notes: null,
      created_at: new Date().toISOString(),
      customer: null,
      address: null,
      items: [cashierItem],
    };

    const html = renderToStaticMarkup(
      <OrderDetailsDialog
        pickupAddress="Rua Teste, 123"
        trackingToken="token-121"
        order={order as unknown as Parameters<typeof OrderDetailsDialog>[0]["order"]}
        updateStatusAction={async () => ({ success: true, newStatus: "completed" as unknown as "completed", notification: null, error: null })}
        cancelSaleAction={async () => ({ success: true })}
      />
    );

    // C) OrderItemSnapshotDetails + OrderDetailsDialog exibe a cadeia completa
    expect(html).toContain("Preço normal:");
    expect(html).toContain("24,90");
    expect(html).toContain("Promo &quot;Dia do X-Burger&quot;:");
    expect(html).toContain("20,00");
    expect(html).toContain("Preço promocional da linha");
    expect(html).toContain("Desconto manual (10%)");
    expect(html).toContain(`-R$\u00A02,00`);
    expect(html).toContain(`R$\u00A018,00`);
  });
});
