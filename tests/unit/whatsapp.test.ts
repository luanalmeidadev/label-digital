import { describe, expect, it } from "vitest";

import { labelInstallationPreset } from "@/config/installation/presets/label";
import { buildWhatsAppMessage } from "@/lib/whatsapp";

describe("mensagem institucional do pedido", () => {
  it("usa identidade e regionalização do Installation Profile", () => {
    const message = buildWhatsAppMessage({
      orderNumber: "24",
      customerName: "Cliente Teste",
      phone: "48999999999",
      orderType: "pickup",
      items: [
        {
          name: "Produto",
          quantity: 1,
          unitPrice: 12.5,
        },
      ],
      subtotal: 12.5,
      total: 12.5,
    });

    expect(message).toContain(
      `NOVO PEDIDO - ${labelInstallationPreset.identity.shortName.toLocaleUpperCase(
        labelInstallationPreset.regionalization.locale
      )}`
    );
    expect(message).toMatch(/R\$\s12,50/u);
    expect(message).toContain(
      `Pedido gerado pelo Cardápio ${labelInstallationPreset.identity.shortName}.`
    );
  });

  it("inclui variante, opcoes e observacao do snapshot configurado", () => {
    const message = buildWhatsAppMessage({
      orderNumber: "25",
      customerName: "Cliente Teste",
      phone: "48999999999",
      orderType: "pickup",
      items: [
        {
          name: "X-Bacon",
          quantity: 1,
          unitPrice: 37,
          variantName: "Grande",
          baseUnitPrice: 28,
          optionsUnitPrice: 9,
          itemNotes: "sem cebola",
          options: [
            {
              group_name: "Ponto da carne",
              option_name: "Ao ponto",
              presentation_mode: "choice",
              price_delta: 0,
              group_sort_order: 0,
              option_sort_order: 0,
            },
            {
              group_name: "Adicionais",
              option_name: "Cheddar",
              presentation_mode: "addition",
              price_delta: 4,
              group_sort_order: 1,
              option_sort_order: 0,
            },
          ],
        },
      ],
      subtotal: 37,
      total: 37,
    });

    expect(message).toContain("1x X-Bacon");
    expect(message).toContain("• Variante: Grande");
    expect(message).toContain("• Ponto da carne: Ao ponto");
    expect(message).toContain("• + Cheddar");
    expect(message).toContain("• Obs: sem cebola");
  });
});
