import Link from "next/link";

import {
  BadgeDollarSign,
  CalendarDays,
  CircleDollarSign,
  ReceiptText,
} from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type SearchParams = Promise<{
  period?: string;
  from?: string;
  to?: string;
}>;

const periodLabels: Record<string, string> = {
  today: "Hoje",
  "7d": "7 dias",
  "30d": "30 dias",
  month: "Este mês",
  all: "Todos",
  custom: "Personalizado",
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

function startOfToday() {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
}

function getPeriodStart(period: string) {
  const now = new Date();

  if (period === "today") {
    return startOfToday();
  }

  if (period === "7d") {
    const start = new Date(now);

    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    return start;
  }

  if (period === "30d") {
    const start = new Date(now);

    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);

    return start;
  }

  if (period === "month") {
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );
  }

  return null;
}

function parseDateInput(value?: string) {
  if (!value) {
    return null;
  }

  const [year, month, day] = value
    .split("-")
    .map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(
    year,
    month - 1,
    day
  );
}

export default async function FaturamentoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const selectedPeriod =
    params.period &&
    Object.keys(periodLabels).includes(params.period)
      ? params.period
      : "today";

  const customFrom = parseDateInput(params.from);
  const customTo = parseDateInput(params.to);

  if (customFrom) {
    customFrom.setHours(0, 0, 0, 0);
  }

  if (customTo) {
    customTo.setHours(23, 59, 59, 999);
  }

  const customRangeInvalid =
    selectedPeriod === "custom" &&
    customFrom &&
    customTo &&
    customFrom > customTo;

  const supabase =
    await createSupabaseServerClient();

  const { data: orders, error } =
    await supabase
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
      .not("completed_at", "is", null)
      .order("completed_at", {
        ascending: false,
      });

  if (error) {
    console.error(
      "Erro ao carregar faturamento:",
      error
    );

    throw new Error(
      "Não foi possível carregar os dados de faturamento."
    );
  }

  const completedOrders = orders ?? [];

  const totalRevenue =
    completedOrders.reduce(
      (sum, order) =>
        sum + Number(order.total),
      0
    );

  const todayStart = startOfToday();

  const todayOrders =
    completedOrders.filter(
      (order) =>
        order.completed_at &&
        new Date(order.completed_at) >=
          todayStart
    );

  const todayRevenue =
    todayOrders.reduce(
      (sum, order) =>
        sum + Number(order.total),
      0
    );

  let filteredOrders = completedOrders;

  if (selectedPeriod === "custom") {
    if (
      customFrom &&
      customTo &&
      !customRangeInvalid
    ) {
      filteredOrders =
        completedOrders.filter(
          (order) => {
            if (!order.completed_at) {
              return false;
            }

            const completedAt =
              new Date(
                order.completed_at
              );

            return (
              completedAt >= customFrom &&
              completedAt <= customTo
            );
          }
        );
    } else {
      filteredOrders = [];
    }
  } else {
    const periodStart =
      getPeriodStart(selectedPeriod);

    if (periodStart) {
      filteredOrders =
        completedOrders.filter(
          (order) =>
            order.completed_at &&
            new Date(
              order.completed_at
            ) >= periodStart
        );
    }
  }

  const filteredRevenue =
    filteredOrders.reduce(
      (sum, order) =>
        sum + Number(order.total),
      0
    );

  const averageTicket =
    filteredOrders.length > 0
      ? filteredRevenue /
        filteredOrders.length
      : 0;

  const periodDescription =
    selectedPeriod === "custom" &&
    params.from &&
    params.to
      ? `${params.from
          .split("-")
          .reverse()
          .join("/")} até ${params.to
          .split("-")
          .reverse()
          .join("/")}`
      : periodLabels[selectedPeriod];

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
            Acompanhe somente os pedidos
            realmente finalizados.
          </p>
        </div>

        <section className="mt-7">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#756A66]">
            Período
          </p>

          <div className="flex flex-wrap gap-2">
            {Object.entries(periodLabels).map(
              ([period, label]) => {
                  const active =
                    selectedPeriod ===
                    period;

                  return (
                    <Link
                      key={period}
                      href={`/admin/faturamento?period=${period}`}
                      className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                        active
                          ? "bg-[#8B0000] text-white"
                          : "border border-[#EEE6DF] bg-white text-[#756A66] hover:border-[#D2B48C] hover:text-[#8B0000]"
                      }`}
                    >
                      {label}
                    </Link>
                  );
                }
              )}
          </div>

          {selectedPeriod === "custom" && (
          <form
            method="GET"
            className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#EEE6DF] bg-white p-4 sm:flex-row sm:items-end"
          >
            <input
              type="hidden"
              name="period"
              value="custom"
            />

            <div className="flex-1">
              <label
                htmlFor="from"
                className="text-xs font-bold uppercase tracking-[0.12em] text-[#756A66]"
              >
                Data inicial
              </label>

              <input
                id="from"
                name="from"
                type="date"
                defaultValue={params.from ?? ""}
                required
                className="mt-2 h-11 w-full rounded-xl border border-[#DDD3CB] bg-white px-3 text-sm outline-none transition focus:border-[#8B0000]"
              />
            </div>

            <div className="flex-1">
              <label
                htmlFor="to"
                className="text-xs font-bold uppercase tracking-[0.12em] text-[#756A66]"
              >
                Data final
              </label>

              <input
                id="to"
                name="to"
                type="date"
                defaultValue={params.to ?? ""}
                required
                className="mt-2 h-11 w-full rounded-xl border border-[#DDD3CB] bg-white px-3 text-sm outline-none transition focus:border-[#8B0000]"
              />
            </div>

            <button
              type="submit"
              className="h-11 rounded-xl bg-[#8B0000] px-5 text-sm font-bold text-white transition hover:bg-[#700000]"
            >
              Aplicar período
            </button>
          </form>
        )}

          {customRangeInvalid && (
            <div className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-600">
              A data final não pode ser
              anterior à data inicial.
            </div>
          )}
        </section>

        <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <article className="min-w-0 rounded-2xl border border-[#EEE6DF] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700">
              <CircleDollarSign
                size={20}
              />
            </div>

            <p className="mt-4 text-xs leading-4 text-[#756A66] sm:mt-5 sm:text-sm">
              Faturamento hoje
            </p>

            <p className="mt-1 break-words text-xl font-bold text-[#241B19] sm:text-2xl">
              {formatCurrency(
                todayRevenue
              )}
            </p>
          </article>

          <article className="min-w-0 rounded-2xl border border-[#EEE6DF] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <CalendarDays
                size={20}
              />
            </div>

            <p className="mt-4 text-xs leading-4 text-[#756A66] sm:mt-5 sm:text-sm">
              Faturamento do período
            </p>

            <p className="mt-1 break-words text-xl font-bold text-[#241B19] sm:text-2xl">
              {formatCurrency(
                filteredRevenue
              )}
            </p>

            <p className="mt-2 text-xs text-[#756A66]">
              {periodDescription}
            </p>
          </article>

          <article className="min-w-0 rounded-2xl border border-[#EEE6DF] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8B0000]/10 text-[#8B0000]">
              <BadgeDollarSign
                size={20}
              />
            </div>

            <p className="mt-4 text-xs leading-4 text-[#756A66] sm:mt-5 sm:text-sm">
              Faturamento total
            </p>

            <p className="mt-1 break-words text-xl font-bold text-[#241B19] sm:text-2xl">
              {formatCurrency(
                totalRevenue
              )}
            </p>

            <p className="mt-2 text-xs text-[#756A66]">
              Acumulado geral
            </p>
          </article>

          <article className="min-w-0 rounded-2xl border border-[#EEE6DF] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <ReceiptText size={20} />
            </div>

            <p className="mt-4 text-xs leading-4 text-[#756A66] sm:mt-5 sm:text-sm">
              Ticket médio
            </p>

            <p className="mt-1 break-words text-xl font-bold text-[#241B19] sm:text-2xl">
              {formatCurrency(
                averageTicket
              )}
            </p>

            <p className="mt-2 text-xs text-[#756A66]">
              {filteredOrders.length}{" "}
              venda(s) no período
            </p>
          </article>
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl border border-[#EEE6DF] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#EEE6DF] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B0000]/10 text-[#8B0000]">
                <ReceiptText size={20} />
              </div>

              <div>
                <h2 className="font-bold text-[#241B19]">
                  Vendas finalizadas
                </h2>

                <p className="text-xs text-[#756A66]">
                  {filteredOrders.length}{" "}
                  venda(s)
                </p>
              </div>
            </div>

            <span className="w-fit rounded-full bg-[#FFF7F5] px-3 py-1.5 text-xs font-bold text-[#8B0000]">
              {periodDescription}
            </span>
          </div>

          {filteredOrders.length >
          0 ? (
            <div className="divide-y divide-[#EEE6DF]">
              {filteredOrders.map(
                (order) => {
                  const customer =
                    Array.isArray(
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
                          Pedido #
                          {
                            order.order_number
                          }
                        </p>

                        <p className="mt-1 text-sm text-[#756A66]">
                          {customer
                            ? `${customer.first_name} ${customer.last_name}`
                            : "Cliente não identificado"}
                        </p>

                        <p className="mt-1 text-xs text-[#756A66]">
                          Finalizado em{" "}
                          {order.completed_at
                            ? formatDate(
                                order.completed_at
                              )
                            : "data não registrada"}
                        </p>
                      </div>

                      <div className="sm:text-right">
                        <p className="text-xs text-[#756A66]">
                          Valor finalizado
                        </p>

                        <p className="mt-1 text-lg font-bold text-[#8B0000]">
                          {formatCurrency(
                            Number(
                              order.total
                            )
                          )}
                        </p>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          ) : (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#8B0000]/10 text-[#8B0000]">
                <ReceiptText
                  size={28}
                />
              </div>

              <h3 className="mt-5 text-xl font-bold text-[#241B19]">
                Nenhuma venda neste
                período
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#756A66]">
                Não existem pedidos
                finalizados dentro do período
                selecionado.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}