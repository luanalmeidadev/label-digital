"use client";

import { useState } from "react";
import {
  CheckCircle2,
  MapPin,
  Phone,
  Truck,
  UserRound,
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

type DeliveryDetailsDialogProps = {
  delivery: {
    id: string;
    order_number: number;
    status: string;
    delivery_fee: number;
    total: number;
    notes: string | null;

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
  };

  updateStatusAction: (
    formData: FormData
  ) => Promise<UpdateOrderStatusResult>;
};

const statusLabels: Record<string, string> = {
  created: "Criado",
  sent_to_whatsapp: "Enviado ao WhatsApp",
  confirmed: "Aguardando saída",
  out_for_delivery: "Em rota",
  completed: "Concluída",
  cancelled: "Cancelada",
};

const statusClasses: Record<string, string> = {
  created: "bg-gray-100 text-gray-700",
  sent_to_whatsapp:
    "bg-emerald-100 text-emerald-700",
  confirmed:
    "bg-amber-100 text-amber-700",
  out_for_delivery:
    "bg-orange-100 text-orange-700",
  completed:
    "bg-green-100 text-green-700",
  cancelled:
    "bg-red-100 text-red-700",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function getNextDeliveryAction(status: string) {
  if (status === "confirmed") {
    return {
      status: "out_for_delivery",
      label: "Marcar como saiu para entrega",
      icon: Truck,
    };
  }

  if (status === "out_for_delivery") {
    return {
      status: "completed",
      label: "Finalizar entrega",
      icon: CheckCircle2,
    };
  }

  return null;
}

export default function DeliveryDetailsDialog({
  delivery,
  updateStatusAction,
}: DeliveryDetailsDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] =
    useState("");
  const [notification, setNotification] =
    useState<OrderStatusNotification | null>(
      null
    );

  const nextAction =
    getNextDeliveryAction(delivery.status);

  const currentNotification =
    delivery.customer?.phone &&
    isNotifiableOrderStatus(
      delivery.status
    )
      ? {
          orderId: delivery.id,
          orderNumber:
            delivery.order_number,
          phone: delivery.customer.phone,
          status: delivery.status,
        }
      : null;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (!nextOpen) {
      setActionError("");
      setNotification(null);
    }
  }

  async function changeStatus(status: string) {
    try {
      setSaving(true);
      setActionError("");

      const formData = new FormData();
      formData.set("id", delivery.id);
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
          : "Não foi possível atualizar a entrega."
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
        Ver entrega
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-3">
            <DialogTitle>
              Entrega do pedido #{delivery.order_number}
            </DialogTitle>

            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                statusClasses[delivery.status] ??
                "bg-gray-100 text-gray-700"
              }`}
            >
              {statusLabels[delivery.status] ??
                delivery.status}
            </span>
          </div>

          <DialogDescription>
            Consulte os dados da entrega e atualize o andamento.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5 space-y-5">
          <section className="rounded-2xl border border-[#EEE6DF] p-5">
            <div className="flex items-center gap-2 text-[#8B0000]">
              <UserRound size={18} />
              <p className="font-bold">Cliente</p>
            </div>

            <p className="mt-3 font-bold text-[#241B19]">
              {delivery.customer
                ? `${delivery.customer.first_name} ${delivery.customer.last_name}`
                : "Cliente não identificado"}
            </p>

            {delivery.customer && (
              <div className="mt-2 flex items-center gap-2 text-sm text-[#756A66]">
                <Phone size={14} />
                {delivery.customer.phone}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-[#EEE6DF] p-5">
            <div className="flex items-center gap-2 text-[#8B0000]">
              <MapPin size={18} />
              <p className="font-bold">Endereço de entrega</p>
            </div>

            {delivery.address ? (
              <p className="mt-3 text-sm leading-6 text-[#756A66]">
                {delivery.address.street},{" "}
                {delivery.address.number}

                {delivery.address.complement
                  ? ` - ${delivery.address.complement}`
                  : ""}

                <br />

                {delivery.address.neighborhood} -{" "}
                {delivery.address.city}

                {delivery.address.reference && (
                  <>
                    <br />
                    Referência:{" "}
                    {delivery.address.reference}
                  </>
                )}
              </p>
            ) : (
              <p className="mt-3 text-sm font-semibold text-red-600">
                Endereço não encontrado.
              </p>
            )}
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-[#FFF7F5] p-4">
              <p className="text-xs text-[#756A66]">
                Taxa de entrega
              </p>

              <p className="mt-1 font-bold text-[#241B19]">
                {formatCurrency(delivery.delivery_fee)}
              </p>
            </div>

            <div className="rounded-2xl bg-[#FFF7F5] p-4">
              <p className="text-xs text-[#756A66]">
                Total do pedido
              </p>

              <p className="mt-1 font-bold text-[#8B0000]">
                {formatCurrency(delivery.total)}
              </p>
            </div>
          </section>

          {delivery.notes && (
            <section>
              <p className="text-sm font-bold text-[#241B19]">
                Observações
              </p>

              <div className="mt-2 rounded-2xl border border-[#EEE6DF] p-4 text-sm leading-6 text-[#756A66]">
                {delivery.notes}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-[#EEE6DF] p-5">
            <div className="flex items-center gap-2 text-[#8B0000]">
              <Truck size={18} />
              <p className="font-bold">Andamento da entrega</p>
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

            {nextAction ? (
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  changeStatus(nextAction.status)
                }
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#8B0000] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#700000] disabled:opacity-60"
              >
                <nextAction.icon size={18} />

                {saving
                  ? "Atualizando..."
                  : nextAction.label}
              </button>
            ) : (
              <div className="mt-4 rounded-xl bg-[#FFF7F5] p-4 text-sm text-[#756A66]">
                {delivery.status === "completed"
                  ? "Esta entrega já foi concluída."
                  : delivery.status === "cancelled"
                  ? "Esta entrega foi cancelada."
                  : "A entrega ainda não está pronta para avançar nesta etapa."}
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
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
