import { storeConfig } from "@/config/store";

export type NotifiableOrderStatus =
  | "confirmed"
  | "out_for_delivery"
  | "ready_for_pickup";

export type OrderStatusNotification = {
  orderId: string;
  orderNumber: number;
  phone: string;
  status: NotifiableOrderStatus;
  pickupAddress?: string;
};

export type UpdateOrderStatusResult = {
  notification: OrderStatusNotification | null;
};

export function isNotifiableOrderStatus(
  status: string
): status is NotifiableOrderStatus {
  return (
    status === "confirmed" ||
    status === "out_for_delivery" ||
    status === "ready_for_pickup"
  );
}

export function isAllowedOrderStatusTransition(
  currentStatus: string,
  nextStatus: string,
  orderType: string
) {
  if (nextStatus === "cancelled") {
    return true;
  }

  if (currentStatus === "created") {
    return nextStatus === "sent_to_whatsapp";
  }

  if (currentStatus === "sent_to_whatsapp") {
    return nextStatus === "confirmed";
  }

  if (currentStatus === "confirmed") {
    return orderType === "delivery"
      ? nextStatus === "out_for_delivery"
      : nextStatus === "ready_for_pickup";
  }

  return (
    (currentStatus === "out_for_delivery" ||
      currentStatus === "ready_for_pickup") &&
    nextStatus === "completed"
  );
}

export function normalizeWhatsAppPhone(
  phone: string
) {
  const digits = phone.replace(/\D/g, "");

  if (
    digits.length === 10 ||
    digits.length === 11
  ) {
    return `55${digits}`;
  }

  return digits;
}

export function buildOrderStatusWhatsAppMessage({
  orderNumber,
  status,
  trackingUrl,
  pickupAddress = `${storeConfig.address.street}, ${storeConfig.address.number} — ${storeConfig.address.city}/${storeConfig.address.state}`,
}: {
  orderNumber: number;
  status: NotifiableOrderStatus;
  trackingUrl: string;
  pickupAddress?: string;
}) {
  const statusMessage =
    status === "confirmed"
      ? [
          `Pedido #${orderNumber} confirmado! \u2705`,
          "",
          "Já estamos preparando seu pedido.",
          "Avisaremos por aqui quando houver uma nova atualização.",
        ]
      : status === "out_for_delivery"
        ? [
            "\u{1F6F5} Seu pedido saiu para entrega!",
            `Pedido #${orderNumber}`,
            "",
            "Agora é só aguardar. \u2764\uFE0F",
            "Obrigado por escolher a La’Bel!",
          ]
        : [
            "\u{1F381} Seu pedido está pronto para retirada!",
            `Pedido #${orderNumber}`,
            "",
            "Você já pode vir buscar seu pedido na loja.",
            pickupAddress,
          ];

  return [
    "\u{1F370} *LA’BEL CONFEITARIA*",
    "",
    ...statusMessage,
    "",
    "\u{1F50E} *Acompanhe o pedido:*",
    trackingUrl,
  ].join("\n");
}
