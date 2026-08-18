import { describe, expect, it } from "vitest";

import {
  buildOrderStatusWhatsAppMessage,
  isAllowedOrderStatusTransition,
  isNotifiableOrderStatus,
  normalizeWhatsAppPhone,
} from "@/lib/order-status";

describe("fluxo dos pedidos diários", () => {
  it.each([
    ["created", "sent_to_whatsapp", "pickup"],
    ["sent_to_whatsapp", "confirmed", "pickup"],
    ["confirmed", "ready_for_pickup", "pickup"],
    ["confirmed", "out_for_delivery", "delivery"],
    ["ready_for_pickup", "completed", "pickup"],
    ["out_for_delivery", "completed", "delivery"],
  ])("permite %s → %s para %s", (current, next, type) => {
    expect(
      isAllowedOrderStatusTransition(current, next, type)
    ).toBe(true);
  });

  it.each([
    ["created", "confirmed", "pickup"],
    ["confirmed", "out_for_delivery", "pickup"],
    ["confirmed", "ready_for_pickup", "delivery"],
    ["ready_for_pickup", "confirmed", "pickup"],
  ])("bloqueia %s → %s para %s", (current, next, type) => {
    expect(
      isAllowedOrderStatusTransition(current, next, type)
    ).toBe(false);
  });

  it("permite cancelamento antes do bloqueio terminal da ação", () => {
    expect(
      isAllowedOrderStatusTransition(
        "confirmed",
        "cancelled",
        "delivery"
      )
    ).toBe(true);
  });
});

describe("avisos de status pelo WhatsApp", () => {
  it("normaliza telefones brasileiros", () => {
    expect(normalizeWhatsAppPhone("(48) 99999-9999")).toBe(
      "5548999999999"
    );
    expect(normalizeWhatsAppPhone("5548999999999")).toBe(
      "5548999999999"
    );
  });

  it.each(["confirmed", "out_for_delivery", "ready_for_pickup"])(
    "reconhece %s como notificável",
    (status) => {
      expect(isNotifiableOrderStatus(status)).toBe(true);
    }
  );

  it("monta mensagem com número e acompanhamento", () => {
    const message = buildOrderStatusWhatsAppMessage({
      orderNumber: 24,
      status: "confirmed",
      trackingUrl: "https://labelconfeitaria.com.br/pedido/abc",
    });

    expect(message).toContain("Pedido #24 confirmado");
    expect(message).toContain(
      "https://labelconfeitaria.com.br/pedido/abc"
    );
  });
});
