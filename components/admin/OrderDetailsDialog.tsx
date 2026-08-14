"use client";

import { useState } from "react";
import {
  Check,
  CheckCircle2,
  ClipboardList,
  MapPin,
  MessageCircle,
  PackageCheck,
  Phone,
  ShoppingBag,
  Truck,
  User,
  XCircle,
} from "lucide-react";

import WhatsAppStatusButton from "@/components/admin/WhatsAppStatusButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  isNotifiableOrderStatus,
  type OrderStatusNotification,
  type UpdateOrderStatusResult,
} from "@/lib/order-status";

type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
};

type OrderDetailsDialogProps = {
  order: {
    id: string;
    order_number: number;
    status: string;
    order_type: string;

    subtotal: number;
    delivery_fee: number;
    total: number;

    notes: string | null;
    created_at: string;

    customer: {
      first_name: string;
      last_name: string;
      phone: string;
    } | null;

    address: {
      street: string;
      number: string;
      complement: string | null;
      neighborhood: string;
      city: string;
      reference: string | null;
    } | null;

    items: OrderItem[];
  };

  updateStatusAction: (
    formData: FormData
  ) => Promise<UpdateOrderStatusResult>;
};

const statusLabels: Record<string, string> = {
  created: "Criado",
  sent_to_whatsapp: "Enviado ao WhatsApp",
  confirmed: "Confirmado",
  out_for_delivery: "Saiu para entrega",
  ready_for_pickup: "Pronto para retirada",
  completed: "Finalizado",
  cancelled: "Cancelado",
};

const statusClasses: Record<string, string> = {
  created: "bg-gray-100 text-gray-700",
  sent_to_whatsapp:
    "bg-emerald-100 text-emerald-700",
  confirmed: "bg-blue-100 text-blue-700",
  out_for_delivery:
    "bg-orange-100 text-orange-700",
  ready_for_pickup:
    "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function getNextStatus(
  status: string,
  orderType: string
) {
  if (status === "created") {
    return {
      status: "sent_to_whatsapp",
      label: "Marcar como enviado ao WhatsApp",
      icon: MessageCircle,
    };
  }

  if (status === "sent_to_whatsapp") {
    return {
      status: "confirmed",
      label: "Confirmar pedido",
      icon: Check,
    };
  }

  if (
    status === "confirmed" &&
    orderType === "delivery"
  ) {
    return {
      status: "out_for_delivery",
      label: "Marcar como saiu para entrega",
      icon: Truck,
    };
  }

  if (
    status === "confirmed" &&
    orderType === "pickup"
  ) {
    return {
      status: "ready_for_pickup",
      label: "Marcar como pronto para retirada",
      icon: ShoppingBag,
    };
  }

  if (
    status === "out_for_delivery" ||
    status === "ready_for_pickup"
  ) {
    return {
      status: "completed",
      label: "Finalizar pedido",
      icon: CheckCircle2,
    };
  }

  return null;
}

