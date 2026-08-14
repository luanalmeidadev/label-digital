import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  WalletCards,
} from "lucide-react";

import OrdersPanelTabs from "@/components/admin/OrdersPanelTabs";
import {
  getPreorderPaymentStatus,
  preorderPaymentStatusClasses,
  preorderPaymentStatusLabels,
  preorderRequestStatusClasses,
  preorderRequestStatusLabels,
} from "@/lib/preorder-request";
import { listPreorderRequests } from "@/lib/preorder-request-store";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ month?: string }>;

const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getSaoPauloToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function parseMonth(value: string | undefined) {
  const fallback = getSaoPauloToday().slice(0, 7);

  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    return fallback;
  }

  const [year, month] = value.split("-").map(Number);

  if (year < 2020 || year > 2100 || month < 1 || month > 12) {
    return fallback;
  }

  return value;
}

function moveMonth(value: string, offset: number) {
  const [year, month] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + offset, 1))
    .toISOString()
    .slice(0, 7);
}

function formatMonthTitle(value: string) {
  const [year, month] = value.split("-").map(Number);
  const title = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));

  return title.charAt(0).toUpperCase() + title.slice(1);
}

export default async function CalendarioEncomendasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const selectedMonth = parseMonth(params.month);
  const [year, month] = selectedMonth.split("-").map(Number);
  const firstWeekDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const today = getSaoPauloToday();
  const requests = (await listPreorderRequests())
    .filter(
      (request) =>
        request.status !== "cancelled" &&
        request.status !== "completed" &&
        request.desiredDate.startsWith(selectedMonth)
    )
    .sort((first, second) =>
      first.desiredDate.localeCompare(second.desiredDate)
    );
  const requestsByDate = new Map(
    Array.from({ length: daysInMonth }, (_, index) => {
      const date = `${selectedMonth}-${String(index + 1).padStart(2, "0")}`;
      return [
        date,
        requests.filter((request) => request.desiredDate === date),
      ] as const;
    })
  );
  const pendingDepositCount = requests.filter((request) => {
    const status = getPreorderPaymentStatus(request);
    return status === "awaiting_deposit" || status === "partial";
  }).length;
  const productionCount = requests.filter(
    (request) => request.status === "in_production"
  ).length;
  const readyCount = requests.filter(
    (request) => request.status === "ready"
  ).length;
  const calendarCells = [
    ...Array.from({ length: firstWeekDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  return (
    <main className="p-5 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/admin/pedidos/encomendas"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#8B0000] hover:underline"
        >
          <ArrowLeft size={16} />
          Voltar para encomendas
        </Link>

        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8B0000]">
            Organização interna
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[#241B19]">
            Calendário de produção
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#756A66]">
            Encomendas em aberto distribuídas pela data combinada com o cliente.
          </p>
        </div>

        <OrdersPanelTabs active="preorders" />

        <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "No mês", value: requests.length, icon: CalendarDays, color: "bg-blue-100 text-blue-700" },
            { label: "Em produção", value: productionCount, icon: Clock3, color: "bg-orange-100 text-orange-700" },
            { label: "Prontas", value: readyCount, icon: CalendarDays, color: "bg-emerald-100 text-emerald-700" },
            { label: "Sinal pendente", value: pendingDepositCount, icon: WalletCards, color: "bg-red-100 text-red-700" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.label} className="rounded-2xl border border-[#EEE6DF] bg-white p-4 shadow-sm">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.color}`}>
                  <Icon size={18} />
                </div>
                <p className="mt-3 text-xs text-[#756A66]">{item.label}</p>
                <p className="mt-1 text-2xl font-bold text-[#241B19]">{item.value}</p>
              </article>
            );
          })}
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl border border-[#EEE6DF] bg-white shadow-sm">
          <header className="flex items-center justify-between gap-4 border-b border-[#EEE6DF] p-4 sm:p-5">
            <Link
              href={`/admin/pedidos/encomendas/calendario?month=${moveMonth(selectedMonth, -1)}`}
              aria-label="Mês anterior"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#EEE6DF] text-[#8B0000] hover:border-[#D2B48C]"
            >
              <ChevronLeft size={19} />
            </Link>
            <h2 className="text-center text-lg font-bold text-[#241B19] sm:text-xl">
              {formatMonthTitle(selectedMonth)}
            </h2>
            <Link
              href={`/admin/pedidos/encomendas/calendario?month=${moveMonth(selectedMonth, 1)}`}
              aria-label="Próximo mês"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#EEE6DF] text-[#8B0000] hover:border-[#D2B48C]"
            >
              <ChevronRight size={19} />
            </Link>
          </header>

          <div className="overflow-x-auto">
            <div className="min-w-[920px]">
              <div className="grid grid-cols-7 border-b border-[#EEE6DF] bg-[#FFF9F3]">
                {weekDays.map((day) => (
                  <div key={day} className="px-3 py-2 text-center text-xs font-bold uppercase text-[#756A66]">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 bg-[#EEE6DF] gap-px">
                {calendarCells.map((day, index) => {
                  if (day === null) {
                    return <div key={`empty-${index}`} className="min-h-40 bg-[#FAF8F5]" />;
                  }

                  const date = `${selectedMonth}-${String(day).padStart(2, "0")}`;
                  const dayRequests = requestsByDate.get(date) ?? [];
                  const isToday = date === today;

                  return (
                    <div key={date} className={`min-h-40 bg-white p-2 ${isToday ? "ring-2 ring-inset ring-[#8B0000]" : ""}`}>
                      <div className="flex items-center justify-between">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${isToday ? "bg-[#8B0000] text-white" : "text-[#756A66]"}`}>
                          {day}
                        </span>
                        {dayRequests.length > 0 && (
                          <span className="text-[10px] font-bold text-[#8B0000]">{dayRequests.length}</span>
                        )}
                      </div>

                      <div className="mt-2 space-y-2">
                        {dayRequests.map((request) => {
                          const paymentStatus = getPreorderPaymentStatus(request);
                          return (
                            <Link
                              key={request.id}
                              href={`/admin/pedidos/encomendas/${request.id}`}
                              className="block rounded-xl border border-[#EEE6DF] p-2 transition hover:border-[#D2B48C] hover:bg-[#FFFDF9]"
                            >
                              <p className="truncate text-[11px] font-bold text-[#241B19]">{request.productName}</p>
                              <p className="mt-0.5 truncate text-[10px] text-[#756A66]">{request.customerName}</p>
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${preorderRequestStatusClasses[request.status]}`}>
                                  {preorderRequestStatusLabels[request.status]}
                                </span>
                                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${preorderPaymentStatusClasses[paymentStatus]}`}>
                                  {preorderPaymentStatusLabels[paymentStatus]}
                                </span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
