import Link from "next/link";

import {
  CheckCircle2,
  Clock3,
  PackageCheck,
  Printer,
  ShoppingBag,
  XCircle,
} from "lucide-react";

import OrderDetailsDialog from "@/components/admin/OrderDetailsDialog";
import OrdersPanelTabs from "@/components/admin/OrdersPanelTabs";
import OrdersRealtime from "@/components/admin/OrdersRealtime";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { updateOrderStatus } from "./actions";

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

  confirmed:
    "bg-blue-100 text-blue-700",

  out_for_delivery:
    "bg-orange-100 text-orange-700",

  ready_for_pickup:
    "bg-amber-100 text-amber-700",

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

function formatDate(value: string) {
  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "short",
      timeStyle: "short",
    }
  ).format(new Date(value));
}

export default async function PedidosPage() {
  const supabase =
    await createSupabaseServerClient();

  const { data: orders, error } =
    await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        order_type,
        status,
        subtotal,
        delivery_fee,
        total,
        notes,
        created_at,

        customers (
          id,
          first_name,
          last_name,
          phone
        ),

        addresses (
          id,
          street,
          number,
          complement,
          neighborhood,
          city,
          reference
        ),

        order_items (
          id,
          product_name,
          quantity,
          unit_price
        )
      `)
      .order("created_at", {
        ascending: false,
      });

  if (error) {
    console.error(
      "Erro ao carregar pedidos:",
      error
    );

    throw new Error(
      "Não foi possível carregar os pedidos."
    );
  }

  const completedOrders =
    orders?.filter(
      (order) =>
        order.status === "completed"
    ) ?? [];

  const completedRevenue =
    completedOrders.reduce(
      (sum, order) =>
        sum + Number(order.total),
      0
    );

  const openOrders =
    orders?.filter(
      (order) =>
        order.status !== "completed" &&
        order.status !== "cancelled"
    ) ?? [];

  const cancelledOrders =
    orders?.filter(
      (order) =>
        order.status === "cancelled"
    ) ?? [];

  return (
    <main className="p-5 sm:p-8">
      <OrdersRealtime />

      <div className="mx-auto max-w-7xl">
        {/* CABEÇALHO */}
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8B0000]">
            Operação
          </p>

          <h1 className="mt-2 text-3xl font-bold text-[#241B19]">
            Pedidos
          </h1>

          <p className="mt-2 text-sm text-[#756A66]">
            Acompanhe os pedidos enviados
            pelo cardápio e gerencie cada
            etapa do atendimento.
          </p>
        </div>

        <OrdersPanelTabs active="daily" />

        {/* INDICADORES */}
        <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <article className="min-w-0 rounded-2xl border border-[#EEE6DF] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8B0000]/10 text-[#8B0000]">
              <ShoppingBag size={20} />
            </div>

            <p className="mt-4 text-xs leading-4 text-[#756A66] sm:mt-5 sm:text-sm">
              Total de pedidos
            </p>

            <p className="mt-1 break-words text-xl font-bold text-[#241B19] sm:text-2xl">
              {orders?.length ?? 0}
            </p>
          </article>

          <article className="min-w-0 rounded-2xl border border-[#EEE6DF] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Clock3 size={20} />
            </div>

            <p className="mt-4 text-xs leading-4 text-[#756A66] sm:mt-5 sm:text-sm">
              Em andamento
            </p>

            <p className="mt-1 break-words text-xl font-bold text-[#241B19] sm:text-2xl">
              {openOrders.length}
            </p>
          </article>

          <article className="min-w-0 rounded-2xl border border-[#EEE6DF] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700">
              <CheckCircle2 size={20} />
            </div>

            <p className="mt-4 text-xs leading-4 text-[#756A66] sm:mt-5 sm:text-sm">
              Finalizados
            </p>

            <p className="mt-1 break-words text-xl font-bold text-[#241B19] sm:text-2xl">
              {completedOrders.length}
            </p>
          </article>

          <article className="min-w-0 rounded-2xl border border-[#EEE6DF] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700">
              <PackageCheck size={20} />
            </div>

            <p className="mt-4 text-xs leading-4 text-[#756A66] sm:mt-5 sm:text-sm">
              Faturamento realizado
            </p>

            <p className="mt-1 break-words text-xl font-bold text-[#241B19] sm:text-2xl">
              {formatCurrency(
                completedRevenue
              )}
            </p>

            <p className="mt-2 text-xs text-[#756A66]">
              Somente pedidos finalizados.
            </p>
          </article>
        </section>

        {/* PEDIDOS */}
        <section className="mt-8 overflow-hidden rounded-3xl border border-[#EEE6DF] bg-white shadow-sm">
          <div className="border-b border-[#EEE6DF] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B0000]/10 text-[#8B0000]">
                <ShoppingBag size={20} />
              </div>

              <div>
                <h2 className="font-bold text-[#241B19]">
                  Pedidos cadastrados
                </h2>

                <p className="text-xs text-[#756A66]">
                  {orders?.length ?? 0}{" "}
                  pedido(s)
                </p>
              </div>
            </div>
          </div>

          {orders &&
          orders.length > 0 ? (
            <div className="divide-y divide-[#EEE6DF]">
              {orders.map((order) => {
                const customer =
                  Array.isArray(
                    order.customers
                  )
                    ? order.customers[0]
                    : order.customers;

                const address =
                  Array.isArray(
                    order.addresses
                  )
                    ? order.addresses[0]
                    : order.addresses;

                const items =
                  order.order_items ?? [];

                const canPrint = [
                  "confirmed",
                  "ready_for_pickup",
                  "out_for_delivery",
                  "completed",
                ].includes(order.status);

                return (
                  <article
                    key={order.id}
                    className="flex flex-col gap-4 p-5 xl:flex-row xl:items-center xl:justify-between"
                  >
                    {/* DADOS */}
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-bold text-[#241B19]">
                          Pedido #
                          {
                            order.order_number
                          }
                        </h3>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            statusClasses[
                              order.status
                            ] ??
                            "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {statusLabels[
                            order.status
                          ] ??
                            order.status}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-[#756A66]">
                        {customer
                          ? `${customer.first_name} ${customer.last_name}`
                          : "Cliente não identificado"}
                      </p>

                      <p className="mt-1 text-xs text-[#756A66]">
                        {order.order_type ===
                        "delivery"
                          ? "Entrega"
                          : "Retirada"}{" "}
                        •{" "}
                        {formatDate(
                          order.created_at
                        )}
                      </p>
                    </div>

                    {/* TOTAL + AÇÕES */}
                    <div className="flex flex-col gap-3 xl:items-end">
                      <div className="text-left xl:text-right">
                        <p className="text-xs text-[#756A66]">
                          Total
                        </p>

                        <p className="text-lg font-bold text-[#8B0000]">
                          {formatCurrency(
                            Number(
                              order.total
                            )
                          )}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <OrderDetailsDialog
                          order={{
                            id: order.id,

                            order_number:
                              order.order_number,

                            status:
                              order.status,

                            order_type:
                              order.order_type,

                            subtotal:
                              Number(
                                order.subtotal
                              ),

                            delivery_fee:
                              Number(
                                order.delivery_fee
                              ),

                            total:
                              Number(
                                order.total
                              ),

                            notes:
                              order.notes,

                            created_at:
                              order.created_at,

                            customer:
                              customer
                                ? {
                                    first_name:
                                      customer.first_name,

                                    last_name:
                                      customer.last_name,

                                    phone:
                                      customer.phone,
                                  }
                                : null,

                            address:
                              address
                                ? {
                                    street:
                                      address.street,

                                    number:
                                      address.number,

                                    complement:
                                      address.complement,

                                    neighborhood:
                                      address.neighborhood,

                                    city:
                                      address.city,

                                    reference:
                                      address.reference,
                                  }
                                : null,

                            items:
                              items.map(
                                (item) => ({
                                  id: item.id,

                                  product_name:
                                    item.product_name,

                                  quantity:
                                    item.quantity,

                                  unit_price:
                                    Number(
                                      item.unit_price
                                    ),
                                })
                              ),
                          }}
                          updateStatusAction={
                            updateOrderStatus
                          }
                        />

                        {canPrint && (
                          <Link
                            href={`/admin/pedidos/${order.id}/imprimir`}
                            target="_blank"
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#8B0000] px-4 text-sm font-bold text-[#8B0000] transition hover:bg-[#8B0000] hover:text-white"
                          >
                            <Printer size={16} />
                            Imprimir
                          </Link>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#8B0000]/10 text-[#8B0000]">
                <ShoppingBag size={28} />
              </div>

              <h3 className="mt-5 text-xl font-bold text-[#241B19]">
                Nenhum pedido ainda
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#756A66]">
                Quando os clientes começarem
                a enviar pedidos pelo
                cardápio digital, eles
                aparecerão aqui.
              </p>
            </div>
          )}
        </section>

        {/* CANCELADOS */}
        {cancelledOrders.length >
          0 && (
          <section className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <XCircle
                size={20}
                className="mt-0.5 text-red-600"
              />

              <div>
                <p className="font-bold text-red-700">
                  Pedidos cancelados
                </p>

                <p className="mt-1 text-sm text-red-600">
                  {
                    cancelledOrders.length
                  }{" "}
                  pedido(s) cancelado(s) não
                  entram no faturamento.
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