export default function OrderDetailsDialog({
  order,
  updateStatusAction,
}: OrderDetailsDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] =
    useState("");
  const [notification, setNotification] =
    useState<OrderStatusNotification | null>(
      null
    );

  const nextStatus = getNextStatus(
    order.status,
    order.order_type
  );

  const locked =
    order.status === "completed" ||
    order.status === "cancelled";

  const currentNotification =
    order.customer?.phone &&
    isNotifiableOrderStatus(order.status)
      ? {
          orderId: order.id,
          orderNumber: order.order_number,
          phone: order.customer.phone,
          status: order.status,
        }
      : null;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (!nextOpen) {
      setActionError("");
      setNotification(null);
    }
  }

  async function changeStatus(
    status: string
  ) {
    try {
      setSaving(true);
      setActionError("");

      const formData = new FormData();

      formData.set("id", order.id);
      formData.set("status", status);

      const result =
        await updateStatusAction(formData);

      if (result.notification) {
        setNotification(
          result.notification
        );
      } else {
        setOpen(false);
      }
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o pedido."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            className="rounded-xl border border-[#EEE6DF] px-4 py-2.5 text-sm font-bold text-[#8B0000] transition hover:border-[#D2B48C]"
          />
        }
      >
        Ver pedido
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-3">
            <DialogTitle>
              Pedido #{order.order_number}
            </DialogTitle>

            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                statusClasses[order.status] ??
                "bg-gray-100 text-gray-700"
              }`}
            >
              {statusLabels[order.status] ??
                order.status}
            </span>
          </div>

          <DialogDescription>
            Consulte os dados e acompanhe o
            andamento do pedido.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5 space-y-6">
          {/* CLIENTE / RECEBIMENTO */}
          <section className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#EEE6DF] p-4">
              <div className="flex items-center gap-2 text-[#8B0000]">
                <User size={18} />

                <p className="text-sm font-bold">
                  Cliente
                </p>
              </div>

              <p className="mt-3 font-bold text-[#241B19]">
                {order.customer
                  ? `${order.customer.first_name} ${order.customer.last_name}`
                  : "Cliente não identificado"}
              </p>

              {order.customer && (
                <div className="mt-2 flex items-center gap-2 text-sm text-[#756A66]">
                  <Phone size={14} />
                  {order.customer.phone}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[#EEE6DF] p-4">
              <div className="flex items-center gap-2 text-[#8B0000]">
                <MapPin size={18} />

                <p className="text-sm font-bold">
                  Recebimento
                </p>
              </div>

              <p className="mt-3 font-bold text-[#241B19]">
                {order.order_type === "delivery"
                  ? "Entrega"
                  : "Retirada na loja"}
              </p>

              {order.order_type ===
                "delivery" &&
                order.address && (
                  <p className="mt-2 text-sm leading-6 text-[#756A66]">
                    {order.address.street},{" "}
                    {order.address.number}

                    {order.address.complement
                      ? ` - ${order.address.complement}`
                      : ""}

                    <br />

                    {order.address.neighborhood} -{" "}
                    {order.address.city}

                    {order.address.reference && (
                      <>
                        <br />
                        Referência:{" "}
                        {order.address.reference}
                      </>
                    )}
                  </p>
                )}
            </div>
          </section>

          {/* ITENS */}
          <section className="rounded-2xl border border-[#EEE6DF]">
            <div className="flex items-center gap-2 border-b border-[#EEE6DF] p-4 text-[#8B0000]">
              <ClipboardList size={18} />

              <p className="text-sm font-bold">
                Itens do pedido
              </p>
            </div>

            <div className="divide-y divide-[#EEE6DF]">
              {order.items.map((item) => {
                const itemTotal =
                  Number(item.unit_price) *
                  item.quantity;

                return (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-4 p-4"
                  >
                    <div>
                      <p className="font-bold text-[#241B19]">
                        {item.quantity}x{" "}
                        {item.product_name}
                      </p>

                      <p className="mt-1 text-xs text-[#756A66]">
                        {formatCurrency(
                          Number(
                            item.unit_price
                          )
                        )}{" "}
                        cada
                      </p>
                    </div>

                    <p className="font-bold text-[#241B19]">
                      {formatCurrency(
                        itemTotal
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* VALORES */}
          <section className="rounded-2xl bg-[#FFF7F5] p-5">
            <div className="space-y-3">
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-[#756A66]">
                  Subtotal
                </span>

                <span className="font-bold text-[#241B19]">
                  {formatCurrency(
                    Number(order.subtotal)
                  )}
                </span>
              </div>

              <div className="flex justify-between gap-4 text-sm">
                <span className="text-[#756A66]">
                  Taxa de entrega
                </span>

                <span className="font-bold text-[#241B19]">
                  {formatCurrency(
                    Number(
                      order.delivery_fee
                    )
                  )}
                </span>
              </div>

              <div className="border-t border-[#E8D9D2] pt-3">
                <div className="flex justify-between gap-4">
                  <span className="font-bold text-[#241B19]">
                    Total
                  </span>

                  <span className="text-xl font-bold text-[#8B0000]">
                    {formatCurrency(
                      Number(order.total)
                    )}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* OBSERVAÇÕES */}
          {order.notes && (
            <section>
              <p className="text-sm font-bold text-[#241B19]">
                Observações
              </p>

              <div className="mt-2 rounded-2xl border border-[#EEE6DF] bg-white p-4 text-sm leading-6 text-[#756A66]">
                {order.notes}
              </div>
            </section>
          )}

          {/* CONTROLE DE STATUS */}
          <section className="rounded-2xl border border-[#EEE6DF] p-5">
            <div className="flex items-center gap-2">
              <PackageCheck
                size={18}
                className="text-[#8B0000]"
              />

              <p className="font-bold text-[#241B19]">
                Andamento do pedido
              </p>
            </div>

            {actionError && (
              <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
                {actionError}
              </div>
            )}

            {notification && (
              <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    size={20}
                    className="mt-0.5 shrink-0 text-emerald-600"
                  />

                  <div>
                    <p className="font-bold text-emerald-700">
                      Status atualizado
                    </p>

                    <p className="mt-1 text-sm leading-5 text-emerald-700">
                      A mensagem está pronta. Abra o WhatsApp e toque em enviar.
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <WhatsAppStatusButton
                    notification={notification}
                    label="Abrir mensagem no WhatsApp"
                    onOpen={() => setOpen(false)}
                  />
                </div>
              </div>
            )}

            {order.status === "completed" && (
              <div className="mt-4 rounded-xl border border-green-100 bg-green-50 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    size={20}
                    className="mt-0.5 shrink-0 text-green-600"
                  />

                  <div>
                    <p className="font-bold text-green-700">
                      Pedido finalizado
                    </p>

                    <p className="mt-1 text-sm text-green-600">
                      Este pedido já está contabilizado
                      no faturamento realizado.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {order.status === "cancelled" && (
              <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <XCircle
                    size={20}
                    className="mt-0.5 shrink-0 text-red-600"
                  />

                  <div>
                    <p className="font-bold text-red-700">
                      Pedido cancelado
                    </p>

                    <p className="mt-1 text-sm text-red-600">
                      Este pedido não entra no
                      faturamento.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!notification &&
              !locked &&
              nextStatus && (
              <div className="mt-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-[#756A66]">
                  Próxima etapa
                </p>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    changeStatus(
                      nextStatus.status
                    )
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#8B0000] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#700000] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <nextStatus.icon size={18} />

                  {saving
                    ? "Atualizando..."
                    : nextStatus.label}
                </button>
              </div>
            )}

            {!notification &&
              currentNotification && (
                <div className="mt-4">
                  <WhatsAppStatusButton
                    notification={
                      currentNotification
                    }
                  />
                </div>
              )}

            {!notification && !locked && (
              <div className="mt-4 border-t border-[#EEE6DF] pt-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    const confirmCancel =
                      window.confirm(
                        "Tem certeza que deseja cancelar este pedido?"
                      );

                    if (confirmCancel) {
                      changeStatus(
                        "cancelled"
                      );
                    }
                  }}
                  className="flex items-center gap-2 text-sm font-bold text-red-600 transition hover:text-red-700 disabled:opacity-50"
                >
                  <XCircle size={17} />
                  Cancelar pedido
                </button>
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
