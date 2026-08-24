import {
  Calculator,
  CheckCircle2,
  CircleDollarSign,
  ReceiptText,
} from "lucide-react";

import CashRegisterPOS from "@/components/admin/CashRegisterPOS";
import CashSessionControls from "@/components/admin/CashSessionControls";
import { requireAdminPagePermission } from "@/lib/admin-auth";
import { calculateExpectedCash } from "@/lib/cash-register";

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
  const [sessionResult, productsResult, salesResult, lastClosedResult] =
    await Promise.all([
    access.supabase
      .from("cash_sessions")
      .select("id, opening_balance, opened_by, opened_at")
      .eq("status", "open")
      .maybeSingle(),
    access.supabase
      .from("products")
      .select("id, name, price, sort_order, categories(name, sort_order)")
      .eq("active", true)
      .eq("available", true)
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
      .limit(1)
      .maybeSingle(),
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

  if (lastClosedResult.error) {
    console.error(
      "Erro ao carregar o último fechamento:",
      lastClosedResult.error
    );
    throw new Error("Não foi possível carregar o último fechamento.");
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

  const products = (productsResult.data ?? []).map((product) => {
    const category = Array.isArray(product.categories)
      ? product.categories[0]
      : product.categories;

    return {
      id: product.id,
      name: product.name,
      price: Number(product.price),
      categoryName: category?.name ?? "Sem categoria",
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
    amount: number;
    description: string;
    createdAt: string;
  }> = [];
  let cashSales = 0;
  let supplies = 0;
  let withdrawals = 0;
  let expenses = 0;

  if (openSession) {
    const [paymentsResult, movementsResult] = await Promise.all([
      access.supabase
        .from("order_payments")
        .select("amount, method")
        .eq("cash_session_id", openSession.id),
      access.supabase
        .from("cash_movements")
        .select("id, movement_type, amount, description, created_at")
        .eq("cash_session_id", openSession.id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    if (paymentsResult.error || movementsResult.error) {
      console.error("Erro ao calcular o caixa:", {
        payments: paymentsResult.error,
        movements: movementsResult.error,
      });
      throw new Error("Não foi possível calcular os valores do caixa.");
    }

    cashSales = (paymentsResult.data ?? [])
      .filter((payment) => payment.method === "cash")
      .reduce((sum, payment) => sum + Number(payment.amount), 0);

    for (const movement of movementsResult.data ?? []) {
      const amount = Number(movement.amount);

      if (movement.movement_type === "supply") {
        supplies += amount;
      } else if (movement.movement_type === "withdrawal") {
        withdrawals += amount;
      } else if (movement.movement_type === "expense") {
        expenses += amount;
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
        amount: Number(movement.amount),
        description: movement.description,
        createdAt: movement.created_at,
      }));
  }

  const expectedCash = openSession
    ? calculateExpectedCash({
        openingBalance: Number(openSession.opening_balance),
        cashSales,
        supplies,
        withdrawals,
        expenses,
      })
    : 0;
  const lastClosed = lastClosedResult.data;

  return (
    <main className="p-5 sm:p-8">
      <div className="mx-auto max-w-[1500px]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8B0000]">
            Venda presencial
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[#241B19]">Caixa</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#756A66]">
            Registre rapidamente os produtos vendidos no balcão e mantenha as
            vendas presenciais integradas aos pedidos e ao faturamento.
          </p>
        </div>

        <section className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 lg:max-w-2xl">
          <article className="rounded-2xl border border-[#EEE6DF] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B0000]/10 text-[#8B0000]">
              <ReceiptText size={19} />
            </div>
            <p className="mt-4 text-xs text-[#756A66] sm:text-sm">Vendas no caixa hoje</p>
            <p className="mt-1 text-xl font-bold text-[#241B19] sm:text-2xl">
              {todaySales.length}
            </p>
          </article>

          <article className="rounded-2xl border border-[#EEE6DF] bg-white p-4 shadow-sm sm:p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <CircleDollarSign size={19} />
            </div>
            <p className="mt-4 text-xs text-[#756A66] sm:text-sm">Vendido no caixa hoje</p>
            <p className="mt-1 break-words text-xl font-bold text-[#241B19] sm:text-2xl">
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

        {products.length === 0 && openSession ? (
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
            products={products}
          />
        )}

        {openSession && (
          <CashSessionControls
            session={{
              id: openSession.id,
              openingBalance: Number(openSession.opening_balance),
              cashSales,
              supplies,
              withdrawals,
              expenses,
              expectedCash,
            }}
            movements={movements}
          />
        )}
      </div>
    </main>
  );
}
