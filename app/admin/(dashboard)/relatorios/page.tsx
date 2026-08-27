import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Layers3,
  ListChecks,
  PackageSearch,
  ReceiptText,
  TrendingDown,
  Trophy,
  Undo2,
} from "lucide-react";

import ReportsActions from "@/components/admin/ReportsActions";
import { getPublicInstallationProfile } from "@/config/installation/public";
import { requireAdminPagePermission } from "@/lib/admin-auth";
import {
  buildReportCsv,
  reportPeriodLabels,
  resolveReportPeriod,
  summarizeSoldOrderItems,
} from "@/lib/admin-reporting";
import {
  buildReportFilename,
  buildReportTitle,
} from "@/lib/installation-presentation";
import {
  paymentMethodLabels,
  type PaymentMethod,
} from "@/lib/payment-method";

type SearchParams = Promise<{
  period?: string;
  from?: string;
  to?: string;
}>;

const installation = getPublicInstallationProfile();

function formatCurrency(value: number) {
  return new Intl.NumberFormat(installation.regionalization.locale, {
    style: "currency",
    currency: installation.regionalization.currency,
  }).format(value);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const period = resolveReportPeriod(params);
  const access = await requireAdminPagePermission("billing");

  let ordersQuery = access.supabase
    .from("orders")
    .select("id, total, sales_channel, payment_method, completed_at")
    .eq("status", "completed")
    .not("completed_at", "is", null);
  let itemsQuery = access.supabase
    .from("order_items")
    .select(`
      id,
      product_id,
      product_name,
      variant_id,
      variant_name,
      quantity,
      base_unit_price,
      options_unit_price,
      unit_price,
      item_notes,
      configuration_signature,
      order_item_options (
        id,
        option_id,
        group_name,
        option_name,
        presentation_mode,
        price_delta,
        group_sort_order,
        option_sort_order
      ),
      orders!inner(status, completed_at)
    `)
    .eq("orders.status", "completed")
    .not("orders.completed_at", "is", null);
  let refundsQuery = access.supabase
    .from("order_refunds")
    .select("amount, created_at");
  let lossesQuery = access.supabase
    .from("product_losses")
    .select(
      "product_id, product_name, variant_id, variant_name, quantity, estimated_value, created_at"
    );

  if (period.startIso) {
    ordersQuery = ordersQuery.gte("completed_at", period.startIso);
    itemsQuery = itemsQuery.gte("orders.completed_at", period.startIso);
    refundsQuery = refundsQuery.gte("created_at", period.startIso);
    lossesQuery = lossesQuery.gte("created_at", period.startIso);
  }

  if (period.endExclusiveIso) {
    ordersQuery = ordersQuery.lt("completed_at", period.endExclusiveIso);
    itemsQuery = itemsQuery.lt("orders.completed_at", period.endExclusiveIso);
    refundsQuery = refundsQuery.lt("created_at", period.endExclusiveIso);
    lossesQuery = lossesQuery.lt("created_at", period.endExclusiveIso);
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
  const soldItemsReport = summarizeSoldOrderItems(items);
  const productSales = new Map(
    soldItemsReport.products.map((product) => [product.key, product])
  );

  const bestSellers = [...productSales.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);
  const variantSales = [...soldItemsReport.variants].sort(
    (a, b) => b.quantity - a.quantity || b.revenue - a.revenue
  );
  const optionSales = [...soldItemsReport.options].sort(
    (a, b) => b.selections - a.selections || b.revenue - a.revenue
  );
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
      const current = totals[channel] ?? { count: 0, total: 0 };
      current.count += 1;
      current.total += Number(order.total);
      totals[channel] = current;
      return totals;
    },
    {} as Record<string, { count: number; total: number }>
  );
  const paymentTotals = orders.reduce(
    (totals, order) => {
      const method = order.payment_method as PaymentMethod | "mixed" | null;
      const label = method
        ? (paymentMethodLabels[method] ?? "Não informado")
        : "Não informado";
      const current = totals[label] ?? { count: 0, total: 0 };
      current.count += 1;
      current.total += Number(order.total);
      totals[label] = current;
      return totals;
    },
    {} as Record<string, { count: number; total: number }>
  );
  const lossByProduct = losses.reduce(
    (totals, loss) => {
      const key = loss.product_id ?? loss.product_name;
      const current = totals.get(key) ?? {
        name: loss.product_name,
        quantity: 0,
        total: 0,
      };
      current.quantity += Number(loss.quantity);
      current.total += Number(loss.estimated_value);
      totals.set(key, current);
      return totals;
    },
    new Map<string, { name: string; quantity: number; total: number }>()
  );
  const csv = buildReportCsv([
    [buildReportTitle(installation)],
    ["Período", period.label],
    [],
    ["RESUMO"],
    ["Indicador", "Valor"],
    ["Vendas concluídas", orders.length],
    ["Faturamento", formatCurrency(revenue)],
    ["Ticket médio", formatCurrency(averageTicket)],
    ["Estornos", formatCurrency(refundTotal)],
    ["Perdas estimadas", formatCurrency(lossTotal)],
    [],
    ["PRODUTOS VENDIDOS"],
    [
      "Produto",
      "Quantidade",
      "Receita base",
      "Adicionais",
      "Faturamento",
    ],
    ...[...productSales.values()]
      .sort((a, b) => b.quantity - a.quantity)
      .map((product) => [
        product.name,
        product.quantity,
        formatCurrency(product.baseRevenue),
        formatCurrency(product.optionsRevenue),
        formatCurrency(product.revenue),
      ]),
    ...(variantSales.length > 0
      ? [
          [],
          ["VARIANTES VENDIDAS"],
          ["Produto", "Variante", "Quantidade", "Faturamento"],
          ...variantSales.map((variant) => [
            variant.productName,
            variant.variantName,
            variant.quantity,
            formatCurrency(variant.revenue),
          ]),
        ]
      : []),
    ...(optionSales.length > 0
      ? [
          [],
          ["OPÇÕES ESCOLHIDAS"],
          ["Produto", "Grupo", "Opção", "Seleções", "Receita adicional"],
          ...optionSales.map((option) => [
            option.productName,
            option.groupName,
            option.optionName,
            option.selections,
            formatCurrency(option.revenue),
          ]),
        ]
      : []),
    [],
    ["DETALHES DOS ITENS VENDIDOS"],
    [
      "Produto",
      "Variante",
      "Opções",
      "Observação",
      "Quantidade",
      "Preço base unitário",
      "Adicionais unitários",
      "Preço final unitário",
      "Total do item",
    ],
    ...soldItemsReport.details.map((item) => [
      item.productName,
      item.variantName ?? "",
      item.optionLabels.join(" | "),
      item.itemNotes ?? "",
      item.quantity,
      item.baseUnitPrice === null ? "" : formatCurrency(item.baseUnitPrice),
      formatCurrency(item.optionsUnitPrice),
      formatCurrency(item.unitPrice),
      formatCurrency(item.total),
    ]),
    [],
    ["VENDAS POR ORIGEM"],
    ["Origem", "Vendas", "Faturamento"],
    ...Object.entries(channelTotals).map(([label, values]) => [
      label,
      values.count,
      formatCurrency(values.total),
    ]),
    [],
    ["VENDAS POR PAGAMENTO"],
    ["Forma de pagamento", "Vendas", "Faturamento"],
    ...Object.entries(paymentTotals).map(([label, values]) => [
      label,
      values.count,
      formatCurrency(values.total),
    ]),
    [],
    ["PERDAS"],
    ["Produto", "Quantidade", "Valor estimado"],
    ...[...lossByProduct.values()].map((loss) => [
      loss.name,
      loss.quantity,
      formatCurrency(loss.total),
    ]),
    [],
    ["DETALHES DAS PERDAS"],
    ["Produto", "Variante", "Quantidade", "Valor estimado"],
    ...losses.map((loss) => [
      loss.product_name,
      loss.variant_name ?? "",
      Number(loss.quantity),
      formatCurrency(Number(loss.estimated_value)),
    ]),
  ]);

  return (
    <main className="p-5 print:p-0 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-primary">
              Desempenho da loja
            </p>
            <h1 className="mt-2 text-3xl font-bold text-brand-foreground">Relatórios</h1>
            <p className="mt-2 text-sm text-brand-muted-foreground">
              Acompanhe vendas, produtos com maior e menor saída, estornos e perdas.
            </p>
            <p className="mt-2 hidden text-xs font-bold text-brand-muted-foreground print:block">
              Período: {period.label}
            </p>
          </div>
          <ReportsActions
            csv={csv}
            filename={buildReportFilename(installation, period)}
          />
        </header>

        <nav className="mt-6 flex flex-wrap gap-2 print:hidden" aria-label="Período do relatório">
          {Object.entries(reportPeriodLabels).map(([periodKey, label]) => (
            <Link
              key={periodKey}
              href={`/admin/relatorios?period=${periodKey}`}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold ${
                period.selectedPeriod === periodKey
                  ? "bg-brand-primary text-brand-primary-foreground"
                  : "border border-brand-border bg-white text-brand-muted-foreground"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <form
          method="get"
          className="mt-4 grid gap-3 rounded-2xl border border-brand-border bg-white p-4 shadow-sm print:hidden sm:grid-cols-[auto_1fr_1fr_auto] sm:items-end"
        >
          <div className="flex items-center gap-2 self-center text-sm font-bold text-brand-foreground">
            <CalendarDays size={18} className="text-brand-primary" />
            Período personalizado
          </div>
          <label className="text-xs font-bold text-brand-muted-foreground">
            De
            <input
              type="date"
              name="from"
              required
              defaultValue={period.from}
              className="mt-1 h-11 w-full rounded-xl border border-[#D9CDC4] bg-white px-3 text-sm text-brand-foreground"
            />
          </label>
          <label className="text-xs font-bold text-brand-muted-foreground">
            Até
            <input
              type="date"
              name="to"
              required
              defaultValue={period.to}
              className="mt-1 h-11 w-full rounded-xl border border-[#D9CDC4] bg-white px-3 text-sm text-brand-foreground"
            />
          </label>
          <input type="hidden" name="period" value="custom" />
          <button
            type="submit"
            className="h-11 rounded-xl bg-brand-foreground px-5 text-sm font-bold text-white transition hover:bg-black"
          >
            Aplicar
          </button>
        </form>
        {period.validationError && (
          <p className="mt-2 text-sm font-semibold text-red-700 print:hidden">
            {period.validationError}
          </p>
        )}

        <section className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["Faturamento", formatCurrency(revenue), CircleDollarSign, "text-emerald-700"],
            ["Ticket médio", formatCurrency(averageTicket), ReceiptText, "text-blue-700"],
            ["Estornos", formatCurrency(refundTotal), Undo2, "text-amber-700"],
            ["Perdas estimadas", formatCurrency(lossTotal), TrendingDown, "text-red-700"],
          ].map(([label, value, Icon, color]) => {
            const CardIcon = Icon as typeof CircleDollarSign;
            return (
              <article key={String(label)} className="rounded-2xl border border-brand-border bg-white p-4 shadow-sm sm:p-5">
                <CardIcon size={20} className={String(color)} />
                <p className="mt-4 text-xs text-brand-muted-foreground">{String(label)}</p>
                <p className="mt-1 text-xl font-bold text-brand-foreground sm:text-2xl">
                  {String(value)}
                </p>
              </article>
            );
          })}
        </section>

        {(variantSales.length > 0 || optionSales.length > 0) && (
          <section className="mt-7 grid gap-5 lg:grid-cols-2">
            {variantSales.length > 0 && (
              <article className="overflow-hidden rounded-3xl border border-brand-border bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-brand-border p-5">
                  <Layers3 size={20} className="text-brand-primary" />
                  <div>
                    <h2 className="font-bold text-brand-foreground">
                      Vendas por variante
                    </h2>
                    <p className="text-xs text-brand-muted-foreground">
                      Análise complementar sem dividir o ranking principal
                    </p>
                  </div>
                </div>
                <div className="divide-y divide-brand-border">
                  {variantSales.slice(0, 10).map((variant) => (
                    <div
                      key={variant.key}
                      className="flex items-center justify-between gap-4 p-4"
                    >
                      <div>
                        <p className="text-sm font-bold text-brand-foreground">
                          {variant.variantName}
                        </p>
                        <p className="text-xs text-brand-muted-foreground">
                          {variant.productName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-brand-primary">
                          {variant.quantity} un.
                        </p>
                        <p className="text-xs text-brand-muted-foreground">
                          {formatCurrency(variant.revenue)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            )}

            {optionSales.length > 0 && (
              <article className="overflow-hidden rounded-3xl border border-brand-border bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-brand-border p-5">
                  <ListChecks size={20} className="text-brand-primary" />
                  <div>
                    <h2 className="font-bold text-brand-foreground">
                      Opções mais escolhidas
                    </h2>
                    <p className="text-xs text-brand-muted-foreground">
                      Escolhas e adicionais, sem tratá-los como produtos
                    </p>
                  </div>
                </div>
                <div className="divide-y divide-brand-border">
                  {optionSales.slice(0, 10).map((option) => (
                    <div
                      key={option.key}
                      className="flex items-center justify-between gap-4 p-4"
                    >
                      <div>
                        <p className="text-sm font-bold text-brand-foreground">
                          {option.optionName}
                        </p>
                        <p className="text-xs text-brand-muted-foreground">
                          {option.productName} · {option.groupName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-brand-primary">
                          {option.selections} seleção(ões)
                        </p>
                        {option.revenue > 0 && (
                          <p className="text-xs text-brand-muted-foreground">
                            + {formatCurrency(option.revenue)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            )}
          </section>
        )}

        <section className="mt-7 grid gap-5 lg:grid-cols-2">
          <article className="overflow-hidden rounded-3xl border border-brand-border bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-brand-border p-5">
              <Trophy size={20} className="text-brand-primary" />
              <div>
                <h2 className="font-bold text-brand-foreground">Produtos que mais saem</h2>
                <p className="text-xs text-brand-muted-foreground">Quantidade vendida no período</p>
              </div>
            </div>
            <div className="divide-y divide-brand-border">
              {bestSellers.map((product, index) => (
                <div key={product.name} className="flex items-center justify-between gap-4 p-4">
                  <p className="text-sm font-bold text-brand-foreground">
                    {index + 1}. {product.name}
                  </p>
                  <div className="text-right">
                    <p className="text-sm font-bold text-brand-primary">{product.quantity} un.</p>
                    <p className="text-xs text-brand-muted-foreground">{formatCurrency(product.revenue)}</p>
                  </div>
                </div>
              ))}
              {bestSellers.length === 0 && (
                <p className="p-8 text-center text-sm text-brand-muted-foreground">Sem vendas no período.</p>
              )}
            </div>
          </article>

          <article className="overflow-hidden rounded-3xl border border-brand-border bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-brand-border p-5">
              <PackageSearch size={20} className="text-brand-primary" />
              <div>
                <h2 className="font-bold text-brand-foreground">Produtos com menor saída</h2>
                <p className="text-xs text-brand-muted-foreground">Ajuda a revisar produção e cardápio</p>
              </div>
            </div>
            <div className="divide-y divide-brand-border">
              {slowMovers.map((product) => (
                <div key={product.name} className="flex items-center justify-between gap-4 p-4">
                  <p className="text-sm font-bold text-brand-foreground">{product.name}</p>
                  <p className="text-sm font-bold text-amber-700">{product.quantity} un.</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="mt-7 grid gap-5 lg:grid-cols-2">
          <article className="overflow-hidden rounded-3xl border border-brand-border bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-brand-border p-5">
              <BarChart3 size={20} className="text-brand-primary" />
              <h2 className="font-bold text-brand-foreground">Vendas por origem</h2>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              {["Site", "Caixa"].map((channel) => {
                const values = channelTotals[channel] ?? { count: 0, total: 0 };
                return (
                  <div key={channel} className="rounded-2xl bg-[#FFF7F5] p-4">
                    <p className="text-xs font-bold uppercase text-brand-muted-foreground">{channel}</p>
                    <p className="mt-2 text-xl font-bold text-brand-primary">
                      {formatCurrency(values.total)}
                    </p>
                    <p className="mt-1 text-xs text-brand-muted-foreground">
                      {values.count} venda(s)
                    </p>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="overflow-hidden rounded-3xl border border-brand-border bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-brand-border p-5">
              <ReceiptText size={20} className="text-brand-primary" />
              <h2 className="font-bold text-brand-foreground">Formas de pagamento</h2>
            </div>
            <div className="divide-y divide-brand-border">
              {Object.entries(paymentTotals)
                .sort(([, a], [, b]) => b.total - a.total)
                .map(([label, values]) => (
                  <div key={label} className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <p className="text-sm font-bold text-brand-foreground">{label}</p>
                      <p className="text-xs text-brand-muted-foreground">{values.count} venda(s)</p>
                    </div>
                    <p className="text-sm font-bold text-brand-primary">
                      {formatCurrency(values.total)}
                    </p>
                  </div>
                ))}
              {Object.keys(paymentTotals).length === 0 && (
                <p className="p-8 text-center text-sm text-brand-muted-foreground">
                  Sem vendas no período.
                </p>
              )}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
