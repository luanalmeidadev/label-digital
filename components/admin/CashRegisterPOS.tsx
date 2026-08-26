"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  Loader2,
  Minus,
  Plus,
  Printer,
  QrCode,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";

import {
  createCashierSale,
  openCashSession,
} from "@/app/admin/(dashboard)/caixa/actions";
import { createClientRequestId } from "@/lib/client-request-id";
import type { PaymentMethod } from "@/lib/payment-method";

type CashProduct = {
  id: string;
  name: string;
  price: number;
  categoryName: string;
};

type OpenSession = {
  id: string;
  openingBalance: number;
  openedAt: string;
  openedBy: string;
};

type SaleResult = {
  orderId: string;
  orderNumber: number;
  total: number;
  change: number;
};

const paymentOptions = [
  { id: "cash", label: "Dinheiro", icon: Banknote },
  { id: "pix", label: "Pix", icon: QrCode },
  { id: "debit_card", label: "Débito", icon: CreditCard },
  { id: "credit_card", label: "Crédito", icon: CreditCard },
] as const;

const emptyPaymentAmounts: Record<PaymentMethod, string> = {
  cash: "",
  pix: "",
  debit_card: "",
  credit_card: "",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function OpenCashForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError("");

    startTransition(async () => {
      const result = await openCashSession(formData);

      if (!result.success) {
        setError(result.error ?? "Não foi possível abrir o caixa.");
        return;
      }

      router.refresh();
    });
  }

  return (
    <section className="mt-8 overflow-hidden rounded-3xl border border-brand-border bg-white shadow-sm">
      <div className="border-b border-brand-border p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
            <Banknote size={21} />
          </div>
          <div>
            <h2 className="font-bold text-brand-foreground">Abrir caixa</h2>
            <p className="text-xs text-brand-muted-foreground">
              Informe quanto há em dinheiro no caixa antes da primeira venda.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5 sm:p-6">
        <label className="block max-w-sm">
          <span className="text-sm font-bold text-[#49352C]">Saldo inicial</span>
          <div className="mt-2 flex h-12 items-center rounded-xl border border-[#DDD3CB] px-4 focus-within:border-brand-primary">
            <span className="mr-3 text-sm font-bold text-brand-muted-foreground">R$</span>
            <input
              name="opening_balance"
              type="number"
              min="0"
              max="1000000"
              step="0.01"
              defaultValue="0"
              required
              disabled={pending}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
        </label>

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-primary px-6 text-sm font-bold text-brand-primary-foreground transition hover:bg-brand-primary-hover disabled:opacity-60"
        >
          {pending && <Loader2 size={17} className="animate-spin" />}
          {pending ? "Abrindo..." : "Abrir caixa do dia"}
        </button>
      </form>
    </section>
  );
}

