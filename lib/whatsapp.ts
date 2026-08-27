import { getPublicInstallationProfile } from "@/config/installation/public";
import {
  buildOrderItemWhatsAppLines,
  type OrderItemOptionSnapshotInput,
} from "@/lib/order-item-display";
import { buildWhatsAppShortUrl } from "@/lib/whatsapp-link";

const installation = getPublicInstallationProfile();

type WhatsAppItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  variantName?: string | null;
  baseUnitPrice?: number | null;
  optionsUnitPrice?: number;
  itemNotes?: string | null;
  options?: OrderItemOptionSnapshotInput[];
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
  return new Intl.NumberFormat(installation.regionalization.locale, {
    style: "currency",
    currency: installation.regionalization.currency,
  }).format(value);
}

export function buildWhatsAppMessage(order: WhatsAppOrder) {
  const items = order.items
    .map((item) => {
      const configured = Boolean(
        item.variantName || item.itemNotes || item.options?.length
      );

      if (!configured) {
        return `${item.quantity}x ${item.name}\n${currency(item.unitPrice)} cada`;
      }

      return buildOrderItemWhatsAppLines(
        {
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          variant_name: item.variantName,
          base_unit_price: item.baseUnitPrice,
          options_unit_price: item.optionsUnitPrice,
          item_notes: item.itemNotes,
          order_item_options: item.options,
        },
        currency
      ).join("\n");
    })
    .join("\n\n");

  const delivery =
    order.orderType === "delivery"
      ? `\u{1F69A} Entrega\n${order.address ?? "Endereço não informado"}`
      : "\u{1F3EA} Retirada na loja";

  return `\u{1F370} NOVO PEDIDO - ${installation.identity.shortName.toLocaleUpperCase(
    installation.regionalization.locale
  )}

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

Pedido gerado pelo Cardápio ${installation.identity.shortName}.`;
}

export function buildWhatsAppUrl(
  phone: string,
  message: string
) {
  return buildWhatsAppShortUrl(phone, message);
}
