import Link from "next/link";
import {
  BarChart3,
  CircleDollarSign,
  PackageSearch,
  ReceiptText,
  TrendingDown,
  Trophy,
  Undo2,
} from "lucide-react";

import { requireAdminPagePermission } from "@/lib/admin-auth";

type SearchParams = Promise<{ period?: string }>;

const periodLabels = {
  today: "Hoje",
  "7d": "7 dias",
  "30d": "30 dias",
  month: "Este mês",
  all: "Todos",
} as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function periodStart(period: keyof typeof periodLabels) {
  const now = new Date();

  if (period === "all") return null;

  if (period === "today") {
    now.setHours(0, 0, 0, 0);
    return now;
  }

  if (period === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  now.setDate(now.getDate() - (period === "7d" ? 6 : 29));
  now.setHours(0, 0, 0, 0);
  return now;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const selectedPeriod =
    params.period && params.period in periodLabels
      ? (params.period as keyof typeof periodLabels)
      : "30d";
  const start = periodStart(selectedPeriod);
  const access = await requireAdminPagePermission("billing");

  let ordersQuery = access.supabase
    .from("orders")
    .select("id, total, sales_channel, payment_method, completed_at")
    .eq("status", "completed")
    .not("completed_at", "is", null);
  let itemsQuery = access.supabase
    .from("order_items")
    .select("product_id, product_name, quantity, unit_price, orders!inner(status, completed_at)")
    .eq("orders.status", "completed")
    .not("orders.completed_at", "is", null);
  let refundsQuery = access.supabase
    .from("order_refunds")
    .select("amount, created_at");
  let lossesQuery = access.supabase
    .from("product_losses")
    .select("product_id, product_name, quantity, estimated_value, created_at");

  if (start) {
    const startIso = start.toISOString();
    ordersQuery = ordersQuery.gte("completed_at", startIso);
    itemsQuery = itemsQuery.gte("orders.completed_at", startIso);
    refundsQuery = refundsQuery.gte("created_at", startIso);
    lossesQuery = lossesQuery.gte("created_at", startIso);
  }

  const [ordersResult, itemsResult, refundsResult, lossesResult, productsResult] =
    await Promise.all([
      ordersQuery,
      itemsQuery,
      refundsQuery,
      lossesQuery,
      access.supabase
        .from("products")
        .select("id, name")
        .eq("active", true),
    ]);

  if (
    ordersResult.error ||
    itemsResult.error ||
    refundsResult.error ||
    lossesResult.error ||
    productsResult.error
  ) {
    console.error("Erro ao carregar relatórios:", {
      orders: ordersResult.error,
      items: itemsResult.error,
      refunds: refundsResult.error,
      losses: lossesResult.error,
      products: productsResult.error,
    });
    throw new Error("Não foi possível carregar os relatórios.");
  }

  const orders = ordersResult.data ?? [];
  const items = itemsResult.data ?? [];
  const refunds = refundsResult.data ?? [];
  const losses = lossesResult.data ?? [];
  const revenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
  const refundTotal = refunds.reduce(
    (sum, refund) => sum + Number(refund.amount),
    0
  );
  const lossTotal = losses.reduce(
    (sum, loss) => sum + Number(loss.estimated_value),
    0
  );
  const averageTicket = orders.length > 0 ? revenue / orders.length : 0;
  const productSales = new Map<
    string,
    { name: string; quantity: number; revenue: number }
  >();

  for (const item of items) {
    const key = item.product_id ?? item.product_name;
    const current = productSales.get(key) ?? {
      name: item.product_name,
      quantity: 0,
      revenue: 0,
    };
    current.quantity += Number(item.quantity);
    current.revenue += Number(item.quantity) * Number(item.unit_price);
    productSales.set(key, current);
  }

  const bestSellers = [...productSales.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);
  const slowMovers = (productsResult.data ?? [])
    .map((product) => ({
      name: product.name,
      quantity: productSales.get(product.id)?.quantity ?? 0,
    }))
    .sort((a, b) => a.quantity - b.quantity)
    .slice(0, 10);
  const channelTotals = orders.reduce(
    (totals, order) => {
      const channel = order.sales_channel === "cashier" ? "Caixa" : "Site";
      totals[channel] = (totals[channel] ?? 0) + Number(order.total);
      return totals;
    },
    {} as Record<string, number>
  );

  return (
    <main className="p-5 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8B0000]">
            Desempenho da loja
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[#241B19]">Relatórios</h1>
          <p className="mt-2 text-sm text-[#756A66]">
            Acompanhe vendas, produtos com maior e menor saída, estornos e perdas.
          </p>
        </header>

        <nav className="mt-6 flex flex-wrap gap-2" aria-label="Período do relatório">
          {Object.entries(periodLabels).map(([period, label]) => (
            <Link
              key={period}
              href={`/admin/relatorios?period=${period}`}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold ${
                selectedPeriod === period
                  ? "bg-[#8B0000] text-white"
                  : "border border-[#EEE6DF] bg-white text-[#756A66]"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <section className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["Faturamento", formatCurrency(revenue), CircleDollarSign, "text-emerald-700"],
            ["Ticket médio", formatCurrency(averageTicket), ReceiptText, "text-blue-700"],
            ["Estornos", formatCurrency(refundTotal), Undo2, "text-amber-700"],
            ["Perdas estimadas", formatCurrency(lossTotal), TrendingDown, "text-red-700"],
          ].map(([label, value, Icon, color]) => {
            const CardIcon = Icon as typeof CircleDollarSign;
            return (
              <article key={String(label)} className="rounded-2xl border border-[#EEE6DF] bg-white p-4 shadow-sm sm:p-5">
                <CardIcon size={20} className={String(color)} />
                <p className="mt-4 text-xs text-[#756A66]">{String(label)}</p>
                <p className="mt-1 text-xl font-bold text-[#241B19] sm:text-2xl">
                  {String(value)}
                </p>
              </article>
            );
          })}
        </section>

        <section className="mt-7 grid gap-5 lg:grid-cols-2">
          <article className="overflow-hidden rounded-3xl border border-[#EEE6DF] bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-[#EEE6DF] p-5">
              <Trophy size={20} className="text-[#8B0000]" />
              <div>
                <h2 className="font-bold text-[#241B19]">Produtos que mais saem</h2>
                <p className="text-xs text-[#756A66]">Quantidade vendida no período</p>
              </div>
            </div>
            <div className="divide-y divide-[#EEE6DF]">
              {bestSellers.map((product, index) => (
                <div key={product.name} className="flex items-center justify-between gap-4 p-4">
                  <p className="text-sm font-bold text-[#241B19]">
                    {index + 1}. {product.name}
                  </p>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#8B0000]">{product.quantity} un.</p>
                    <p className="text-xs text-[#756A66]">{formatCurrency(product.revenue)}</p>
                  </div>
                </div>
              ))}
              {bestSellers.length === 0 && (
                <p className="p-8 text-center text-sm text-[#756A66]">Sem vendas no período.</p>
              )}
            </div>
          </article>

          <article className="overflow-hidden rounded-3xl border border-[#EEE6DF] bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-[#EEE6DF] p-5">
              <PackageSearch size={20} className="text-[#8B0000]" />
              <div>
                <h2 className="font-bold text-[#241B19]">Produtos com menor saída</h2>
                <p className="text-xs text-[#756A66]">Ajuda a revisar produção e cardápio</p>
              </div>
            </div>
            <div className="divide-y divide-[#EEE6DF]">
              {slowMovers.map((product) => (
                <div key={product.name} className="flex items-center justify-between gap-4 p-4">
                  <p className="text-sm font-bold text-[#241B19]">{product.name}</p>
                  <p className="text-sm font-bold text-amber-700">{product.quantity} un.</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-7 overflow-hidden rounded-3xl border border-[#EEE6DF] bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-[#EEE6DF] p-5">
            <BarChart3 size={20} className="text-[#8B0000]" />
            <h2 className="font-bold text-[#241B19]">Vendas por origem</h2>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            {["Site", "Caixa"].map((channel) => (
              <div key={channel} className="rounded-2xl bg-[#FFF7F5] p-4">
                <p className="text-xs font-bold uppercase text-[#756A66]">{channel}</p>
                <p className="mt-2 text-xl font-bold text-[#8B0000]">
                  {formatCurrency(channelTotals[channel] ?? 0)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
