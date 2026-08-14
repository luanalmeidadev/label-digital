import Link from "next/link";
import {
  BadgeDollarSign,
  CakeSlice,
  CalendarDays,
  CircleDollarSign,
  ReceiptText,
  ShoppingBag,
} from "lucide-react";

import { listPreorderRequests } from "@/lib/preorder-request-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SearchParams = Promise<{
  source?: string;
  period?: string;
  from?: string;
  to?: string;
}>;

type RevenueSale = {
  id: string;
  number: string;
  customerName: string;
  total: number;
  completedAt: string;
};

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
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getPeriodStart(period: string) {
  const now = new Date();

  if (period === "today") return startOfToday();

  if (period === "7d" || period === "30d") {
    const start = new Date(now);
    start.setDate(start.getDate() - (period === "7d" ? 6 : 29));
    start.setHours(0, 0, 0, 0);
    return start;
  }

  if (period === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return null;
}

function parseDateInput(value?: string) {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return null;

  return new Date(year, month - 1, day);
}

function revenueLink(source: string, period: string) {
  return `/admin/faturamento?${new URLSearchParams({ source, period }).toString()}`;
}

export default async function FaturamentoPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const selectedSource =
    params.source === "preorders" ? "preorders" : "daily";
  const selectedPeriod =
    params.period && Object.keys(periodLabels).includes(params.period)
      ? params.period
      : "today";
  const customFrom = parseDateInput(params.from);
  const customTo = parseDateInput(params.to);

  customFrom?.setHours(0, 0, 0, 0);
  customTo?.setHours(23, 59, 59, 999);

  const customRangeInvalid = Boolean(
    selectedPeriod === "custom" &&
      customFrom &&
      customTo &&
      customFrom > customTo
  );

  const supabase = await createSupabaseServerClient();
  const [{ data: orders, error }, preorderRequests] = await Promise.all([
    supabase
      .from("orders")
      .select(`
        id,
        order_number,
        total,
        completed_at,
        customers (
          first_name,
          last_name
        )
      `)
      .eq("status", "completed")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false }),
    listPreorderRequests(),
  ]);

  if (error) {
    console.error("Erro ao carregar faturamento diário:", error);
    throw new Error("Não foi possível carregar os dados de faturamento.");
  }

  const dailySales: RevenueSale[] = (orders ?? []).flatMap((order) => {
    if (!order.completed_at) return [];

    const customer = Array.isArray(order.customers)
      ? order.customers[0]
      : order.customers;

    return [
      {
        id: order.id,
        number: `Pedido #${order.order_number}`,
        customerName: customer
          ? `${customer.first_name} ${customer.last_name}`
          : "Cliente não identificado",
        total: Number(order.total),
        completedAt: order.completed_at,
      },
    ];
  });
  const preorderSales: RevenueSale[] = preorderRequests.flatMap((request) =>
    request.status === "completed" && request.completedAt
      ? [
          {
            id: request.id,
            number: request.requestNumber,
            customerName: request.customerName,
            total: request.total,
            completedAt: request.completedAt,
          },
        ]
      : []
  );
  const completedSales =
    selectedSource === "preorders" ? preorderSales : dailySales;
  const totalRevenue = completedSales.reduce(
    (sum, sale) => sum + sale.total,
    0
  );
  const todayStart = startOfToday();
  const todayRevenue = completedSales
    .filter((sale) => new Date(sale.completedAt) >= todayStart)
    .reduce((sum, sale) => sum + sale.total, 0);

  let filteredSales = completedSales;

  if (selectedPeriod === "custom") {
    filteredSales =
      customFrom && customTo && !customRangeInvalid
        ? completedSales.filter((sale) => {
            const completedAt = new Date(sale.completedAt);
            return completedAt >= customFrom && completedAt <= customTo;
          })
        : [];
  } else {
    const periodStart = getPeriodStart(selectedPeriod);

    if (periodStart) {
      filteredSales = completedSales.filter(
        (sale) => new Date(sale.completedAt) >= periodStart
      );
    }
  }

  const filteredRevenue = filteredSales.reduce(
    (sum, sale) => sum + sale.total,
    0
  );
  const averageTicket =
    filteredSales.length > 0
      ? filteredRevenue / filteredSales.length
      : 0;
  const periodDescription =
    selectedPeriod === "custom" && params.from && params.to
      ? `${params.from.split("-").reverse().join("/")} até ${params.to
          .split("-")
          .reverse()
          .join("/")}`
      : periodLabels[selectedPeriod];
  const sourceLabel =
    selectedSource === "preorders" ? "encomendas" : "vendas diárias";

  return (
    <main className="p-5 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8B0000]">
            Financeiro
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[#241B19]">Faturamento</h1>
          <p className="mt-2 text-sm text-[#756A66]">
            Vendas diárias e encomendas ficam separadas e entram no faturamento somente após a finalização.
          </p>
        </div>

        <nav aria-label="Origem do faturamento" className="mt-7 grid gap-3 sm:max-w-2xl sm:grid-cols-2">
          {[
            {
              id: "daily",
              label: "Vendas diárias",
              description: "Pedidos do cardápio diário",
              icon: ShoppingBag,
            },
            {
              id: "preorders",
              label: "Encomendas",
              description: "Pedidos para datas futuras",
              icon: CakeSlice,
            },
          ].map((source) => {
            const Icon = source.icon;
            const active = selectedSource === source.id;

            return (
              <Link
                key={source.id}
                href={revenueLink(source.id, selectedPeriod)}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-2xl border p-4 transition ${
                  active
                    ? "border-[#8B0000] bg-[#8B0000] text-white shadow-sm"
                    : "border-[#EEE6DF] bg-white text-[#241B19] hover:border-[#D2B48C]"
                }`}
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    active ? "bg-white/15 text-[#D2B48C]" : "bg-[#8B0000]/10 text-[#8B0000]"
                  }`}
                >
                  <Icon size={19} />
                </span>
                <span>
                  <span className="block text-sm font-bold">{source.label}</span>
                  <span className={`mt-0.5 block text-xs ${active ? "text-white/70" : "text-[#756A66]"}`}>
                    {source.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        <section className="mt-7">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#756A66]">Período</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(periodLabels).map(([period, label]) => {
              const active = selectedPeriod === period;
              return (
                <Link
                  key={period}
                  href={revenueLink(selectedSource, period)}
                  className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                    active
                      ? "bg-[#8B0000] text-white"
                      : "border border-[#EEE6DF] bg-white text-[#756A66] hover:border-[#D2B48C] hover:text-[#8B0000]"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          {selectedPeriod === "custom" && (
            <form method="GET" className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#EEE6DF] bg-white p-4 sm:flex-row sm:items-end">
              <input type="hidden" name="source" value={selectedSource} />
              <input type="hidden" name="period" value="custom" />
              {[
                { id: "from", label: "Data inicial", value: params.from },
                { id: "to", label: "Data final", value: params.to },
              ].map((field) => (
                <div key={field.id} className="flex-1">
                  <label htmlFor={field.id} className="text-xs font-bold uppercase tracking-[0.12em] text-[#756A66]">
                    {field.label}
                  </label>
                  <input
                    id={field.id}
                    name={field.id}
                    type="date"
                    defaultValue={field.value ?? ""}
                    required
                    className="mt-2 h-11 w-full rounded-xl border border-[#DDD3CB] bg-white px-3 text-sm outline-none focus:border-[#8B0000]"
                  />
                </div>
              ))}
              <button type="submit" className="h-11 rounded-xl bg-[#8B0000] px-5 text-sm font-bold text-white hover:bg-[#700000]">
                Aplicar período
              </button>
            </form>
          )}

          {customRangeInvalid && (
            <div className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-600">
              A data final não pode ser anterior à data inicial.
            </div>
          )}
        </section>

        <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {[
            {
              label: "Faturamento hoje",
              value: todayRevenue,
              note: sourceLabel,
              icon: CircleDollarSign,
              color: "bg-green-100 text-green-700",
            },
            {
              label: "Faturamento do período",
              value: filteredRevenue,
              note: periodDescription,
              icon: CalendarDays,
              color: "bg-blue-100 text-blue-700",
            },
            {
              label: "Faturamento total",
              value: totalRevenue,
              note: `Acumulado de ${sourceLabel}`,
              icon: BadgeDollarSign,
              color: "bg-[#8B0000]/10 text-[#8B0000]",
            },
            {
              label: "Ticket médio",
              value: averageTicket,
              note: `${filteredSales.length} venda(s) no período`,
              icon: ReceiptText,
              color: "bg-amber-100 text-amber-700",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.label} className="min-w-0 rounded-2xl border border-[#EEE6DF] bg-white p-4 shadow-sm sm:p-5">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.color}`}>
                  <Icon size={20} />
                </div>
                <p className="mt-4 text-xs text-[#756A66] sm:mt-5 sm:text-sm">{item.label}</p>
                <p className="mt-1 break-words text-xl font-bold text-[#241B19] sm:text-2xl">
                  {formatCurrency(item.value)}
                </p>
                <p className="mt-2 text-xs text-[#756A66]">{item.note}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl border border-[#EEE6DF] bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-[#EEE6DF] p-5">
            <div>
              <h2 className="font-bold text-[#241B19]">{selectedSource === "preorders" ? "Encomendas finalizadas" : "Vendas diárias finalizadas"}</h2>
              <p className="mt-1 text-xs text-[#756A66]">{filteredSales.length} venda(s)</p>
            </div>
            <span className="rounded-full bg-[#FFF7F5] px-3 py-1.5 text-xs font-bold text-[#8B0000]">{periodDescription}</span>
          </div>

          {filteredSales.length > 0 ? (
            <div className="divide-y divide-[#EEE6DF]">
              {filteredSales.map((sale) => (
                <article key={sale.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-bold text-[#241B19]">{sale.number}</p>
                    <p className="mt-1 text-sm text-[#756A66]">{sale.customerName}</p>
                    <p className="mt-1 text-xs text-[#756A66]">Finalizada em {formatDate(sale.completedAt)}</p>
                  </div>
                  <p className="text-lg font-bold text-[#8B0000]">{formatCurrency(sale.total)}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="px-6 py-16 text-center">
              <ReceiptText size={32} className="mx-auto text-[#D2B48C]" />
              <h3 className="mt-4 text-xl font-bold text-[#241B19]">Nenhuma venda neste período</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#756A66]">
                Não existem {sourceLabel} finalizadas dentro do período selecionado.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