export default function CashRegisterPOS({
  session,
  products,
}: {
  session: OpenSession | null;
  products: CashProduct[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("pix");
  const [splitPayment, setSplitPayment] = useState(false);
  const [paymentAmounts, setPaymentAmounts] = useState<
    Record<PaymentMethod, string>
  >(emptyPaymentAmounts);
  const [cashReceived, setCashReceived] = useState("");
  const [reference, setReference] = useState(() =>
    createClientRequestId()
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [lastSale, setLastSale] = useState<SaleResult | null>(null);

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");

    return normalized
      ? products.filter(
          (product) =>
            product.name.toLocaleLowerCase("pt-BR").includes(normalized) ||
            product.categoryName
              .toLocaleLowerCase("pt-BR")
              .includes(normalized)
        )
      : products;
  }, [products, query]);

  const groupedProducts = useMemo(() => {
    const groups = new Map<string, CashProduct[]>();

    for (const product of filteredProducts) {
      const group = groups.get(product.categoryName) ?? [];
      group.push(product);
      groups.set(product.categoryName, group);
    }

    return [...groups.entries()];
  }, [filteredProducts]);

  const cartProducts = products.filter((product) => cart[product.id]);
  const total = cartProducts.reduce(
    (sum, product) => sum + product.price * cart[product.id],
    0
  );
  const selectedPayments = splitPayment
    ? paymentOptions.flatMap((method) => {
        const amount = Number(
          paymentAmounts[method.id].replace(",", ".")
        );

        return Number.isFinite(amount) && amount > 0
          ? [{ method: method.id, amount }]
          : [];
      })
    : [{ method: paymentMethod, amount: total }];
  const paymentTotal = selectedPayments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );
  const cashAmount =
    selectedPayments.find((payment) => payment.method === "cash")
      ?.amount ?? 0;
  const parsedCashReceived = Number(cashReceived.replace(",", "."));
  const change =
    cashAmount > 0 && Number.isFinite(parsedCashReceived)
      ? Math.max(parsedCashReceived - cashAmount, 0)
      : 0;
  const paymentValid =
    total > 0 &&
    selectedPayments.length > 0 &&
    Math.abs(paymentTotal - total) < 0.005 &&
    (cashAmount === 0 ||
      (Number.isFinite(parsedCashReceived) &&
        parsedCashReceived >= cashAmount));

  function changeQuantity(productId: string, delta: number) {
    setCart((current) => {
      const nextQuantity = Math.max((current[productId] ?? 0) + delta, 0);
      const next = { ...current };

      if (nextQuantity === 0) {
        delete next[productId];
      } else {
        next[productId] = nextQuantity;
      }

      return next;
    });
  }

  function finishSale() {
    if (!session || !paymentValid || pending) {
      return;
    }

    setError("");
    startTransition(async () => {
      const result = await createCashierSale({
        cashSessionId: session.id,
        reference,
        customerName,
        notes,
        items: cartProducts.map((product) => ({
          productId: product.id,
          quantity: cart[product.id],
        })),
        payments: selectedPayments.map((payment) => ({
          method: payment.method,
          amount: Number(payment.amount.toFixed(2)),
          tenderedAmount:
            payment.method === "cash" ? parsedCashReceived : null,
        })),
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setLastSale(result);
      setCart({});
      setCustomerName("");
      setNotes("");
      setPaymentMethod("pix");
      setSplitPayment(false);
      setPaymentAmounts(emptyPaymentAmounts);
      setCashReceived("");
      setReference(createClientRequestId());
      router.refresh();
    });
  }

  if (!session) {
    return <OpenCashForm />;
  }

  return (
    <>
      <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-bold text-emerald-800">Caixa aberto</p>
            <p className="mt-1 text-xs text-emerald-700">
              Aberto por {session.openedBy} · Saldo inicial {formatCurrency(session.openingBalance)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-emerald-700">
              Pronto para vender
            </span>
            <a
              href="#controle-caixa"
              className="rounded-full border border-emerald-300 px-3 py-1.5 text-xs font-bold text-emerald-800"
            >
              Movimentações e fechamento
            </a>
          </div>
        </div>
      </section>

      {lastSale && (
        <section className="mt-5 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={22} />
              <div>
                <p className="font-bold text-brand-foreground">
                  Venda #{lastSale.orderNumber} concluída
                </p>
                <p className="mt-1 text-sm text-brand-muted-foreground">
                  Total {formatCurrency(lastSale.total)}
                  {lastSale.change > 0
                    ? ` · Troco ${formatCurrency(lastSale.change)}`
                    : ""}
                </p>
              </div>
            </div>
            <Link
              href={`/admin/pedidos/${lastSale.orderId}/imprimir?session=started`}
              target="_blank"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-brand-primary px-4 text-sm font-bold text-brand-primary"
            >
              <Printer size={17} />
              Imprimir comanda
            </Link>
          </div>
        </section>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="overflow-hidden rounded-3xl border border-brand-border bg-white shadow-sm">
          <div className="border-b border-brand-border p-5">
            <h2 className="font-bold text-brand-foreground">Produtos disponíveis</h2>
            <div className="relative mt-4">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-primary"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar produto ou categoria"
                className="h-12 w-full rounded-xl border border-[#DDD3CB] pl-11 pr-4 text-sm outline-none focus:border-brand-primary"
              />
            </div>
          </div>

          <div className="max-h-[720px] overflow-y-auto p-5">
            {groupedProducts.length > 0 ? (
              <div className="space-y-7">
                {groupedProducts.map(([category, categoryProducts]) => (
                  <div key={category}>
                    <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-brand-primary">
                      {category}
                    </h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {categoryProducts.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => changeQuantity(product.id, 1)}
                          className="rounded-2xl border border-brand-border p-4 text-left transition hover:border-brand-secondary hover:bg-brand-background"
                        >
                          <p className="font-bold text-brand-foreground">{product.name}</p>
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <span className="text-sm font-bold text-brand-primary">
                              {formatCurrency(product.price)}
                            </span>
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-primary text-brand-primary-foreground">
                              <Plus size={16} />
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-14 text-center text-sm text-brand-muted-foreground">
                Nenhum produto encontrado.
              </p>
            )}
          </div>
        </section>

        <section className="self-start overflow-hidden rounded-3xl border border-brand-border bg-white shadow-sm xl:sticky xl:top-6">
          <div className="flex items-center gap-3 border-b border-brand-border p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
              <ShoppingCart size={19} />
            </div>
            <div>
              <h2 className="font-bold text-brand-foreground">Venda atual</h2>
              <p className="text-xs text-brand-muted-foreground">
                {cartProducts.reduce((sum, product) => sum + cart[product.id], 0)} item(ns)
              </p>
            </div>
          </div>

          {cartProducts.length > 0 ? (
            <div className="divide-y divide-brand-border">
              {cartProducts.map((product) => (
                <div key={product.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-brand-foreground">{product.name}</p>
                      <p className="mt-1 text-xs text-brand-muted-foreground">
                        {formatCurrency(product.price)} cada
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remover ${product.name}`}
                      onClick={() =>
                        setCart((current) => {
                          const next = { ...current };
                          delete next[product.id];
                          return next;
                        })
                      }
                      className="text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center rounded-xl border border-brand-border">
                      <button
                        type="button"
                        onClick={() => changeQuantity(product.id, -1)}
                        className="flex h-9 w-9 items-center justify-center text-brand-primary"
                      >
                        <Minus size={15} />
                      </button>
                      <span className="min-w-9 text-center text-sm font-bold">
                        {cart[product.id]}
                      </span>
                      <button
                        type="button"
                        onClick={() => changeQuantity(product.id, 1)}
                        className="flex h-9 w-9 items-center justify-center text-brand-primary"
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                    <p className="font-bold text-brand-foreground">
                      {formatCurrency(product.price * cart[product.id])}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-center text-sm text-brand-muted-foreground">
              Toque nos produtos para adicioná-los.
            </div>
          )}

          <div className="border-t border-brand-border bg-brand-background p-5">
            <label className="block">
              <span className="text-xs font-bold text-[#49352C]">Cliente (opcional)</span>
              <input
                type="text"
                maxLength={100}
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Nome para identificar a venda"
                className="mt-2 h-11 w-full rounded-xl border border-[#DDD3CB] bg-white px-3 text-sm outline-none focus:border-brand-primary"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-xs font-bold text-[#49352C]">Observações (opcional)</span>
              <textarea
                maxLength={1000}
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="mt-2 w-full resize-none rounded-xl border border-[#DDD3CB] bg-white px-3 py-2 text-sm outline-none focus:border-brand-primary"
              />
            </label>

            <div className="mt-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold text-[#49352C]">Pagamento</p>
                <button
                  type="button"
                  onClick={() => {
                    const next = !splitPayment;
                    setSplitPayment(next);
                    setPaymentAmounts(
                      next
                        ? {
                            ...emptyPaymentAmounts,
                            pix: total > 0 ? total.toFixed(2) : "",
                          }
                        : emptyPaymentAmounts
                    );
                    setPaymentMethod("pix");
                    setCashReceived("");
                  }}
                  className="text-xs font-bold text-brand-primary"
                >
                  {splitPayment ? "Usar uma forma" : "Dividir pagamento"}
                </button>
              </div>

              {!splitPayment ? (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {paymentOptions.map((method) => {
                    const Icon = method.icon;
                    const active = paymentMethod === method.id;

                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(method.id);
                          setCashReceived(
                            method.id === "cash" ? total.toFixed(2) : ""
                          );
                        }}
                        className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-xs font-bold ${
                          active
                            ? "border-brand-primary bg-brand-primary text-brand-primary-foreground"
                            : "border-[#DDD3CB] bg-white text-[#49352C]"
                        }`}
                      >
                        <Icon size={16} />
                        {method.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-3 grid gap-3 rounded-2xl border border-brand-border bg-white p-3 sm:grid-cols-2">
                  {paymentOptions.map((method) => (
                    <label key={method.id}>
                      <span className="text-[11px] font-bold text-[#49352C]">
                        {method.label}
                      </span>
                      <div className="mt-1 flex h-10 items-center rounded-xl border border-[#DDD3CB] px-3 focus-within:border-brand-primary">
                        <span className="mr-2 text-xs font-bold text-brand-muted-foreground">
                          R$
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={paymentAmounts[method.id]}
                          onChange={(event) => {
                            const nextValue = event.target.value;
                            const previousCashAmount = Number(
                              paymentAmounts.cash.replace(",", ".")
                            );
                            const receivedAmount = Number(
                              cashReceived.replace(",", ".")
                            );
                            const receivedWasAutomatic =
                              cashReceived === "" ||
                              (Number.isFinite(receivedAmount) &&
                                Number.isFinite(previousCashAmount) &&
                                Math.abs(
                                  receivedAmount - previousCashAmount
                                ) < 0.005);

                            if (
                              method.id === "cash" &&
                              receivedWasAutomatic
                            ) {
                              setCashReceived(nextValue);
                            }

                            setPaymentAmounts((current) => ({
                              ...current,
                              [method.id]: nextValue,
                            }));
                          }}
                          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                        />
                      </div>
                    </label>
                  ))}

                  <p
                    className={`text-xs font-semibold sm:col-span-2 ${
                      Math.abs(paymentTotal - total) < 0.005
                        ? "text-emerald-700"
                        : "text-amber-700"
                    }`}
                  >
                    Informado: {formatCurrency(paymentTotal)} ·{" "}
                    {paymentTotal < total
                      ? `Falta ${formatCurrency(total - paymentTotal)}`
                      : paymentTotal > total
                        ? `Excedeu ${formatCurrency(paymentTotal - total)}`
                        : "Total conferido"}
                  </p>
                </div>
              )}
            </div>

            {cashAmount > 0 && (
              <label className="mt-4 block">
                <span className="text-xs font-bold text-[#49352C]">
                  Valor entregue pelo cliente
                </span>
                <div className="mt-2 flex h-11 items-center rounded-xl border border-[#DDD3CB] bg-white px-3 focus-within:border-brand-primary">
                  <span className="mr-2 text-xs font-bold text-brand-muted-foreground">R$</span>
                  <input
                    type="number"
                    min={cashAmount}
                    step="0.01"
                    value={cashReceived}
                    onChange={(event) => setCashReceived(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  />
                </div>
                <p className="mt-2 text-xs font-semibold text-brand-muted-foreground">
                  Já preenchemos com a parcela em dinheiro. Altere somente se
                  precisar calcular troco.
                  <span className="mt-1 block">
                    Troco:{" "}
                    <strong className="text-brand-primary">
                      {formatCurrency(change)}
                    </strong>
                  </span>
                </p>
              </label>
            )}

            <div className="mt-5 flex items-end justify-between gap-4 border-t border-[#E5DAD3] pt-4">
              <div>
                <p className="text-xs text-brand-muted-foreground">Total da venda</p>
                <p className="mt-1 text-2xl font-bold text-brand-primary">
                  {formatCurrency(total)}
                </p>
              </div>
            </div>

            {error && (
              <p className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={finishSale}
              disabled={!paymentValid || pending}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-primary text-sm font-bold text-brand-primary-foreground transition hover:bg-brand-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending && <Loader2 size={17} className="animate-spin" />}
              {pending ? "Finalizando..." : "Finalizar venda"}
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
