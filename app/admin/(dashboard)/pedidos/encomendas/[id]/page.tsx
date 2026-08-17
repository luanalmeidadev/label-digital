import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CakeSlice,
  Clock3,
  MapPin,
  MessageCircle,
  PencilLine,
  Printer,
  UserRound,
  WalletCards,
} from "lucide-react";

import OrdersPanelTabs from "@/components/admin/OrdersPanelTabs";
import ScrollPreservingForm from "@/components/admin/ScrollPreservingForm";
import {
  preorderRequestStatusClasses,
  preorderRequestStatusLabels,
  formatPreorderCurrency,
  getPreorderBalance,
  getPreorderDepositAmount,
  getPreorderPaymentStatus,
  preorderPaymentStatusClasses,
  preorderPaymentStatusLabels,
  type PreorderRequestStatus,
} from "@/lib/preorder-request";
import { getPreorderRequest } from "@/lib/preorder-request-store";
import {
  updatePreorderPayment,
  updatePreorderRequestStatus,
} from "@/app/admin/(dashboard)/pedidos/encomendas/actions";

export const dynamic = "force-dynamic";

const statusOptions: PreorderRequestStatus[] = [
  "new",
  "confirmed",
  "in_production",
  "ready",
  "completed",
  "cancelled",
];

function formatDesiredDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function EncomendaDetalhesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const request = await getPreorderRequest(id);

  if (!request) {
    notFound();
  }

  const isLocked =
    request.status === "completed" ||
    request.status === "cancelled";
  const customerWhatsApp = request.customerPhone.replace(
    /\D/g,
    ""
  );
  const paymentStatus =
    getPreorderPaymentStatus(request);
  const depositAmount =
    getPreorderDepositAmount(request.total);
  const balance = getPreorderBalance(request);

  return (
    <main className="p-5 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link
              href="/admin/pedidos/encomendas"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#8B0000] hover:underline"
            >
              <ArrowLeft size={16} />
              Voltar para encomendas
            </Link>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-[#241B19]">
                {request.requestNumber}
              </h1>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${preorderRequestStatusClasses[request.status]}`}
              >
                {preorderRequestStatusLabels[request.status]}
              </span>
            </div>
            <p className="mt-2 text-sm text-[#756A66]">
              Solicitação recebida em {formatDateTime(request.createdAt)}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#8B0000]">
              {request.source === "manual" ? "Cadastrada manualmente" : "Recebida pelo cardápio de encomendas"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {!isLocked && (
              <Link
                href={`/admin/pedidos/encomendas/${request.id}/editar`}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#8B0000] px-4 text-sm font-bold text-[#8B0000] transition hover:bg-[#FFF7F5]"
              >
                <PencilLine size={17} />
                Editar encomenda
              </Link>
            )}
            {customerWhatsApp && (
              <a
                href={`https://wa.me/55${customerWhatsApp.replace(/^55/, "")}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-700"
              >
                <MessageCircle size={17} />
                Falar com cliente
              </a>
            )}
            <Link
              href={`/admin/pedidos/encomendas/${request.id}/imprimir?session=started`}
              target="_blank"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#8B0000] px-4 text-sm font-bold text-white transition hover:bg-[#700000]"
            >
              <Printer size={17} />
              Imprimir comanda
            </Link>
          </div>
        </div>

        <OrdersPanelTabs active="preorders" />

        <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <article className="rounded-3xl border border-[#EEE6DF] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8B0000]/10 text-[#8B0000]">
                  <CalendarDays size={21} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8B0000]">
                    Data combinada
                  </p>
                  <p className="mt-1 text-lg font-bold capitalize text-[#241B19]">
                    {formatDesiredDate(request.desiredDate)}
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-3xl border border-[#EEE6DF] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3 border-b border-[#EEE6DF] pb-4">
                <CakeSlice size={20} className="text-[#8B0000]" />
                <h2 className="font-bold text-[#241B19]">
                  Produto encomendado
                </h2>
              </div>

              <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold text-[#756A66]">Produto</dt>
                  <dd className="mt-1 text-lg font-bold text-[#241B19]">
                    {request.productName}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-[#756A66]">Tamanho ou opção</dt>
                  <dd className="mt-1 font-bold text-[#241B19]">
                    {request.optionLabel || "A combinar"}
                  </dd>
                  {request.optionPrice && (
                    <dd className="mt-1 text-sm font-semibold text-[#8B0000]">
                      {request.optionPrice}
                    </dd>
                  )}
                </div>
                <div>
                  <dt className="text-xs font-semibold text-[#756A66]">Quantidade</dt>
                  <dd className="mt-1 font-bold text-[#241B19]">
                    {request.quantity} {request.quantityUnit}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold text-[#756A66]">Valor total</dt>
                  <dd className="mt-1 text-xl font-bold text-[#8B0000]">
                    {request.total > 0
                      ? formatPreorderCurrency(request.total)
                      : "A definir"}
                  </dd>
                </div>
                {request.flavors.length > 0 && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-semibold text-[#756A66]">Sabores</dt>
                    <dd className="mt-2 flex flex-wrap gap-2">
                      {request.flavors.map((flavor) => (
                        <span
                          key={flavor}
                          className="rounded-full bg-[#FFF4E8] px-3 py-1.5 text-xs font-bold text-[#8B0000]"
                        >
                          {flavor}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold text-[#756A66]">Observações</dt>
                  <dd className="mt-2 whitespace-pre-wrap rounded-2xl bg-[#FFF9F3] p-4 text-sm leading-6 text-[#241B19]">
                    {request.notes || "Nenhuma observação informada."}
                  </dd>
                </div>
              </dl>
            </article>

            <article className="rounded-3xl border border-[#EEE6DF] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3 border-b border-[#EEE6DF] pb-4">
                <UserRound size={20} className="text-[#8B0000]" />
                <h2 className="font-bold text-[#241B19]">
                  Cliente e recebimento
                </h2>
              </div>
              <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold text-[#756A66]">Cliente</dt>
                  <dd className="mt-1 font-bold text-[#241B19]">{request.customerName}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-[#756A66]">WhatsApp</dt>
                  <dd className="mt-1 font-bold text-[#241B19]">{request.customerPhone}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold text-[#756A66]">Recebimento</dt>
                  <dd className="mt-1 inline-flex items-center gap-2 font-bold text-[#241B19]">
                    <MapPin size={16} className="text-[#8B0000]" />
                    {request.fulfillmentType === "delivery"
                      ? "Entrega"
                      : "Retirada na loja"}
                  </dd>
                  {request.fulfillmentType === "delivery" && (
                    <dd className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#756A66]">
                      {request.deliveryAddress}
                    </dd>
                  )}
                </div>
              </dl>
            </article>
          </div>

          <aside>
            <div className="space-y-5 lg:sticky lg:top-6">
            <div className="rounded-3xl border border-[#EEE6DF] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <Clock3 size={20} className="text-[#8B0000]" />
                <h2 className="font-bold text-[#241B19]">
                  Andamento da encomenda
                </h2>
              </div>

              {isLocked ? (
                <div className="mt-5 rounded-2xl bg-[#FFF9F3] p-4 text-sm leading-6 text-[#756A66]">
                  Esta encomenda está encerrada como <strong>{preorderRequestStatusLabels[request.status].toLowerCase()}</strong>.
                </div>
              ) : (
                <ScrollPreservingForm action={updatePreorderRequestStatus} className="mt-5 space-y-4">
                  <input type="hidden" name="id" value={request.id} />
                  <label className="block">
                    <span className="text-xs font-bold text-[#756A66]">Situação atual</span>
                    <select
                      name="status"
                      defaultValue={request.status}
                      className="mt-2 h-12 w-full rounded-xl border border-[#DDD3CC] bg-white px-4 text-sm font-semibold text-[#241B19] outline-none focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/10"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {preorderRequestStatusLabels[status]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-bold text-[#756A66]">Valor total</span>
                    <div className="relative mt-2">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#756A66]">
                        R$
                      </span>
                      <input
                        name="total"
                        type="number"
                        min="0.01"
                        max="1000000"
                        step="0.01"
                        required
                        defaultValue={request.total || ""}
                        className="h-12 w-full rounded-xl border border-[#DDD3CC] bg-white pl-12 pr-4 text-sm font-semibold text-[#241B19] outline-none focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/10"
                      />
                    </div>
                  </label>
                  <button
                    type="submit"
                    className="h-11 w-full rounded-xl bg-[#8B0000] px-4 text-sm font-bold text-white transition hover:bg-[#700000]"
                  >
                    Atualizar situação
                  </button>
                  <p className="text-xs leading-5 text-[#756A66]">
                    Finalizar ou cancelar encerra a encomenda e a envia para o histórico.
                  </p>
                </ScrollPreservingForm>
              )}
            </div>

            <div className="rounded-3xl border border-[#EEE6DF] bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <WalletCards size={20} className="text-[#8B0000]" />
                <h2 className="font-bold text-[#241B19]">
                  Pagamento
                </h2>
              </div>

              <span
                className={`mt-4 inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${preorderPaymentStatusClasses[paymentStatus]}`}
              >
                {preorderPaymentStatusLabels[paymentStatus]}
              </span>

              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-[#756A66]">Total</dt>
                  <dd className="font-bold text-[#241B19]">
                    {request.total > 0
                      ? formatPreorderCurrency(request.total)
                      : "A definir"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#756A66]">Sinal mínimo (50%)</dt>
                  <dd className="font-bold text-[#241B19]">
                    {formatPreorderCurrency(depositAmount)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#756A66]">Valor pago</dt>
                  <dd className="font-bold text-emerald-700">
                    {formatPreorderCurrency(request.amountPaid)}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 border-t border-[#EEE6DF] pt-3">
                  <dt className="font-bold text-[#241B19]">Saldo restante</dt>
                  <dd className="font-bold text-[#8B0000]">
                    {formatPreorderCurrency(balance)}
                  </dd>
                </div>
              </dl>

              <ScrollPreservingForm action={updatePreorderPayment} className="mt-5 space-y-3">
                <input type="hidden" name="id" value={request.id} />
                <label className="block">
                  <span className="text-xs font-bold text-[#756A66]">Total já recebido</span>
                  <div className="relative mt-2">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#756A66]">R$</span>
                    <input
                      name="amount_paid"
                      type="number"
                      min="0"
                      max={request.total}
                      step="0.01"
                      defaultValue={request.amountPaid}
                      disabled={request.total <= 0}
                      required
                      className="h-12 w-full rounded-xl border border-[#DDD3CC] bg-white pl-12 pr-4 text-sm font-semibold text-[#241B19] outline-none focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/10 disabled:bg-gray-50 disabled:opacity-60"
                    />
                  </div>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="submit"
                    name="payment_action"
                    value="deposit"
                    disabled={request.total <= 0}
                    className="h-10 whitespace-nowrap rounded-xl border border-[#D2B48C] px-2 text-xs font-bold text-[#8B0000] hover:bg-[#FFF9F3] disabled:opacity-50"
                  >
                    Sinal de 50%
                  </button>
                  <button
                    type="submit"
                    name="payment_action"
                    value="paid"
                    disabled={request.total <= 0}
                    className="h-10 whitespace-nowrap rounded-xl border border-emerald-600 px-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                  >
                    Pago integral
                  </button>
                </div>
                <button
                  type="submit"
                  name="payment_action"
                  value="custom"
                  disabled={request.total <= 0}
                  className="h-11 w-full rounded-xl bg-[#241B19] px-4 text-sm font-bold text-white hover:bg-black disabled:opacity-50"
                >
                  Salvar valor recebido
                </button>
              </ScrollPreservingForm>
            </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
