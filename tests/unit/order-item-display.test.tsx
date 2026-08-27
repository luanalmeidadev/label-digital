import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import OrderItemSnapshotDetails from "@/components/orders/OrderItemSnapshotDetails";
import {
  buildOrderItemWhatsAppLines,
  normalizeOrderItemSnapshot,
  type OrderItemSnapshotInput,
} from "@/lib/order-item-display";

const formatCurrency = (value: number) => `R$ ${value.toFixed(2)}`;

const configuredItem: OrderItemSnapshotInput = {
  id: "order-item-history",
  product_name: "X-Bacon",
  quantity: 2,
  unit_price: 37,
  variant_name: "Grande",
  base_unit_price: 28,
  options_unit_price: 9,
  item_notes: "sem cebola",
  configuration_signature: "a".repeat(64),
  order_item_options: [
    {
      id: "snapshot-bacon",
      group_name: "Adicionais",
      option_name: "Bacon",
      presentation_mode: "addition",
      price_delta: 5,
      group_sort_order: 2,
      option_sort_order: 2,
    },
    {
      id: "snapshot-point",
      group_name: "Ponto da carne",
      option_name: "Ao ponto",
      presentation_mode: "choice",
      price_delta: 0,
      group_sort_order: 1,
      option_sort_order: 1,
    },
    {
      id: "snapshot-cheddar",
      group_name: "Adicionais",
      option_name: "Cheddar",
      presentation_mode: "addition",
      price_delta: 4,
      group_sort_order: 2,
      option_sort_order: 1,
    },
  ],
};

describe("apresentacao do snapshot de item do pedido", () => {
  it("mantem item legado simples sem detalhes adicionais", () => {
    const legacyItem: OrderItemSnapshotInput = {
      id: "legacy-item",
      product_name: "Brownie",
      quantity: 1,
      unit_price: "12.00",
    };
    const item = normalizeOrderItemSnapshot(legacyItem);
    const html = renderToStaticMarkup(
      <OrderItemSnapshotDetails
        item={legacyItem}
        formatCurrency={formatCurrency}
      />
    );

    expect(item).toMatchObject({
      productName: "Brownie",
      unitPrice: 12,
      itemTotal: 12,
      hasConfiguration: false,
      options: [],
    });
    expect(html).toBe("");
  });

  it("renderiza variante, opcoes ordenadas, observacao e precos salvos", () => {
    const html = renderToStaticMarkup(
      <OrderItemSnapshotDetails
        item={configuredItem}
        formatCurrency={formatCurrency}
        showPriceBreakdown
      />
    );

    expect(html).toContain("Variante: Grande");
    expect(html).toContain("Ponto da carne: Ao ponto");
    expect(html).toContain("+ Cheddar");
    expect(html).toContain("+ Bacon");
    expect(html).toContain("Obs:");
    expect(html).toContain("sem cebola");
    expect(html).toContain("Base R$ 28.00 + adicionais R$ 9.00 = R$ 37.00 cada");
    expect(html.indexOf("Ao ponto")).toBeLessThan(html.indexOf("Cheddar"));
    expect(html.indexOf("Cheddar")).toBeLessThan(html.indexOf("Bacon"));
    expect(html).not.toContain("snapshot-point");
  });

  it("preserva nomes historicos sem IDs ou consulta ao catalogo atual", () => {
    const item = normalizeOrderItemSnapshot({
      ...configuredItem,
      variant_name: "Tamanho descontinuado",
      order_item_options: [
        {
          group_name: "Grupo removido",
          option_name: "Opcao removida",
          presentation_mode: "addition",
          price_delta: "7.50",
          group_sort_order: 0,
          option_sort_order: 0,
        },
      ],
    });

    expect(item.variantName).toBe("Tamanho descontinuado");
    expect(item.options[0]).toMatchObject({
      groupName: "Grupo removido",
      optionName: "Opcao removida",
      priceDelta: 7.5,
    });
  });

  it("gera o bloco operacional do WhatsApp a partir do snapshot", () => {
    expect(buildOrderItemWhatsAppLines(configuredItem, formatCurrency)).toEqual([
      "2x X-Bacon — R$ 74.00",
      "• Variante: Grande",
      "• Ponto da carne: Ao ponto",
      "• + Cheddar",
      "• + Bacon",
      "• Obs: sem cebola",
    ]);
  });

  it("mantem a comanda compacta sem expor o nome tecnico do grupo de escolha", () => {
    const html = renderToStaticMarkup(
      <OrderItemSnapshotDetails
        item={configuredItem}
        formatCurrency={formatCurrency}
        print
      />
    );

    expect(html).toContain("Ao ponto");
    expect(html).not.toContain("Ponto da carne:");
    expect(html).toContain("+ Cheddar");
    expect(html).toContain("Obs:");
  });
});
