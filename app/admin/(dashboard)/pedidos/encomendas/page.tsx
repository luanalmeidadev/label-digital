import Link from "next/link";
import Form from "next/form";
import {
  CalendarCheck,
  CalendarClock,
  CalendarRange,
  CakeSlice,
  CheckCircle2,
  Clock3,
  Eye,
  MapPin,
  Printer,
  Plus,
  Search,
  SlidersHorizontal,
  WalletCards,
  X,
} from "lucide-react";

import OrdersPanelTabs from "@/components/admin/OrdersPanelTabs";
import {
  preorderRequestStatusClasses,
  preorderRequestStatusLabels,
  formatPreorderCurrency,
  getPreorderPaymentStatus,
  preorderPaymentStatusClasses,
  preorderPaymentStatusLabels,
  type PreorderRequest,
  type PreorderPaymentStatus,
  type PreorderRequestStatus,
} from "@/lib/preorder-request";
import { listPreorderRequests } from "@/lib/preorder-request-store";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  status?: string;
  payment?: string;
  from?: string;
  to?: string;
}>;

const requestStatuses = Object.keys(
  preorderRequestStatusLabels
) as PreorderRequestStatus[];
const paymentStatuses = Object.keys(
  preorderPaymentStatusLabels
) as PreorderPaymentStatus[];

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function validDateFilter(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : "";
}

function formatDesiredDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function getSaoPauloDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDays(value: string, days: number) {
  const [year, month, day] = value
    .split("-")
    .map(Number);
  const date = new Date(
    Date.UTC(year, month - 1, day + days)
  );

  return date.toISOString().slice(0, 10);
}

