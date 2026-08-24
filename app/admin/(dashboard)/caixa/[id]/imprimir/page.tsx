import { notFound } from "next/navigation";

import PrintOrderButton from "@/components/admin/PrintOrderButton";
import { requireAdminPagePermission } from "@/lib/admin-auth";
import {
  isPaymentMethod,
  paymentMethodLabels,
} from "@/lib/payment-method";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "Não informado";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

const movementLabels: Record<string, string> = {
  supply: "Suprimento",
  withdrawal: "Sangria",
  expense: "Despesa",
};

const lossLabels: Record<string, string> = {
  expired: "Vencimento",
  damaged: "Danificado",
  production: "Erro de produção",
  internal: "Consumo interno",
  other: "Outro",
};

export default async function CashClosingPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await requireAdminPagePermission("cashier");
  const [sessionResult, paymentsResult, refundsResult, movementsResult, lossesResult] =
    await Promise.all([
      access.supabase
        .from("cash_sessions")
        .select(
          "id, status, opening_balance, opened_at, closed_at, expected_cash, closing_cash_counted, difference, notes"
        )
        .eq("id", id)
        .maybeSingle(),
      access.supabase
        .from("order_payments")
        .select("id, method, amount, created_at")
        .eq("cash_session_id", id)
        .order("created_at"),
      access.supabase
        .from("order_refunds")
        .select("id, method, amount, reason, created_at")
        .eq("cash_session_id", id)
        .order("created_at"),
      access.supabase
        .from("cash_movements")
        .select("id, movement_type, amount, description, created_at")
        .eq("cash_session_id", id)
        .order("created_at"),
      access.supabase
        .from("product_losses")
        .select("id, product_name, quantity, reason, estimated_value, created_at")
        .eq("cash_session_id", id)
        .order("created_at"),
    ]);

  if (!sessionResult.data || sessionResult.error) {
    notFound();
  }

  if (
    paymentsResult.error ||
    refundsResult.error ||
    movementsResult.error ||
    lossesResult.error
  ) {
    throw new Error("Não foi possível carregar o fechamento do caixa.");
  }

  const session = sessionResult.data;
  const payments = paymentsResult.data ?? [];
  const refunds = refundsResult.data ?? [];
  const movements = movementsResult.data ?? [];
  const losses = lossesResult.data ?? [];
  const paymentTotals = payments.reduce<Record<string, number>>(
    (totals, payment) => ({
      ...totals,
      [payment.method]:
        (totals[payment.method] ?? 0) + Number(payment.amount),
    }),
    {}
  );

  return (
    <main className="min-h-screen bg-[#F8F4EF] p-5 text-[#241B19] print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex justify-end print:hidden">
          <PrintOrderButton />
        </div>

        <article className="rounded-3xl border border-[#DDD3CB] bg-white p-6 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
          <header className="border-b border-[#DDD3CB] pb-5 text-center">
            <h1 className="text-xl font-bold uppercase">La&apos;Bel Confeitaria</h1>
            <p className="mt-1 text-sm font-bold uppercase">Fechamento de caixa</p>
            <p className="mt-2 text-xs text-[#756A66]">
              Aberto em {formatDate(session.opened_at)} · Fechado em{" "}
              {formatDate(session.closed_at)}
            </p>
          </header>

          <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Saldo inicial", session.opening_balance],
              ["Esperado", session.expected_cash],
              ["Contado", session.closing_cash_counted],
              ["Diferença", session.difference],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-[#EEE6DF] p-3">
                <p className="text-[10px] font-bold uppercase text-[#756A66]">
                  {label}
                </p>
                <p className="mt-1 text-sm font-bold">
                  {formatCurrency(Number(value ?? 0))}
                </p>
              </div>
            ))}
          </section>

          <section className="mt-6">
            <h2 className="text-sm font-bold uppercase">Vendas por pagamento</h2>
            <div className="mt-2 divide-y divide-[#EEE6DF] border-y border-[#EEE6DF]">
              {Object.entries(paymentTotals).map(([method, amount]) => (
                <p key={method} className="flex justify-between gap-4 py-2 text-sm">
                  <span>
                    {isPaymentMethod(method)
                      ? paymentMethodLabels[method]
                      : method}
                  </span>
                  <strong>{formatCurrency(amount)}</strong>
                </p>
              ))}
              {Object.keys(paymentTotals).length === 0 && (
                <p className="py-3 text-sm text-[#756A66]">Nenhuma venda.</p>
              )}
            </div>
          </section>

          <section className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <h2 className="text-sm font-bold uppercase">Movimentações</h2>
              <div className="mt-2 space-y-2 text-xs">
                {movements.map((movement) => (
                  <p key={movement.id} className="flex justify-between gap-3">
                    <span>
                      {movementLabels[movement.movement_type] ?? movement.movement_type}
                      {" — "}{movement.description}
                    </span>
                    <strong>{formatCurrency(Number(movement.amount))}</strong>
                  </p>
                ))}
                {movements.length === 0 && <p>Nenhuma movimentação.</p>}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-bold uppercase">Estornos</h2>
              <div className="mt-2 space-y-2 text-xs">
                {refunds.map((refund) => (
                  <p key={refund.id} className="flex justify-between gap-3">
                    <span>{refund.reason}</span>
                    <strong>-{formatCurrency(Number(refund.amount))}</strong>
                  </p>
                ))}
                {refunds.length === 0 && <p>Nenhum estorno.</p>}
              </div>
            </div>
          </section>

          <section className="mt-6">
            <h2 className="text-sm font-bold uppercase">Perdas de produtos</h2>
            <div className="mt-2 space-y-2 text-xs">
              {losses.map((loss) => (
                <p key={loss.id} className="flex justify-between gap-3">
                  <span>
                    {loss.quantity}x {loss.product_name} ·{" "}
                    {lossLabels[loss.reason] ?? loss.reason}
                  </span>
                  <strong>{formatCurrency(Number(loss.estimated_value))}</strong>
                </p>
              ))}
              {losses.length === 0 && <p>Nenhuma perda registrada.</p>}
            </div>
          </section>

          {session.notes && (
            <section className="mt-6 border-t border-[#DDD3CB] pt-4 text-sm">
              <strong>Observações:</strong> {session.notes}
            </section>
          )}
        </article>
      </div>
    </main>
  );
}
