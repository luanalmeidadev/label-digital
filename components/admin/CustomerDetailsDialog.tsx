"use client";

import {
  CheckCircle2,
  Clock3,
  MapPin,
  Phone,
  ShoppingBag,
  UserRound,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Address = {
  id: string;
  label: string | null;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  reference: string | null;
  is_default: boolean;
};

type Order = {
  id: string;
  order_number: number;
  order_type: string;
  status: string;
  total: number;
  created_at: string;
};

type CustomerDetailsDialogProps = {
  customer: {
    first_name: string;
    last_name: string;
    phone: string;
    created_at: string;
    addresses: Address[];
    orders: Order[];
  };
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
  sent_to_whatsapp: "bg-emerald-100 text-emerald-700",
  confirmed: "bg-blue-100 text-blue-700",
  out_for_delivery: "bg-orange-100 text-orange-700",
  ready_for_pickup: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function CustomerDetailsDialog({
  customer,
}: CustomerDetailsDialogProps) {
  const orders = [...customer.orders].sort(
    (a, b) =>
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime()
  );

  const completedOrders = orders.filter(
    (order) => order.status === "completed"
  );

  const totalSpent = completedOrders.reduce(
    (sum, order) => sum + Number(order.total),
    0
  );

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className="rounded-xl border border-brand-border px-4 py-2.5 text-sm font-bold text-brand-primary transition hover:border-brand-secondary hover:bg-[#FFF7F5]"
          />
        }
      >
        Ver cliente
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {customer.first_name} {customer.last_name}
          </DialogTitle>

          <DialogDescription>
            Consulte os dados, endereços e histórico de pedidos
            deste cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5 space-y-6">
          {/* DADOS DO CLIENTE */}
          <section className="rounded-2xl border border-brand-border p-5">
            <div className="flex items-center gap-2 text-brand-primary">
              <UserRound size={18} />

              <p className="font-bold">Dados do cliente</p>
            </div>

            <div className="mt-4">
              <p className="font-bold text-brand-foreground">
                {customer.first_name} {customer.last_name}
              </p>

              <div className="mt-2 flex items-center gap-2 text-sm text-brand-muted-foreground">
                <Phone size={15} />
                {customer.phone}
              </div>

              <p className="mt-2 text-xs text-brand-muted-foreground">
                Cliente desde {formatDate(customer.created_at)}
              </p>
            </div>
          </section>

          {/* RESUMO */}
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#FFF7F5] p-4">
              <div className="flex items-center gap-2 text-brand-muted-foreground">
                <ShoppingBag size={16} />

                <p className="text-xs">Pedidos</p>
              </div>

              <p className="mt-2 text-xl font-bold text-brand-foreground">
                {orders.length}
              </p>
            </div>

            <div className="rounded-2xl bg-[#FFF7F5] p-4">
              <div className="flex items-center gap-2 text-brand-muted-foreground">
                <CheckCircle2 size={16} />

                <p className="text-xs">Finalizados</p>
              </div>

              <p className="mt-2 text-xl font-bold text-brand-foreground">
                {completedOrders.length}
              </p>
            </div>

            <div className="rounded-2xl bg-[#FFF7F5] p-4">
              <p className="text-xs text-brand-muted-foreground">
                Total gasto
              </p>

              <p className="mt-2 text-xl font-bold text-brand-primary">
                {formatCurrency(totalSpent)}
              </p>

              <p className="mt-1 text-[11px] text-brand-muted-foreground">
                Somente finalizados
              </p>
            </div>
          </section>

          {/* ENDEREÇOS */}
          <section>
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-brand-primary" />

              <h3 className="font-bold text-brand-foreground">
                Endereços
              </h3>
            </div>

            {customer.addresses.length > 0 ? (
              <div className="mt-3 space-y-3">
                {customer.addresses.map((address) => (
                  <div
                    key={address.id}
                    className="rounded-2xl border border-brand-border p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-brand-foreground">
                        {address.label || "Endereço"}
                      </p>

                      {address.is_default && (
                        <span className="rounded-full bg-brand-primary/10 px-2.5 py-1 text-[11px] font-bold text-brand-primary">
                          Principal
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-sm leading-6 text-brand-muted-foreground">
                      {address.street}, {address.number}

                      {address.complement
                        ? ` - ${address.complement}`
                        : ""}

                      <br />

                      {address.neighborhood} - {address.city}

                      {address.reference && (
                        <>
                          <br />
                          Referência: {address.reference}
                        </>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-dashed border-brand-border p-5 text-sm text-brand-muted-foreground">
                Nenhum endereço cadastrado.
              </div>
            )}
          </section>

          {/* HISTÓRICO */}
          <section>
            <div className="flex items-center gap-2">
              <Clock3 size={18} className="text-brand-primary" />

              <h3 className="font-bold text-brand-foreground">
                Histórico de pedidos
              </h3>
            </div>

            {orders.length > 0 ? (
              <div className="mt-3 overflow-hidden rounded-2xl border border-brand-border">
                <div className="divide-y divide-brand-border">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold text-brand-foreground">
                            Pedido #{order.order_number}
                          </p>

                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                              statusClasses[order.status] ??
                              "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {statusLabels[order.status] ??
                              order.status}
                          </span>
                        </div>

                        <p className="mt-2 text-xs text-brand-muted-foreground">
                          {order.order_type === "delivery"
                            ? "Entrega"
                            : "Retirada"}{" "}
                          • {formatDate(order.created_at)}
                        </p>
                      </div>

                      <div className="sm:text-right">
                        <p className="text-xs text-brand-muted-foreground">
                          Total
                        </p>

                        <p className="mt-1 font-bold text-brand-primary">
                          {formatCurrency(Number(order.total))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-dashed border-brand-border p-5 text-sm text-brand-muted-foreground">
                Este cliente ainda não possui pedidos.
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}