function RequestList({
  requests,
}: {
  requests: PreorderRequest[];
}) {
  return (
    <div className="divide-y divide-[#EEE6DF]">
      {requests.map((request) => {
        const paymentStatus =
          getPreorderPaymentStatus(request);

        return (
        <article
          key={request.id}
          className="flex flex-col gap-5 p-5 xl:flex-row xl:items-center xl:justify-between"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-[#241B19]">
                {request.requestNumber}
              </h3>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${preorderRequestStatusClasses[request.status]}`}
              >
                {preorderRequestStatusLabels[
                  request.status
                ]}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${preorderPaymentStatusClasses[paymentStatus]}`}
              >
                {preorderPaymentStatusLabels[paymentStatus]}
              </span>
            </div>

            <p className="mt-2 font-semibold text-[#241B19]">
              {request.productName}
            </p>
            <p className="mt-1 text-sm text-[#756A66]">
              {request.customerName} ·{" "}
              {request.quantity}{" "}
              {request.quantityUnit}
            </p>
            <p className="mt-2 text-sm font-bold text-[#8B0000]">
              {request.total > 0
                ? formatPreorderCurrency(request.total)
                : "Valor a definir"}
              {request.source === "manual" ? " · Cadastro manual" : ""}
            </p>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-[#756A66]">
              <span className="inline-flex items-center gap-1.5 text-[#8B0000]">
                <CalendarClock size={14} />
                {formatDesiredDate(
                  request.desiredDate
                )}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={14} />
                {request.fulfillmentType ===
                "delivery"
                  ? "Entrega"
                  : "Retirada"}
              </span>
              <span>
                Recebida em{" "}
                {formatCreatedAt(
                  request.createdAt
                )}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <Link
              href={`/admin/pedidos/encomendas/${request.id}`}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#EEE6DF] px-4 text-sm font-bold text-[#8B0000] transition hover:border-[#D2B48C]"
            >
              <Eye size={16} />
              Ver detalhes
            </Link>
            <Link
              href={`/admin/pedidos/encomendas/${request.id}/imprimir`}
              target="_blank"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#8B0000] px-4 text-sm font-bold text-[#8B0000] transition hover:bg-[#8B0000] hover:text-white"
            >
              <Printer size={16} />
              Imprimir
            </Link>
          </div>
        </article>
        );
      })}
    </div>
  );
}

export default async function EncomendasPedidosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const query = String(params.q ?? "").trim().slice(0, 100);
  const normalizedQuery = normalizeSearch(query);
  const selectedStatus = requestStatuses.includes(
    params.status as PreorderRequestStatus
  )
    ? (params.status as PreorderRequestStatus)
    : "";
  const selectedPayment = paymentStatuses.includes(
    params.payment as PreorderPaymentStatus
  )
    ? (params.payment as PreorderPaymentStatus)
    : "";
  const fromDate = validDateFilter(params.from);
  const toDate = validDateFilter(params.to);
  const invalidDateRange = Boolean(
    fromDate && toDate && fromDate > toDate
  );
  const requests = await listPreorderRequests();
  const allActiveRequests = requests
    .filter(
      (request) =>
        request.status !== "completed" &&
        request.status !== "cancelled"
    )
    .sort((first, second) =>
      first.desiredDate.localeCompare(
        second.desiredDate
      )
    );
  const filteredRequests = invalidDateRange
    ? []
    : requests.filter((request) => {
        if (
          normalizedQuery &&
          !normalizeSearch(
            [
              request.requestNumber,
              request.customerName,
              request.customerPhone,
              request.productName,
              request.optionLabel,
              ...request.flavors,
            ].join(" ")
          ).includes(normalizedQuery)
        ) {
          return false;
        }

        if (
          selectedStatus &&
          request.status !== selectedStatus
        ) {
          return false;
        }

        if (
          selectedPayment &&
          getPreorderPaymentStatus(request) !==
            selectedPayment
        ) {
          return false;
        }

        if (
          fromDate &&
          request.desiredDate < fromDate
        ) {
          return false;
        }

        if (
          toDate &&
          request.desiredDate > toDate
        ) {
          return false;
        }

        return true;
      });
  const activeRequests = filteredRequests
    .filter(
      (request) =>
        request.status !== "completed" &&
        request.status !== "cancelled"
    )
    .sort((first, second) =>
      first.desiredDate.localeCompare(
        second.desiredDate
      )
    );
  const historyRequests = filteredRequests.filter(
    (request) =>
      request.status === "completed" ||
      request.status === "cancelled"
  );
  const today = getSaoPauloDate();
  const nextWeekDate = addDays(today, 7);
  const newCount = allActiveRequests.filter(
    (request) => request.status === "new"
  ).length;
  const productionCount = allActiveRequests.filter(
    (request) =>
      request.status === "in_production"
  ).length;
  const upcomingCount = allActiveRequests.filter(
    (request) =>
      request.desiredDate >= today &&
      request.desiredDate <= nextWeekDate
  ).length;
  const completedCount = requests.filter(
    (request) => request.status === "completed"
  ).length;
  const pendingDepositCount = allActiveRequests.filter(
    (request) => {
      const paymentStatus =
        getPreorderPaymentStatus(request);
      return (
        paymentStatus === "awaiting_deposit" ||
        paymentStatus === "partial"
      );
    }
  ).length;
  const hasFilters = Boolean(
    query ||
      selectedStatus ||
      selectedPayment ||
      fromDate ||
      toDate
  );

  return (
    <main className="p-5 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8B0000]">
              Operação
            </p>
            <h1 className="mt-2 text-3xl font-bold text-[#241B19]">
              Encomendas
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#756A66]">
              Organizadas pela data solicitada, sem misturar com os pedidos do cardápio diário.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/pedidos/encomendas/calendario"
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#8B0000] px-5 text-sm font-bold text-[#8B0000] transition hover:bg-[#FFF7F5]"
            >
              <CalendarRange size={17} />
              Calendário
            </Link>
            <Link
              href="/admin/pedidos/encomendas/nova"
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#8B0000] px-5 text-sm font-bold text-white transition hover:bg-[#700000]"
            >
              <Plus size={17} />
              Nova encomenda
            </Link>
          </div>
        </div>

        <OrdersPanelTabs active="preorders" />

        <section className="mt-8 grid grid-cols-2 gap-3 xl:grid-cols-5">
          {[
            {
              label: "Novas",
              value: newCount,
              icon: Clock3,
              color:
                "bg-blue-100 text-blue-700",
            },
            {
              label: "Próximos 7 dias",
              value: upcomingCount,
              icon: CalendarCheck,
              color:
                "bg-amber-100 text-amber-700",
            },
            {
              label: "Em produção",
              value: productionCount,
              icon: CakeSlice,
              color:
                "bg-orange-100 text-orange-700",
            },
            {
              label: "Sinal pendente",
              value: pendingDepositCount,
              icon: WalletCards,
              color:
                "bg-red-100 text-red-700",
            },
            {
              label: "Finalizadas",
              value: completedCount,
              icon: CheckCircle2,
              color:
                "bg-green-100 text-green-700",
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.label}
                className="rounded-2xl border border-[#EEE6DF] bg-white p-4 shadow-sm sm:p-5"
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.color}`}
                >
                  <Icon size={20} />
                </div>
                <p className="mt-4 text-xs text-[#756A66] sm:text-sm">
                  {item.label}
                </p>
                <p className="mt-1 text-2xl font-bold text-[#241B19]">
                  {item.value}
                </p>
              </article>
            );
          })}
        </section>

        <section className="mt-8 rounded-3xl border border-[#EEE6DF] bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B0000]/10 text-[#8B0000]">
                <SlidersHorizontal size={18} />
              </div>
              <div>
                <h2 className="font-bold text-[#241B19]">
                  Buscar e filtrar
                </h2>
                <p className="mt-0.5 text-xs text-[#756A66]">
                  Combine quantos filtros precisar.
                </p>
              </div>
            </div>

            {hasFilters && (
              <Link
                href="/admin/pedidos/encomendas"
                scroll={false}
                className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-bold text-[#8B0000] hover:bg-[#FFF7F5]"
              >
                <X size={15} />
                Limpar filtros
              </Link>
            )}
          </div>

          <Form
            action="/admin/pedidos/encomendas"
            scroll={false}
            className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6"
          >
            <label className="block md:col-span-2 xl:col-span-2">
              <span className="text-xs font-bold text-[#756A66]">
                Cliente, código ou produto
              </span>
              <div className="relative mt-2">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8B0000]"
                />
                <input
                  name="q"
                  type="search"
                  defaultValue={query}
                  maxLength={100}
                  placeholder="Ex.: TESTE-ENC-003 ou Carla"
                  className="h-11 w-full rounded-xl border border-[#DDD3CC] bg-white pl-11 pr-4 text-sm outline-none focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/10"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-bold text-[#756A66]">
                Situação
              </span>
              <select
                name="status"
                defaultValue={selectedStatus}
                className="mt-2 h-11 w-full rounded-xl border border-[#DDD3CC] bg-white px-3 text-sm outline-none focus:border-[#8B0000]"
              >
                <option value="">Todas</option>
                {requestStatuses.map((status) => (
                  <option key={status} value={status}>
                    {preorderRequestStatusLabels[status]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-bold text-[#756A66]">
                Pagamento
              </span>
              <select
                name="payment"
                defaultValue={selectedPayment}
                className="mt-2 h-11 w-full rounded-xl border border-[#DDD3CC] bg-white px-3 text-sm outline-none focus:border-[#8B0000]"
              >
                <option value="">Todos</option>
                {paymentStatuses.map((status) => (
                  <option key={status} value={status}>
                    {preorderPaymentStatusLabels[status]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-bold text-[#756A66]">
                Data inicial
              </span>
              <input
                name="from"
                type="date"
                defaultValue={fromDate}
                className="mt-2 h-11 w-full rounded-xl border border-[#DDD3CC] bg-white px-3 text-sm outline-none focus:border-[#8B0000]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold text-[#756A66]">
                Data final
              </span>
              <input
                name="to"
                type="date"
                defaultValue={toDate}
                className="mt-2 h-11 w-full rounded-xl border border-[#DDD3CC] bg-white px-3 text-sm outline-none focus:border-[#8B0000]"
              />
            </label>

            <div className="flex items-end md:col-span-2 xl:col-span-6 xl:justify-end">
              <button
                type="submit"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#8B0000] px-6 text-sm font-bold text-white transition hover:bg-[#700000] sm:w-auto"
              >
                <Search size={16} />
                Aplicar filtros
              </button>
            </div>
          </Form>

          {invalidDateRange && (
            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">
              A data final não pode ser anterior à data inicial.
            </div>
          )}

          {hasFilters && !invalidDateRange && (
            <p className="mt-4 text-xs font-semibold text-[#756A66]">
              {filteredRequests.length} resultado(s) encontrado(s).
            </p>
          )}
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl border border-[#EEE6DF] bg-white shadow-sm">
          <div className="border-b border-[#EEE6DF] p-5">
            <h2 className="font-bold text-[#241B19]">
              Agenda de encomendas
            </h2>
            <p className="mt-1 text-xs text-[#756A66]">
              {activeRequests.length} encomenda(s) em aberto
              {hasFilters ? " nos filtros selecionados" : ""}, ordenadas pela data solicitada.
            </p>
          </div>

          {activeRequests.length > 0 ? (
            <RequestList requests={activeRequests} />
          ) : (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#8B0000]/10 text-[#8B0000]">
                <CakeSlice size={28} />
              </div>
              <h3 className="mt-5 text-xl font-bold text-[#241B19]">
                {hasFilters
                  ? "Nenhuma encomenda encontrada"
                  : "Nenhuma encomenda em aberto"}
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#756A66]">
                {hasFilters
                  ? "Tente alterar ou limpar os filtros aplicados."
                  : "As solicitações enviadas pelo cardápio de encomendas aparecerão aqui."}
              </p>
            </div>
          )}
        </section>

        {historyRequests.length > 0 && (
          <section className="mt-8 overflow-hidden rounded-3xl border border-[#EEE6DF] bg-white shadow-sm">
            <div className="border-b border-[#EEE6DF] p-5">
              <h2 className="font-bold text-[#241B19]">
                Histórico
              </h2>
              <p className="mt-1 text-xs text-[#756A66]">
                {historyRequests.length} encomenda(s) finalizada(s) ou cancelada(s)
                {hasFilters ? " nos filtros selecionados" : ""}.
              </p>
            </div>
            <RequestList requests={historyRequests} />
          </section>
        )}
      </div>
    </main>
  );
}
