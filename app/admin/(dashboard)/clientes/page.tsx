import {
  MapPin,
  Phone,
  ShoppingBag,
  UserRound,
} from "lucide-react";

import CustomerDetailsDialog from "@/components/admin/CustomerDetailsDialog";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "Nenhum pedido";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function ClientesPage() {
  const supabase = await createSupabaseServerClient();

  const { data: customers, error } = await supabase
    .from("customers")
    .select(`
      id,
      first_name,
      last_name,
      phone,
      created_at,

      addresses (
        id,
        label,
        street,
        number,
        complement,
        neighborhood,
        city,
        reference,
        is_default
      ),

      orders (
        id,
        order_number,
        order_type,
        status,
        total,
        created_at
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar clientes:", error);

    throw new Error(
      "Não foi possível carregar os clientes."
    );
  }

  const customerStats =
    customers?.map((customer) => {
      const orders = customer.orders ?? [];

      const completedOrders = orders.filter(
        (order) => order.status === "completed"
      );

      const totalSpent = completedOrders.reduce(
        (sum, order) => sum + Number(order.total),
        0
      );

      const lastOrder =
        [...orders].sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        )[0] ?? null;

      return {
        ...customer,
        ordersCount: orders.length,
        completedOrdersCount: completedOrders.length,
        totalSpent,
        lastOrderAt: lastOrder?.created_at ?? null,
      };
    }) ?? [];

  const totalCustomers = customerStats.length;

  const customersWithOrders = customerStats.filter(
    (customer) => customer.ordersCount > 0
  ).length;

  const completedRevenueFromCustomers =
    customerStats.reduce(
      (sum, customer) => sum + customer.totalSpent,
      0
    );

  return (
    <main className="p-5 sm:p-8">
      <div className="mx-auto max-w-7xl">
        {/* CABEÇALHO */}
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8B0000]">
            Relacionamento
          </p>

          <h1 className="mt-2 text-3xl font-bold text-[#241B19]">
            Clientes
          </h1>

          <p className="mt-2 text-sm text-[#756A66]">
            Consulte os clientes, pedidos e endereços
            cadastrados na La&apos;bel.
          </p>
        </div>

        {/* CARDS */}
       <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
          {/* CLIENTES CADASTRADOS */}
          <article className="min-w-0 rounded-2xl border border-[#EEE6DF] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8B0000]/10 text-[#8B0000]">
              <UserRound size={20} />
            </div>

            <p className="mt-5 text-sm text-[#756A66]">
              Clientes cadastrados
            </p>

            <p className="mt-1 text-2xl font-bold text-[#241B19]">
              {totalCustomers}
            </p>
          </article>

          {/* CLIENTES COM PEDIDOS */}
          <article className="min-w-0 rounded-2xl border border-[#EEE6DF] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <ShoppingBag size={20} />
            </div>

            <p className="mt-5 text-sm text-[#756A66]">
              Clientes com pedidos
            </p>

            <p className="mt-1 text-2xl font-bold text-[#241B19]">
              {customersWithOrders}
            </p>
          </article>

          {/* FATURAMENTO */}
          <article className="col-span-2 rounded-2xl border border-[#EEE6DF] bg-white p-4 shadow-sm sm:p-5 xl:col-span-1">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700">
              <ShoppingBag size={20} />
            </div>

            <p className="mt-5 text-sm text-[#756A66]">
              Faturamento dos clientes
            </p>

            <p className="mt-1 text-2xl font-bold text-[#241B19]">
              {formatCurrency(
                completedRevenueFromCustomers
              )}
            </p>

            <p className="mt-2 text-xs text-[#756A66]">
              Apenas pedidos finalizados.
            </p>
          </article>
        </section>

        {/* LISTA DE CLIENTES */}
        <section className="mt-8 overflow-hidden rounded-3xl border border-[#EEE6DF] bg-white shadow-sm">
          {/* CABEÇALHO DA LISTA */}
          <div className="border-b border-[#EEE6DF] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B0000]/10 text-[#8B0000]">
                <UserRound size={20} />
              </div>

              <div>
                <h2 className="font-bold text-[#241B19]">
                  Clientes cadastrados
                </h2>

                <p className="text-xs text-[#756A66]">
                  {totalCustomers} cliente(s)
                </p>
              </div>
            </div>
          </div>

          {/* CLIENTES */}
          {customerStats.length > 0 ? (
            <div className="divide-y divide-[#EEE6DF]">
              {customerStats.map((customer) => {
                const addresses =
                  customer.addresses ?? [];

                const defaultAddress =
                  addresses.find(
                    (address) => address.is_default
                  ) ?? addresses[0];

                return (
                  <article
                    key={customer.id}
                    className="flex flex-col gap-5 p-5 xl:flex-row xl:items-center xl:justify-between"
                  >
                    {/* DADOS DO CLIENTE */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#8B0000]/10 text-[#8B0000]">
                          <UserRound size={19} />
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate font-bold text-[#241B19]">
                            {customer.first_name}{" "}
                            {customer.last_name}
                          </h3>

                          <div className="mt-1 flex items-center gap-2 text-sm text-[#756A66]">
                            <Phone size={14} />

                            {customer.phone}
                          </div>
                        </div>
                      </div>

                      {/* ENDEREÇO PRINCIPAL */}
                      {defaultAddress && (
                        <div className="mt-4 flex items-start gap-2 text-sm text-[#756A66]">
                          <MapPin
                            size={15}
                            className="mt-0.5 shrink-0"
                          />

                          <p>
                            {defaultAddress.street},{" "}
                            {defaultAddress.number}

                            {defaultAddress.complement
                              ? ` - ${defaultAddress.complement}`
                              : ""}

                            <br />

                            {defaultAddress.neighborhood} -{" "}
                            {defaultAddress.city}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* ESTATÍSTICAS + BOTÃO */}
                    <div className="flex flex-col gap-4 xl:items-end">
                      <div className="grid grid-cols-2 gap-3 xl:min-w-[520px] xl:grid-cols-3">
                        {/* PEDIDOS */}
                        <div className="rounded-xl bg-[#FFF7F5] p-4">
                          <p className="text-xs text-[#756A66]">
                            Pedidos
                          </p>

                          <p className="mt-1 font-bold text-[#241B19]">
                            {customer.ordersCount}
                          </p>
                        </div>

                        {/* TOTAL GASTO */}
                        <div className="rounded-xl bg-[#FFF7F5] p-4">
                          <p className="text-xs text-[#756A66]">
                            Total gasto
                          </p>

                          <p className="mt-1 font-bold text-[#8B0000]">
                            {formatCurrency(
                              customer.totalSpent
                            )}
                          </p>
                        </div>

                        {/* ÚLTIMO PEDIDO */}
                        <div className="col-span-2 rounded-xl bg-[#FFF7F5] p-4 xl:col-span-1">
                          <p className="text-xs text-[#756A66]">
                            Último pedido
                          </p>

                          <p className="mt-1 text-sm font-bold text-[#241B19]">
                            {formatDate(
                              customer.lastOrderAt
                            )}
                          </p>
                        </div>
                      </div>

                      {/* MODAL VER CLIENTE */}
                      <CustomerDetailsDialog
                        customer={{
                          first_name:
                            customer.first_name,

                          last_name:
                            customer.last_name,

                          phone:
                            customer.phone,

                          created_at:
                            customer.created_at,

                          addresses: (
                            customer.addresses ?? []
                          ).map((address) => ({
                            id: address.id,
                            label: address.label,
                            street: address.street,
                            number: address.number,
                            complement:
                              address.complement,
                            neighborhood:
                              address.neighborhood,
                            city: address.city,
                            reference:
                              address.reference,
                            is_default:
                              address.is_default,
                          })),

                          orders: (
                            customer.orders ?? []
                          ).map((order) => ({
                            id: order.id,
                            order_number:
                              order.order_number,
                            order_type:
                              order.order_type,
                            status: order.status,
                            total: Number(
                              order.total
                            ),
                            created_at:
                              order.created_at,
                          })),
                        }}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* ESTADO VAZIO */
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#8B0000]/10 text-[#8B0000]">
                <UserRound size={28} />
              </div>

              <h3 className="mt-5 text-xl font-bold text-[#241B19]">
                Nenhum cliente ainda
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#756A66]">
                Quando os primeiros clientes
                realizarem pedidos, eles aparecerão
                aqui.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}