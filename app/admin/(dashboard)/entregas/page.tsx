import {
  CheckCircle2,
  Clock3,
  MapPin,
  Phone,
  Truck,
} from "lucide-react";

import DeliveryDetailsDialog from "@/components/admin/DeliveryDetailsDialog";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { updateOrderStatus } from "../pedidos/actions";

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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function EntregasPage() {
  const supabase =
    await createSupabaseServerClient();

  const { data: deliveries, error } =
    await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        status,
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
        )
      `)
      .eq("order_type", "delivery")
      .order("created_at", {
        ascending: false,
      });

  if (error) {
    console.error(
      "Erro ao carregar entregas:",
      error
    );

    throw new Error(
      "Não foi possível carregar as entregas."
    );
  }

  const totalDeliveries =
    deliveries?.length ?? 0;

  const waitingDeliveries =
    deliveries?.filter(
      (delivery) =>
        delivery.status === "confirmed"
    ).length ?? 0;

  const onRouteDeliveries =
    deliveries?.filter(
      (delivery) =>
        delivery.status ===
        "out_for_delivery"
    ).length ?? 0;

  const completedDeliveries =
    deliveries?.filter(
      (delivery) =>
        delivery.status === "completed"
    ).length ?? 0;

  return (
    <main className="p-5 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8B0000]">
            Logística
          </p>

          <h1 className="mt-2 text-3xl font-bold text-[#241B19]">
            Entregas
          </h1>

          <p className="mt-2 text-sm text-[#756A66]">
            Acompanhe e gerencie os pedidos que serão
            entregues no endereço dos clientes.
          </p>
        </div>

        <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <article className="min-w-0 rounded-2xl border border-[#EEE6DF] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8B0000]/10 text-[#8B0000]">
              <Truck size={20} />
            </div>

           <p className="mt-4 text-xs leading-4 text-[#756A66] sm:mt-5 sm:text-sm"> 
              Entregas
            </p>

            <p className="mt-1 text-xl font-bold text-[#241B19] sm:text-2xl">
              {totalDeliveries}
            </p>
          </article>

          <article className="min-w-0 rounded-2xl border border-[#EEE6DF] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Clock3 size={20} />
            </div>

            <p className="mt-4 text-xs leading-4 text-[#756A66] sm:mt-5 sm:text-sm">
              Aguardando saída
            </p>

            <p className="mt-1 text-xl font-bold text-[#241B19] sm:text-2xl">
              {waitingDeliveries}
            </p>
          </article>

          <article className="min-w-0 rounded-2xl border border-[#EEE6DF] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
              <Truck size={20} />
            </div>

            <p className="mt-4 text-xs leading-4 text-[#756A66] sm:mt-5 sm:text-sm">
              Em rota
            </p>

            <p className="mt-1 text-xl font-bold text-[#241B19] sm:text-2xl">
              {onRouteDeliveries}
            </p>
          </article>

          <article className="min-w-0 rounded-2xl border border-[#EEE6DF] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700">
              <CheckCircle2 size={20} />
            </div>

            <p className="mt-4 text-xs leading-4 text-[#756A66] sm:mt-5 sm:text-sm">
              Concluídas
            </p>

            <p className="mt-1 text-xl font-bold text-[#241B19] sm:text-2xl">
              {completedDeliveries}
            </p>
          </article>
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl border border-[#EEE6DF] bg-white shadow-sm">
          <div className="border-b border-[#EEE6DF] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B0000]/10 text-[#8B0000]">
                <Truck size={20} />
              </div>

              <div>
                <h2 className="font-bold text-[#241B19]">
                  Pedidos para entrega
                </h2>

                <p className="text-xs text-[#756A66]">
                  {totalDeliveries} entrega(s)
                </p>
              </div>
            </div>
          </div>

          {deliveries &&
          deliveries.length > 0 ? (
            <div className="divide-y divide-[#EEE6DF]">
              {deliveries.map(
                (delivery) => {
                  const customer =
                    Array.isArray(
                      delivery.customers
                    )
                      ? delivery.customers[0]
                      : delivery.customers;

                  const address =
                    Array.isArray(
                      delivery.addresses
                    )
                      ? delivery.addresses[0]
                      : delivery.addresses;

                  return (
                    <article
                      key={delivery.id}
                      className="flex flex-col gap-5 p-5 xl:flex-row xl:items-center xl:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="font-bold text-[#241B19]">
                            Pedido #
                            {
                              delivery.order_number
                            }
                          </h3>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              statusClasses[
                                delivery.status
                              ] ??
                              "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {statusLabels[
                              delivery.status
                            ] ??
                              delivery.status}
                          </span>
                        </div>

                        <p className="mt-3 font-bold text-[#241B19]">
                          {customer
                            ? `${customer.first_name} ${customer.last_name}`
                            : "Cliente não identificado"}
                        </p>

                        {customer && (
                          <div className="mt-1 flex items-center gap-2 text-sm text-[#756A66]">
                            <Phone
                              size={14}
                            />

                            {
                              customer.phone
                            }
                          </div>
                        )}

                        {address ? (
                          <div className="mt-4 flex items-start gap-2 text-sm leading-6 text-[#756A66]">
                            <MapPin
                              size={15}
                              className="mt-1 shrink-0"
                            />

                            <p>
                              {
                                address.street
                              }
                              ,{" "}
                              {
                                address.number
                              }

                              {address.complement
                                ? ` - ${address.complement}`
                                : ""}

                              <br />

                              {
                                address.neighborhood
                              }{" "}
                              -{" "}
                              {
                                address.city
                              }

                              {address.reference && (
                                <>
                                  <br />
                                  Referência:{" "}
                                  {
                                    address.reference
                                  }
                                </>
                              )}
                            </p>
                          </div>
                        ) : (
                          <p className="mt-4 text-sm font-semibold text-red-600">
                            Endereço não
                            encontrado.
                          </p>
                        )}

                        <p className="mt-3 text-xs text-[#756A66]">
                          Criado em{" "}
                          {formatDate(
                            delivery.created_at
                          )}
                        </p>
                      </div>

                      <div className="flex flex-col gap-4 xl:items-end">
                        <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[320px]">
                          <div className="rounded-xl bg-[#FFF7F5] p-4">
                            <p className="text-xs text-[#756A66]">
                              Taxa de
                              entrega
                            </p>

                            <p className="mt-1 font-bold text-[#241B19]">
                              {formatCurrency(
                                Number(
                                  delivery.delivery_fee
                                )
                              )}
                            </p>
                          </div>

                          <div className="rounded-xl bg-[#FFF7F5] p-4">
                            <p className="text-xs text-[#756A66]">
                              Total do
                              pedido
                            </p>

                            <p className="mt-1 font-bold text-[#8B0000]">
                              {formatCurrency(
                                Number(
                                  delivery.total
                                )
                              )}
                            </p>
                          </div>
                        </div>

                        <DeliveryDetailsDialog
                          delivery={{
                            id: delivery.id,

                            order_number:
                              delivery.order_number,

                            status:
                              delivery.status,

                            delivery_fee:
                              Number(
                                delivery.delivery_fee
                              ),

                            total:
                              Number(
                                delivery.total
                              ),

                            notes:
                              delivery.notes,

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
                          }}
                          updateStatusAction={
                            updateOrderStatus
                          }
                        />
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          ) : (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#8B0000]/10 text-[#8B0000]">
                <Truck size={28} />
              </div>

              <h3 className="mt-5 text-xl font-bold text-[#241B19]">
                Nenhuma entrega ainda
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#756A66]">
                Pedidos escolhidos para
                retirada não aparecem aqui.
                Somente entregas são listadas
                nesta área.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}