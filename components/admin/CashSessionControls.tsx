"use client";

import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Banknote,
  CircleDollarSign,
  History,
  Loader2,
  LockKeyhole,
  PackageX,
  ReceiptText,
  Scale,
} from "lucide-react";

import {
  closeCashSession,
  createCashMovement,
  createProductLoss,
  type CashMovementType,
  type ProductLossReason,
} from "@/app/admin/(dashboard)/caixa/actions";
import { createClientRequestId } from "@/lib/client-request-id";

type Movement = {
  id: string;
  movementType: CashMovementType;
  amount: number;
  description: string;
  createdAt: string;
};

type SessionSummary = {
  id: string;
  openingBalance: number;
  cashSales: number;
  supplies: number;
  withdrawals: number;
  expenses: number;
  expectedCash: number;
};

type LossProduct = {
  id: string;
  name: string;
};

type ProductLoss = {
  id: string;
  productName: string;
  quantity: number;
  reason: string;
  estimatedValue: number;
  createdAt: string;
};

const movementOptions = [
  {
    id: "supply",
    label: "Suprimento",
    description: "Entrada de dinheiro no caixa",
    icon: ArrowDownToLine,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  {
    id: "withdrawal",
    label: "Sangria",
    description: "Retirada de dinheiro por segurança",
    icon: ArrowUpFromLine,
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  {
    id: "expense",
    label: "Despesa",
    description: "Pagamento realizado com o caixa",
    icon: ReceiptText,
    className: "border-red-200 bg-red-50 text-red-700",
  },
] as const;

const movementLabels: Record<CashMovementType, string> = {
  supply: "Suprimento",
  withdrawal: "Sangria",
  expense: "Despesa",
};

const lossReasonLabels: Record<ProductLossReason, string> = {
  expired: "Vencimento",
  damaged: "Danificado",
  production: "Erro de produção",
  internal: "Consumo interno",
  other: "Outro",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function CashSessionControls({
  session,
  movements,
  products,
  losses,
}: {
  session: SessionSummary;
  movements: Movement[];
  products: LossProduct[];
  losses: ProductLoss[];
}) {
  const router = useRouter();
  const movementFormRef = useRef<HTMLFormElement>(null);
  const [movementType, setMovementType] =
    useState<CashMovementType>("supply");
  const [movementReference, setMovementReference] = useState(() =>
    createClientRequestId()
  );
  const [movementError, setMovementError] = useState("");
  const [movementSuccess, setMovementSuccess] = useState("");
  const [movementPending, startMovementTransition] = useTransition();
  const [showClosing, setShowClosing] = useState(false);
  const [closingConfirmed, setClosingConfirmed] = useState(false);
  const [closingError, setClosingError] = useState("");
  const [closingPending, startClosingTransition] = useTransition();
  const lossFormRef = useRef<HTMLFormElement>(null);
  const [lossReference, setLossReference] = useState(() =>
    createClientRequestId()
  );
  const [lossError, setLossError] = useState("");
  const [lossSuccess, setLossSuccess] = useState("");
  const [lossPending, startLossTransition] = useTransition();

  function handleMovement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMovementError("");
    setMovementSuccess("");

    startMovementTransition(async () => {
      const result = await createCashMovement(formData);

      if (!result.success) {
        setMovementError(
          result.error ?? "Não foi possível registrar a movimentação."
        );
        return;
      }

      setMovementSuccess(
        `${movementLabels[movementType]} registrado com sucesso.`
      );
      movementFormRef.current?.reset();
      setMovementReference(createClientRequestId());
      router.refresh();
    });
  }

  function handleClosing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!closingConfirmed) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    setClosingError("");

    startClosingTransition(async () => {
      const result = await closeCashSession(formData);

      if (!result.success) {
        setClosingError(result.error);
        return;
      }

      router.refresh();
    });
  }

  function handleLoss(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setLossError("");
    setLossSuccess("");

    startLossTransition(async () => {
      const result = await createProductLoss(formData);

      if (!result.success) {
        setLossError(
          result.error ?? "Não foi possível registrar a perda."
        );
        return;
      }

      setLossSuccess("Perda registrada com sucesso.");
      lossFormRef.current?.reset();
      setLossReference(createClientRequestId());
      router.refresh();
    });
  }

  return (
    <section id="controle-caixa" className="mt-6 scroll-mt-6 space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-[#EEE6DF] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[#8B0000]">
            <Banknote size={18} />
            <p className="text-xs font-bold uppercase tracking-[0.12em]">
              Saldo inicial
            </p>
          </div>
          <p className="mt-3 text-xl font-bold text-[#241B19]">
            {formatCurrency(session.openingBalance)}
          </p>
        </article>

        <article className="rounded-2xl border border-[#EEE6DF] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-700">
            <CircleDollarSign size={18} />
            <p className="text-xs font-bold uppercase tracking-[0.12em]">
              Vendas em dinheiro
            </p>
          </div>
          <p className="mt-3 text-xl font-bold text-[#241B19]">
            {formatCurrency(session.cashSales)}
          </p>
        </article>

        <article className="rounded-2xl border border-[#EEE6DF] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-amber-700">
            <ArrowUpFromLine size={18} />
            <p className="text-xs font-bold uppercase tracking-[0.12em]">
              Saídas
            </p>
          </div>
          <p className="mt-3 text-xl font-bold text-[#241B19]">
            {formatCurrency(session.withdrawals + session.expenses)}
          </p>
        </article>

        <article className="rounded-2xl border border-[#D2B48C] bg-[#FFF7F5] p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[#8B0000]">
            <Scale size={18} />
            <p className="text-xs font-bold uppercase tracking-[0.12em]">
              Esperado em dinheiro
            </p>
          </div>
          <p className="mt-3 text-xl font-bold text-[#8B0000]">
            {formatCurrency(session.expectedCash)}
          </p>
        </article>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.7fr)]">
        <article className="overflow-hidden rounded-3xl border border-[#EEE6DF] bg-white shadow-sm">
          <div className="border-b border-[#EEE6DF] p-5">
            <h2 className="font-bold text-[#241B19]">
              Movimentar dinheiro
            </h2>
            <p className="mt-1 text-xs text-[#756A66]">
              Registre toda entrada ou saída que não seja uma venda.
            </p>
          </div>

          <form
            ref={movementFormRef}
            onSubmit={handleMovement}
            className="p-5"
          >
            <input
              type="hidden"
              name="cash_session_id"
              value={session.id}
            />
            <input
              type="hidden"
              name="movement_reference"
              value={movementReference}
            />
            <input
              type="hidden"
              name="movement_type"
              value={movementType}
            />

            <div className="grid gap-2 sm:grid-cols-3">
              {movementOptions.map((option) => {
                const Icon = option.icon;
                const selected = movementType === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setMovementType(option.id)}
                    className={`rounded-2xl border p-3 text-left transition ${
                      selected
                        ? option.className
                        : "border-[#EEE6DF] bg-white text-[#756A66]"
                    }`}
                  >
                    <Icon size={18} />
                    <p className="mt-2 text-sm font-bold">{option.label}</p>
                    <p className="mt-1 text-[11px] leading-4">
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
              <label>
                <span className="text-xs font-bold text-[#49352C]">
                  Valor
                </span>
                <div className="mt-2 flex h-11 items-center rounded-xl border border-[#DDD3CB] px-3 focus-within:border-[#8B0000]">
                  <span className="mr-2 text-xs font-bold text-[#756A66]">
                    R$
                  </span>
                  <input
                    name="amount"
                    type="number"
                    min="0.01"
                    max="1000000"
                    step="0.01"
                    required
                    disabled={movementPending}
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  />
                </div>
              </label>

              <label>
                <span className="text-xs font-bold text-[#49352C]">
                  Motivo ou descrição
                </span>
                <input
                  name="description"
                  type="text"
                  minLength={2}
                  maxLength={300}
                  required
                  disabled={movementPending}
                  placeholder="Ex.: retirada para depósito"
                  className="mt-2 h-11 w-full rounded-xl border border-[#DDD3CB] px-3 text-sm outline-none focus:border-[#8B0000]"
                />
              </label>
            </div>

            {movementError && (
              <p className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">
                {movementError}
              </p>
            )}
            {movementSuccess && (
              <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
                {movementSuccess}
              </p>
            )}

            <button
              type="submit"
              disabled={movementPending}
              className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#8B0000] px-5 text-sm font-bold text-white disabled:opacity-60"
            >
              {movementPending && (
                <Loader2 size={16} className="animate-spin" />
              )}
              Registrar movimentação
            </button>
          </form>
        </article>

        <article className="overflow-hidden rounded-3xl border border-[#EEE6DF] bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-[#EEE6DF] p-5">
            <History size={19} className="text-[#8B0000]" />
            <div>
              <h2 className="font-bold text-[#241B19]">
                Movimentações recentes
              </h2>
              <p className="text-xs text-[#756A66]">
                Últimos registros deste caixa
              </p>
            </div>
          </div>

          {movements.length > 0 ? (
            <div className="max-h-[340px] divide-y divide-[#EEE6DF] overflow-y-auto">
              {movements.map((movement) => {
                const isSupply = movement.movementType === "supply";

                return (
                  <div
                    key={movement.id}
                    className="flex items-start justify-between gap-4 p-4"
                  >
                    <div>
                      <p className="text-sm font-bold text-[#241B19]">
                        {movementLabels[movement.movementType]}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#756A66]">
                        {movement.description} · {formatTime(movement.createdAt)}
                      </p>
                    </div>
                    <p
                      className={`whitespace-nowrap text-sm font-bold ${
                        isSupply ? "text-emerald-700" : "text-red-700"
                      }`}
                    >
                      {isSupply ? "+" : "−"}
                      {formatCurrency(movement.amount)}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="p-8 text-center text-sm text-[#756A66]">
              Nenhuma movimentação registrada.
            </p>
          )}
        </article>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.7fr)]">
        <article className="overflow-hidden rounded-3xl border border-[#EEE6DF] bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-[#EEE6DF] p-5">
            <PackageX size={20} className="text-[#8B0000]" />
            <div>
              <h2 className="font-bold text-[#241B19]">Registrar perda</h2>
              <p className="text-xs text-[#756A66]">
                Produtos vencidos, danificados ou usados internamente.
              </p>
            </div>
          </div>

          <form ref={lossFormRef} onSubmit={handleLoss} className="p-5">
            <input type="hidden" name="cash_session_id" value={session.id} />
            <input type="hidden" name="loss_reference" value={lossReference} />

            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="text-xs font-bold text-[#49352C]">Produto</span>
                <select
                  name="product_id"
                  required
                  disabled={lossPending}
                  defaultValue=""
                  className="mt-2 h-11 w-full rounded-xl border border-[#DDD3CB] bg-white px-3 text-sm outline-none focus:border-[#8B0000]"
                >
                  <option value="" disabled>Selecione o produto</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="text-xs font-bold text-[#49352C]">Quantidade</span>
                <input
                  name="quantity"
                  type="number"
                  min="1"
                  max="10000"
                  step="1"
                  required
                  disabled={lossPending}
                  className="mt-2 h-11 w-full rounded-xl border border-[#DDD3CB] px-3 text-sm outline-none focus:border-[#8B0000]"
                />
              </label>

              <label>
                <span className="text-xs font-bold text-[#49352C]">Motivo</span>
                <select
                  name="reason"
                  required
                  disabled={lossPending}
                  defaultValue="expired"
                  className="mt-2 h-11 w-full rounded-xl border border-[#DDD3CB] bg-white px-3 text-sm outline-none focus:border-[#8B0000]"
                >
                  {Object.entries(lossReasonLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <label>
                <span className="text-xs font-bold text-[#49352C]">Observação</span>
                <input
                  name="notes"
                  type="text"
                  maxLength={300}
                  disabled={lossPending}
                  placeholder="Opcional"
                  className="mt-2 h-11 w-full rounded-xl border border-[#DDD3CB] px-3 text-sm outline-none focus:border-[#8B0000]"
                />
              </label>
            </div>

            {lossError && (
              <p className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">
                {lossError}
              </p>
            )}
            {lossSuccess && (
              <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
                {lossSuccess}
              </p>
            )}

            <button
              type="submit"
              disabled={lossPending || products.length === 0}
              className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#8B0000] px-5 text-sm font-bold text-white disabled:opacity-50"
            >
              {lossPending && <Loader2 size={16} className="animate-spin" />}
              Registrar perda
            </button>
          </form>
        </article>

        <article className="overflow-hidden rounded-3xl border border-[#EEE6DF] bg-white shadow-sm">
          <div className="border-b border-[#EEE6DF] p-5">
            <h2 className="font-bold text-[#241B19]">Perdas deste caixa</h2>
            <p className="mt-1 text-xs text-[#756A66]">
              {losses.reduce((sum, loss) => sum + loss.quantity, 0)} unidade(s)
            </p>
          </div>

          {losses.length > 0 ? (
            <div className="max-h-[360px] divide-y divide-[#EEE6DF] overflow-y-auto">
              {losses.map((loss) => (
                <div key={loss.id} className="flex items-start justify-between gap-4 p-4">
                  <div>
                    <p className="text-sm font-bold text-[#241B19]">
                      {loss.quantity}x {loss.productName}
                    </p>
                    <p className="mt-1 text-xs text-[#756A66]">
                      {lossReasonLabels[loss.reason as ProductLossReason] ?? loss.reason}
                      {" · "}{formatTime(loss.createdAt)}
                    </p>
                  </div>
                  <p className="whitespace-nowrap text-xs font-bold text-red-700">
                    {formatCurrency(loss.estimatedValue)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="p-8 text-center text-sm text-[#756A66]">
              Nenhuma perda registrada.
            </p>
          )}
        </article>
      </div>

      <article className="overflow-hidden rounded-3xl border border-red-100 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setShowClosing((current) => !current)}
          className="flex w-full items-center justify-between gap-4 p-5 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-700">
              <LockKeyhole size={20} />
            </div>
            <div>
              <h2 className="font-bold text-[#241B19]">Fechar caixa</h2>
              <p className="mt-1 text-xs text-[#756A66]">
                Confira o dinheiro físico ao terminar o expediente.
              </p>
            </div>
          </div>
          <span className="text-sm font-bold text-[#8B0000]">
            {showClosing ? "Cancelar" : "Conferir e fechar"}
          </span>
        </button>

        {showClosing && (
          <form
            onSubmit={handleClosing}
            className="border-t border-red-100 bg-red-50/40 p-5"
          >
            <input
              type="hidden"
              name="cash_session_id"
              value={session.id}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="text-xs font-bold text-[#49352C]">
                  Dinheiro contado no caixa
                </span>
                <div className="mt-2 flex h-11 items-center rounded-xl border border-[#DDD3CB] bg-white px-3 focus-within:border-[#8B0000]">
                  <span className="mr-2 text-xs font-bold text-[#756A66]">
                    R$
                  </span>
                  <input
                    name="closing_cash_counted"
                    type="number"
                    min="0"
                    max="1000000"
                    step="0.01"
                    defaultValue={Math.max(session.expectedCash, 0).toFixed(2)}
                    required
                    disabled={closingPending}
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  />
                </div>
              </label>

              <label>
                <span className="text-xs font-bold text-[#49352C]">
                  Observações (opcional)
                </span>
                <input
                  name="notes"
                  type="text"
                  maxLength={500}
                  disabled={closingPending}
                  placeholder="Explique alguma diferença, se houver"
                  className="mt-2 h-11 w-full rounded-xl border border-[#DDD3CB] bg-white px-3 text-sm outline-none focus:border-[#8B0000]"
                />
              </label>
            </div>

            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-red-100 bg-white p-3 text-sm text-[#49352C]">
              <input
                type="checkbox"
                checked={closingConfirmed}
                onChange={(event) =>
                  setClosingConfirmed(event.target.checked)
                }
                className="mt-0.5 h-4 w-4 accent-[#8B0000]"
              />
              Conferi os valores. Entendo que, após fechar, novas vendas exigirão
              a abertura de outro caixa.
            </label>

            {closingError && (
              <p className="mt-4 rounded-xl bg-red-100 p-3 text-xs font-semibold text-red-700">
                {closingError}
              </p>
            )}

            <button
              type="submit"
              disabled={!closingConfirmed || closingPending}
              className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-700 px-5 text-sm font-bold text-white disabled:opacity-50"
            >
              {closingPending && (
                <Loader2 size={16} className="animate-spin" />
              )}
              Fechar caixa definitivamente
            </button>
          </form>
        )}
      </article>
    </section>
  );
}
