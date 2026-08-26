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
});
