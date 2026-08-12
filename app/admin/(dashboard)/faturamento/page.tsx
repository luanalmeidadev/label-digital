import {
  BadgeDollarSign,
  CalendarDays,
  CircleDollarSign,
  ReceiptText,
} from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

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

export default async function FaturamentoPage() {
  const supabase = await createSupabaseServerClient();

  const { data: orders, error } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      total,
      created_at,
      completed_at,
      customers (
        id,
        first_name,
        last_name
      )
    `)
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar faturamento:", error);

    throw new Error(
      "Não foi possível carregar os dados de faturamento."
    );
  }

  const completedOrders = orders ?? [];

  const now = new Date();

  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  const todayOrders = completedOrders.filter(
  (order) =>
    order.completed_at &&
    new Date(order.completed_at) >= todayStart
);

const monthOrders = completedOrders.filter(
  (order) =>
    order.completed_at &&
    new Date(order.completed_at) >= monthStart
);

  const todayRevenue = todayOrders.reduce(
    (sum, order) => sum + Number(order.total),
    0
  );

  const monthRevenue = monthOrders.reduce(
    (sum, order) => sum + Number(order.total),
    0
  );

  const totalRevenue = completedOrders.reduce(
    (sum, order) => sum + Number(order.total),
    0
  );

  const averageTicket =
    completedOrders.length > 0
      ? totalRevenue / completedOrders.length
      : 0;

  return (
    <main className="p-5 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8B0000]">
            Financeiro
          </p>

          <h1 className="mt-2 text-3xl font-bold text-[#241B19]">
            Faturamento
          </h1>

          <p className="mt-2 text-sm text-[#756A66]">
            Acompanhe somente os pedidos realmente finalizados.
          </p>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-[#EEE6DF] bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700">
              <CircleDollarSign size={20} />
            </div>

            <p className="mt-5 text-sm text-[#756A66]">
              Faturamento hoje
            </p>

            <p className="mt-1 text-2xl font-bold text-[#241B19]">
              {formatCurrency(todayRevenue)}
            </p>
          </article>

          <article className="rounded-2xl border border-[#EEE6DF] bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <CalendarDays size={20} />
            </div>

            <p className="mt-5 text-sm text-[#756A66]">
              Faturamento do mês
            </p>

            <p className="mt-1 text-2xl font-bold text-[#241B19]">
              {formatCurrency(monthRevenue)}
            </p>
          </article>

          <article className="rounded-2xl border border-[#EEE6DF] bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8B0000]/10 text-[#8B0000]">
              <BadgeDollarSign size={20} />
            </div>

            <p className="mt-5 text-sm text-[#756A66]">
              Faturamento total
            </p>

            <p className="mt-1 text-2xl font-bold text-[#241B19]">
              {formatCurrency(totalRevenue)}
            </p>
          </article>

          <article className="rounded-2xl border border-[#EEE6DF] bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <ReceiptText size={20} />
            </div>

            <p className="mt-5 text-sm text-[#756A66]">
              Ticket médio
            </p>

            <p className="mt-1 text-2xl font-bold text-[#241B19]">
              {formatCurrency(averageTicket)}
            </p>
          </article>
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl border border-[#EEE6DF] bg-white shadow-sm">
          <div className="border-b border-[#EEE6DF] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B0000]/10 text-[#8B0000]">
                <ReceiptText size={20} />
              </div>

              <div>
                <h2 className="font-bold text-[#241B19]">
                  Vendas finalizadas
                </h2>

                <p className="text-xs text-[#756A66]">
                  {completedOrders.length} venda(s)
                </p>
              </div>
            </div>
          </div>

          {completedOrders.length > 0 ? (
            <div className="divide-y divide-[#EEE6DF]">
              {completedOrders.map((order) => {
                const customer = Array.isArray(
                  order.customers
                )
                  ? order.customers[0]
                  : order.customers;

                return (
                  <article
                    key={order.id}
                    className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-bold text-[#241B19]">
                        Pedido #{order.order_number}
                      </p>

                      <p className="mt-1 text-sm text-[#756A66]">
                        {customer
                          ? `${customer.first_name} ${customer.last_name}`
                          : "Cliente não identificado"}
                      </p>

                      <p className="mt-1 text-xs text-[#756A66]">
                        {order.completed_at
                          ? formatDate(order.completed_at)
                          : "Data de finalização não registrada"}
                      </p>
                    </div>

                    <div className="sm:text-right">
                      <p className="text-xs text-[#756A66]">
                        Valor finalizado
                      </p>

                      <p className="mt-1 text-lg font-bold text-[#8B0000]">
                        {formatCurrency(Number(order.total))}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#8B0000]/10 text-[#8B0000]">
                <ReceiptText size={28} />
              </div>

              <h3 className="mt-5 text-xl font-bold text-[#241B19]">
                Nenhuma venda finalizada
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#756A66]">
                Os pedidos só aparecerão aqui depois de
                serem marcados como finalizados.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}