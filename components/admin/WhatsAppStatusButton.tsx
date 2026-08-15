"use client";

import { MessageCircle } from "lucide-react";

import {
  buildOrderStatusWhatsAppMessage,
  normalizeWhatsAppPhone,
  type OrderStatusNotification,
} from "@/lib/order-status";

type WhatsAppStatusButtonProps = {
  notification: OrderStatusNotification;
  label?: string;
  onOpen?: () => void;
};

export default function WhatsAppStatusButton({
  notification,
  label = "Avisar cliente no WhatsApp",
  onOpen,
}: WhatsAppStatusButtonProps) {
  function openWhatsApp() {
    const phone = normalizeWhatsAppPhone(
      notification.phone
    );

    if (!phone) {
      return;
    }

    const trackingUrl = `${window.location.origin}/pedido/${notification.orderId}`;

    const message =
      buildOrderStatusWhatsAppMessage({
        orderNumber:
          notification.orderNumber,
        status: notification.status,
        trackingUrl,
        pickupAddress:
          notification.pickupAddress,
      });

    const whatsappParams =
      new URLSearchParams({
        phone,
        text: message,
      }).toString();

    const isMobile =
      /Android|iPhone|iPad|iPod/i.test(
        navigator.userAgent
      );

    if (isMobile) {
      window.location.href = `whatsapp://send?${whatsappParams}`;
    } else {
      window.open(
        `https://web.whatsapp.com/send?${whatsappParams}`,
        "_blank",
        "noopener,noreferrer"
      );
    }

    onOpen?.();
  }

  return (
    <button
      type="button"
      onClick={openWhatsApp}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-emerald-50 px-5 py-3.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100"
    >
      <MessageCircle size={18} />
      {label}
    </button>
  );
}
