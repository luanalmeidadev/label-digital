type WhatsAppItem = {
  name: string;
  quantity: number;
  unitPrice: number;
};

type WhatsAppOrder = {
  orderNumber: string;

  customerName: string;
  phone: string;

  orderType: "pickup" | "delivery";

  address?: string;

  items: WhatsAppItem[];

  subtotal: number;

  deliveryFee?: number;

  total: number;

  notes?: string;
};

function currency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function buildWhatsAppMessage(order: WhatsAppOrder) {
  const items = order.items
    .map(
      (item) =>
        `${item.quantity}x ${item.name}\n${currency(item.unitPrice)} cada`
    )
    .join("\n\n");

  const delivery =
    order.orderType === "delivery"
      ? `\u{1F69A} Entrega\n${order.address ?? "Endereço não informado"}`
      : "\u{1F3EA} Retirada na loja";

  return `\u{1F370} NOVO PEDIDO - LA'BEL

Pedido: ${order.orderNumber}

\u{1F464} Cliente
${order.customerName}

\u{1F4F1} ${order.phone}

${delivery}

\u{1F6CD}\uFE0F PEDIDO

${items}

-----------------------

Subtotal: ${currency(order.subtotal)}
Taxa de entrega: ${currency(order.deliveryFee ?? 0)}

\u{1F4B0} Total: ${currency(order.total)}

\u{1F4DD} Observações
${order.notes || "Nenhuma"}

Pedido gerado pelo Cardápio La'bel.`;
}

export function buildWhatsAppUrl(
  phone: string,
  message: string
) {
  return buildWhatsAppShortUrl(phone, message);
}
import { buildWhatsAppShortUrl } from "@/lib/whatsapp-link";
