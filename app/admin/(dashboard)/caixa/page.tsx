import {
  Calculator,
  CheckCircle2,
  CircleDollarSign,
  History,
  Printer,
  ReceiptText,
} from "lucide-react";

import CashRegisterPOS from "@/components/admin/CashRegisterPOS";
import CashSessionControls from "@/components/admin/CashSessionControls";
import { requireAdminPagePermission } from "@/lib/admin-auth";
import {
  affectsPhysicalCash,
  calculateExpectedCash,
} from "@/lib/cash-register";
import { getFoodCatalogConfigurations } from "@/lib/food-catalog/repository";
import {
  isPaymentMethod,
  type PaymentMethod,
} from "@/lib/payment-method";

function startOfSaoPauloToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return new Date(`${parts}T00:00:00-03:00`).toISOString();
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default async function CaixaPage() {
  const access = await requireAdminPagePermission("cashier");
  const [sessionResult, productsResult, salesResult, closedSessionsResult] =
    await Promise.all([
    access.supabase
      .from("cash_sessions")
      .select("id, opening_balance, opened_by, opened_at")
      .eq("status", "open")
      .maybeSingle(),
    access.supabase
      .from("products")
      .select(
        "id, name, price, image_url, catalog_version, pricing_mode, available, sort_order, categories(name, sort_order)"
      )
      .eq("active", true)
      .order("sort_order"),
    access.supabase
      .from("orders")
      .select("id, total")
      .eq("sales_channel", "cashier")
      .eq("status", "completed")
      .gte("completed_at", startOfSaoPauloToday()),
    access.supabase
      .from("cash_sessions")
      .select(
        "id, opening_balance, expected_cash, closing_cash_counted, difference, opened_at, closed_at, notes"
      )
      .eq("status", "closed")
      .order("closed_at", { ascending: false })
      .limit(20),
  ]);

  if (sessionResult.error) {
    console.error("Erro ao carregar o caixa aberto:", sessionResult.error);
    throw new Error("Não foi possível carregar o caixa.");
  }

  if (productsResult.error) {
    console.error("Erro ao carregar produtos do caixa:", productsResult.error);
    throw new Error("Não foi possível carregar os produtos do caixa.");
  }

  if (salesResult.error) {
    console.error("Erro ao carregar vendas do caixa:", salesResult.error);
    throw new Error("Não foi possível carregar as vendas do caixa.");
  }

  if (closedSessionsResult.error) {
    console.error(
      "Erro ao carregar os fechamentos:",
      closedSessionsResult.error
    );
    throw new Error("Não foi possível carregar os fechamentos.");
  }

  const openSession = sessionResult.data;
  let openerName = access.profile.name;

  if (openSession?.opened_by && openSession.opened_by !== access.user.id) {
    const { data: opener } = await access.supabase
      .from("admin_profiles")
      .select("name")
      .eq("id", openSession.opened_by)
      .maybeSingle();

    openerName = opener?.name ?? "Usuário administrativo";
  }

  const productRows = productsResult.data ?? [];
  const catalogConfigurations = await getFoodCatalogConfigurations(
    access.supabase,
    productRows.map((product) => product.id)
  );
  const products = productRows.map((product) => {
    const category = Array.isArray(product.categories)
      ? product.categories[0]
      : product.categories;

    return {
      id: product.id,
      name: product.name,
      price: Number(product.price),
      image_url: product.image_url,
      catalogVersion: Number(product.catalog_version),
      available: product.available,
      categoryName: category?.name ?? "Sem categoria",
      configuration: catalogConfigurations[product.id] ?? {
        pricingMode: product.pricing_mode,
        variants: [],
        optionGroups: [],
      },
    };
  });
  const todaySales = salesResult.data ?? [];
  const todayRevenue = todaySales.reduce(
    (sum, sale) => sum + Number(sale.total),
    0
  );
  let movements: Array<{
    id: string;
    movementType: "supply" | "withdrawal" | "expense";
    paymentMethod: PaymentMethod;
    amount: number;
    description: string;
    createdAt: string;
  }> = [];
  let cashSales = 0;
  const paymentTotals: Record<PaymentMethod, number> = {
    cash: 0,
    pix: 0,
    debit_card: 0,
    credit_card: 0,
  };
  let supplies = 0;
  let withdrawals = 0;
  let expenses = 0;
  let cashExpenses = 0;
  let losses: Array<{
    id: string;
    productName: string;
    quantity: number;
    reason: string;
    estimatedValue: number;
    createdAt: string;
  }> = [];

  if (openSession) {
    const [paymentsResult, movementsResult, lossesResult] = await Promise.all([
      access.supabase
        .from("order_payments")
        .select("amount, method, orders!inner(status)")
        .eq("cash_session_id", openSession.id)
        .eq("orders.status", "completed"),
      access.supabase
        .from("cash_movements")
        .select("id, movement_type, payment_method, amount, description, created_at")
        .eq("cash_session_id", openSession.id)
        .order("created_at", { ascending: false })
        .limit(30),
      access.supabase
        .from("product_losses")
        .select("id, product_name, quantity, reason, estimated_value, created_at")
        .eq("cash_session_id", openSession.id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    if (paymentsResult.error || movementsResult.error || lossesResult.error) {
      console.error("Erro ao calcular o caixa:", {
        payments: paymentsResult.error,
        movements: movementsResult.error,
        losses: lossesResult.error,
      });
      throw new Error("Não foi possível calcular os valores do caixa.");
    }

    for (const payment of paymentsResult.data ?? []) {
      if (isPaymentMethod(payment.method)) {
        paymentTotals[payment.method] += Number(payment.amount);
      }
    }
    cashSales = paymentTotals.cash;

    for (const movement of movementsResult.data ?? []) {
      const amount = Number(movement.amount);

      if (movement.movement_type === "supply") {
        supplies += amount;
      } else if (movement.movement_type === "withdrawal") {
        withdrawals += amount;
      } else if (movement.movement_type === "expense") {
        expenses += amount;
        if (
          isPaymentMethod(movement.payment_method) &&
          affectsPhysicalCash("expense", movement.payment_method)
        ) {
          cashExpenses += amount;
        }
      }
    }

    movements = (movementsResult.data ?? [])
      .filter(
        (movement) =>
          movement.movement_type === "supply" ||
          movement.movement_type === "withdrawal" ||
          movement.movement_type === "expense"
      )
      .map((movement) => ({
        id: movement.id,
        movementType: movement.movement_type as
          | "supply"
          | "withdrawal"
          | "expense",
        paymentMethod: isPaymentMethod(movement.payment_method)
          ? movement.payment_method
          : "cash",
        amount: Number(movement.amount),
        description: movement.description,
        createdAt: movement.created_at,
      }));

    losses = (lossesResult.data ?? []).map((loss) => ({
      id: loss.id,
      productName: loss.product_name,
      quantity: Number(loss.quantity),
      reason: loss.reason,
      estimatedValue: Number(loss.estimated_value),
      createdAt: loss.created_at,
    }));
  }

  const expectedCash = openSession
    ? calculateExpectedCash({
        openingBalance: Number(openSession.opening_balance),
        cashSales,
        supplies,
        withdrawals,
        expenses: cashExpenses,
      })
    : 0;
  const closedSessions = closedSessionsResult.data ?? [];
  const lastClosed = closedSessions[0];

  return (
    <main className="p-5 sm:p-8">
      <div className="mx-auto max-w-[1500px]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-primary">
            Venda presencial
          </p>
          <h1 className="mt-2 text-3xl font-bold text-brand-foreground">Caixa</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-muted-foreground">
            Registre rapidamente os produtos vendidos no balcão e mantenha as
            vendas presenciais integradas aos pedidos e ao faturamento.
          </p>
        </div>

        <section className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 lg:max-w-2xl">
          <article className="rounded-2xl border border-brand-border bg-white p-4 shadow-sm sm:p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
              <ReceiptText size={19} />
            </div>
            <p className="mt-4 text-xs text-brand-muted-foreground sm:text-sm">Vendas no caixa hoje</p>
            <p className="mt-1 text-xl font-bold text-brand-foreground sm:text-2xl">
              {todaySales.length}
            </p>
          </article>

          <article className="rounded-2xl border border-brand-border bg-white p-4 shadow-sm sm:p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <CircleDollarSign size={19} />
            </div>
            <p className="mt-4 text-xs text-brand-muted-foreground sm:text-sm">Vendido no caixa hoje</p>
            <p className="mt-1 break-words text-xl font-bold text-brand-foreground sm:text-2xl">
              {formatCurrency(todayRevenue)}
            </p>
          </article>
        </section>

        {!openSession && lastClosed && (
          <section className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <CheckCircle2
                size={22}
                className="mt-0.5 shrink-0 text-emerald-700"
              />
              <div className="min-w-0">
                <h2 className="font-bold text-emerald-900">
                  Último caixa fechado
                </h2>
                <p className="mt-1 text-xs text-emerald-800">
                  Fechado em{" "}
                  {lastClosed.closed_at
                    ? new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(lastClosed.closed_at))
                    : "data não informada"}
                </p>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-emerald-900">
                  <span>
                    Esperado: <strong>{formatCurrency(Number(lastClosed.expected_cash))}</strong>
                  </span>
                  <span>
                    Contado: <strong>{formatCurrency(Number(lastClosed.closing_cash_counted))}</strong>
                  </span>
                  <span>
                    Diferença:{" "}
                    <strong>{formatCurrency(Number(lastClosed.difference))}</strong>
                  </span>
                </div>
                {lastClosed.notes && (
                  <p className="mt-3 text-xs text-emerald-800">
                    Observação: {lastClosed.notes}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {products.filter((product) => product.available).length === 0 && openSession ? (
          <section className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
            <div className="flex items-start gap-3">
              <Calculator size={22} className="mt-0.5 shrink-0" />
              <div>
                <h2 className="font-bold">Nenhum produto disponível</h2>
                <p className="mt-1 text-sm">
                  Ative e marque produtos como disponíveis antes de registrar uma venda.
                </p>
              </div>
            </div>
          </section>
        ) : (
          <CashRegisterPOS
            session={
              openSession
                ? {
                    id: openSession.id,
                    openingBalance: Number(openSession.opening_balance),
                    openedAt: openSession.opened_at,
                    openedBy: openerName,
                  }
                : null
            }
            products={products.filter((product) => product.available)}
          />
        )}

        {openSession && (
          <CashSessionControls
            session={{
              id: openSession.id,
              openingBalance: Number(openSession.opening_balance),
              paymentTotals,
              supplies,
              withdrawals,
              expenses,
              expectedCash,
            }}
            movements={movements}
            products={products.map((product) => ({
              id: product.id,
              name: product.name,
            }))}
            losses={losses}
          />
        )}

        <section className="mt-8 overflow-hidden rounded-3xl border border-brand-border bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-brand-border p-5">
            <History size={20} className="text-brand-primary" />
            <div>
              <h2 className="font-bold text-brand-foreground">Histórico de caixas</h2>
              <p className="text-xs text-brand-muted-foreground">
                Últimos {closedSessions.length} fechamento(s)
              </p>
            </div>
          </div>

          {closedSessions.length > 0 ? (
            <div className="divide-y divide-brand-border">
              {closedSessions.map((session) => (
                <article
                  key={session.id}
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-bold text-brand-foreground">
                      Caixa de{" "}
                      {new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(session.opened_at))}
                    </p>
                    <p className="mt-1 text-xs text-brand-muted-foreground">
                      Esperado {formatCurrency(Number(session.expected_cash))}
                      {" · "}Contado{" "}
                      {formatCurrency(Number(session.closing_cash_counted))}
                    </p>
                    <p
                      className={`mt-1 text-xs font-bold ${
                        Number(session.difference) === 0
                          ? "text-emerald-700"
                          : "text-amber-700"
                      }`}
                    >
                      Diferença {formatCurrency(Number(session.difference))}
                    </p>
                  </div>

                  <a
                    href={`/admin/caixa/${session.id}/imprimir?session=started`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-brand-primary px-4 text-sm font-bold text-brand-primary"
                  >
                    <Printer size={16} />
                    Imprimir fechamento
                  </a>
                </article>
              ))}
            </div>
          ) : (
            <p className="p-8 text-center text-sm text-brand-muted-foreground">
              Nenhum caixa fechado ainda.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
