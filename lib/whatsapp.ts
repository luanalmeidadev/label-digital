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
      ? `🚚 Entrega\n${order.address ?? "Endereço não informado"}`
      : "🏪 Retirada na loja";

  return `🍰 NOVO PEDIDO - LA'BEL

Pedido: ${order.orderNumber}

👤 Cliente
${order.customerName}

📱 ${order.phone}

${delivery}

🛍️ PEDIDO

${items}

-----------------------

Subtotal: ${currency(order.subtotal)}
Taxa de entrega: ${currency(order.deliveryFee ?? 0)}

💰 Total: ${currency(order.total)}

📝 Observações
${order.notes || "Nenhuma"}

Pedido gerado pelo Cardápio La'bel.`;
}

export function buildWhatsAppUrl(
  phone: string,
  message: string
) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}