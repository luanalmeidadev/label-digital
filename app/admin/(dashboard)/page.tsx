import Link from "next/link";

import {
  BadgeDollarSign,
  CakeSlice,
  CalendarRange,
  CircleDollarSign,
  Package,
  ShoppingBag,
  Users,
  WalletCards,
} from "lucide-react";

import { getAdminAccess } from "@/lib/admin-auth";
import { hasAdminPermission } from "@/lib/admin-permissions";
import { listPreorderRequests } from "@/lib/preorder-request-store";
import { getPreorderPaymentStatus } from "@/lib/preorder-request";
import { logoutAdmin } from "../logout/actions";

const statusLabels: Record<string, string> = {
  created: "Criado",
  sent_to_whatsapp: "Enviado ao WhatsApp",
  confirmed: "Confirmado",
  out_for_delivery: "Saiu para entrega",
  ready_for_pickup: "Pronto para retirada",
  completed: "Finalizado",
  cancelled: "Cancelado",
};

const statusClasses: Record<string, string> = {
  created: "bg-gray-100 text-gray-700",
  sent_to_whatsapp: "bg-emerald-100 text-emerald-700",
  confirmed: "bg-blue-100 text-blue-700",
  out_for_delivery: "bg-orange-100 text-orange-700",
  ready_for_pickup: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AdminPage() {
  const access = await getAdminAccess();
  const supabase = access.supabase;
  const admin = access.profile;
  const canAccessCatalog = hasAdminPermission(
    access.permissions,
    "catalog"
  );
  const canAccessOrders = hasAdminPermission(
    access.permissions,
    "orders"
  );
  const canAccessCustomers = hasAdminPermission(
    access.permissions,
    "customers"
  );
  const canAccessDeliveries = hasAdminPermission(
    access.permissions,
    "deliveries"
  );
  const canAccessBilling = hasAdminPermission(
    access.permissions,
    "billing"
  );
  const canAccessSettings = hasAdminPermission(
    access.permissions,
    "settings"
  );

  /*
   * =========================================
   * DATAS
   * =========================================
   */

  const now = new Date();

  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(
    tomorrowStart.getDate() + 1
  );

  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  /*
   * =========================================
   * PRODUTOS ATIVOS
   * =========================================
   */

  const {
    count: activeProductsCount,
    error: productsError,
  } = await supabase
    .from("products")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("active", true);

  if (productsError) {
    console.error(
      "Erro ao carregar produtos:",
      productsError
    );
  }

  /*
   * =========================================
   * CLIENTES
   * =========================================
   */

  const {
    count: customersCount,
    error: customersError,
  } = await supabase
    .from("customers")
    .select("id", {
      count: "exact",
      head: true,
    });

  if (customersError) {
    console.error(
      "Erro ao carregar clientes:",
      customersError
    );
  }

  /*
   * =========================================
   * PEDIDOS DE HOJE
   * =========================================
   */

  const {
    count: todayOrdersCount,
    error: todayOrdersError,
  } = await supabase
    .from("orders")
    .select("id", {
      count: "exact",
      head: true,
    })
    .gte(
      "created_at",
      todayStart.toISOString()
    )
    .lt(
      "created_at",
      tomorrowStart.toISOString()
    );

  if (todayOrdersError) {
    console.error(
      "Erro ao carregar pedidos de hoje:",
      todayOrdersError
    );
  }

  /*
   * =========================================
   * PEDIDOS EM ANDAMENTO
   * =========================================
   */

  const {
    count: openOrdersCount,
    error: openOrdersError,
  } = await supabase
    .from("orders")
    .select("id", {
      count: "exact",
      head: true,
    })
    .not(
      "status",
      "in",
      "(completed,cancelled)"
    );

  if (openOrdersError) {
    console.error(
      "Erro ao carregar pedidos em andamento:",
      openOrdersError
    );
  }

  /*
   * =========================================
   * FATURAMENTO
   *
   * Somente pedidos finalizados.
   * A data usada é completed_at.
   * =========================================
   */

  const {
    data: completedOrders,
    error: revenueError,
  } = await supabase
    .from("orders")
    .select(
      "id, total, completed_at"
    )
    .eq("status", "completed")
    .not(
      "completed_at",
      "is",
      null
    );

  if (revenueError) {
    console.error(
      "Erro ao carregar faturamento:",
      revenueError
    );
  }

  const completed =
    completedOrders ?? [];

  const todayRevenue = completed
    .filter(
      (order) =>
        order.completed_at &&
        new Date(
          order.completed_at
        ) >= todayStart &&
        new Date(
          order.completed_at
        ) < tomorrowStart
    )
    .reduce(
      (sum, order) =>
        sum + Number(order.total),
      0
    );

  const monthRevenue = completed
    .filter(
      (order) =>
        order.completed_at &&
        new Date(
          order.completed_at
        ) >= monthStart
    )
    .reduce(
      (sum, order) =>
        sum + Number(order.total),
      0
    );

  /*
   * =========================================
   * ENCOMENDAS
   * =========================================
   */

  const preorderRequests =
    await listPreorderRequests();
  const openPreorders = preorderRequests.filter(
    (request) =>
      request.status !== "completed" &&
      request.status !== "cancelled"
  );
  const todayDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const nextWeek = new Date(todayStart);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekDate = `${nextWeek.getFullYear()}-${String(
    nextWeek.getMonth() + 1
  ).padStart(2, "0")}-${String(nextWeek.getDate()).padStart(2, "0")}`;
  const upcomingPreordersCount = openPreorders.filter(
    (request) =>
      request.desiredDate >= todayDate &&
      request.desiredDate <= nextWeekDate
  ).length;
  const pendingDepositCount = openPreorders.filter(
    (request) => {
      const paymentStatus =
        getPreorderPaymentStatus(request);
      return (
        paymentStatus === "awaiting_deposit" ||
        paymentStatus === "partial"
      );
    }
  ).length;
  const todayPreordersCount = preorderRequests.filter(
    (request) => {
      const createdAt = new Date(request.createdAt);
      return (
        createdAt >= todayStart &&
        createdAt < tomorrowStart
      );
    }
  ).length;
  const completedPreorders = preorderRequests.filter(
    (request) =>
      request.status === "completed" &&
      request.completedAt
  );
  const todayPreorderRevenue = completedPreorders
    .filter((request) => {
      const completedAt = new Date(
        request.completedAt!
      );
      return (
        completedAt >= todayStart &&
        completedAt < tomorrowStart
      );
    })
    .reduce(
      (sum, request) => sum + request.total,
      0
    );
  const monthPreorderRevenue = completedPreorders
    .filter(
      (request) =>
        new Date(request.completedAt!) >=
        monthStart
    )
    .reduce(
      (sum, request) => sum + request.total,
      0
    );
  const combinedTodayRevenue =
    todayRevenue + todayPreorderRevenue;
  const combinedMonthRevenue =
    monthRevenue + monthPreorderRevenue;

  /*
   * =========================================
   * ÚLTIMOS PEDIDOS
   * =========================================
   */

  const {
    data: recentOrders,
    error: recentOrdersError,
  } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      order_type,
      status,
      total,
      created_at,

      customers (
        id,
        first_name,
        last_name
      )
    `)
    .order("created_at", {
      ascending: false,
    })
    .limit(5);

  if (recentOrdersError) {
    console.error(
      "Erro ao carregar pedidos recentes:",
      recentOrdersError
    );
  }

  /*
   * =========================================
   * CARDS
   * =========================================
   */

  const stats = [
    ...(canAccessCatalog
      ? [{
      label: "Produtos ativos",
      value: String(
        activeProductsCount ?? 0
      ),
      icon: Package,
      }]
      : []),
    ...(canAccessOrders
      ? [{
      label: "Pedidos hoje",
      value: String(
        todayOrdersCount ?? 0
      ),
      icon: ShoppingBag,
      }, {
      label: "Encomendas hoje",
      value: String(todayPreordersCount),
      icon: CakeSlice,
      }]
      : []),
    ...(canAccessCustomers
      ? [{
      label: "Clientes",
      value: String(
        customersCount ?? 0
      ),
      icon: Users,
      }]
      : []),
    ...(canAccessBilling
      ? [{
      label: "Faturamento hoje",
      value: formatCurrency(
        combinedTodayRevenue
      ),
      icon: CircleDollarSign,
      }]
      : []),
  ];

  return (
    <main className="p-5 sm:p-8">
      <div className="mx-auto max-w-7xl">
        {/* CABEÇALHO */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8B0000]">
              Visão geral
            </p>

            <h1 className="mt-2 text-3xl font-bold text-[#241B19]">
              Olá,{" "}
              {admin?.name ??
                "Administrador"}{" "}
              👋
            </h1>

            <p className="mt-2 text-sm text-[#756A66]">
              Acompanhe aqui o
              movimento da La&apos;bel.
            </p>
          </div>

          <form action={logoutAdmin}>
            <button
              type="submit"
              className="rounded-xl border border-[#8B0000] px-5 py-3 text-sm font-bold text-[#8B0000] transition hover:bg-[#8B0000] hover:text-white"
            >
              Sair
            </button>
          </form>
        </div>

        {/* CARDS PRINCIPAIS */}
        <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <article
                key={stat.label}
                className="rounded-2xl border border-[#EEE6DF] bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8B0000]/10 text-[#8B0000]">
                    <Icon size={21} />
                  </div>
                </div>

                <p className="mt-4 text-xs leading-4 text-[#756A66] sm:mt-5 sm:text-sm">
                  {stat.label}
                </p>

                <p className="mt-1 text-xl font-bold text-[#241B19] sm:text-2xl">
                  {stat.value}
                </p>
              </article>
            );
          })}
        </section>

        {/* RESUMO OPERACIONAL */}
        {(canAccessOrders || canAccessBilling) && (
        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {canAccessOrders && (
          <article className="rounded-2xl border border-[#EEE6DF] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <ShoppingBag
                  size={19}
                />
              </div>

              <div>
                <p className="text-sm text-[#756A66]">
                  Pedidos em andamento
                </p>

                <p className="mt-1 text-xl font-bold text-[#241B19]">
                  {openOrdersCount ??
                    0}
                </p>
              </div>
            </div>
          </article>
          )}

          {canAccessOrders && (
          <article className="rounded-2xl border border-[#EEE6DF] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                <CakeSlice size={19} />
              </div>

              <div>
                <p className="text-sm text-[#756A66]">
                  Encomendas em andamento
                </p>

                <p className="mt-1 text-xl font-bold text-[#241B19]">
                  {openPreorders.length}
                </p>
              </div>
            </div>
          </article>
          )}

          {canAccessOrders && (
          <Link
            href="/admin/pedidos/encomendas/calendario"
            className="rounded-2xl border border-[#EEE6DF] bg-white p-5 shadow-sm transition hover:border-[#D2B48C]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <CalendarRange size={19} />
              </div>
              <div>
                <p className="text-sm text-[#756A66]">
                  Próximos 7 dias
                </p>
                <p className="mt-1 text-xl font-bold text-[#241B19]">
                  {upcomingPreordersCount}
                </p>
              </div>
            </div>
          </Link>
          )}

          {canAccessOrders && (
          <Link
            href="/admin/pedidos/encomendas"
            className="rounded-2xl border border-[#EEE6DF] bg-white p-5 shadow-sm transition hover:border-[#D2B48C]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-700">
                <WalletCards size={19} />
              </div>
              <div>
                <p className="text-sm text-[#756A66]">
                  Sinais pendentes
                </p>
                <p className="mt-1 text-xl font-bold text-[#241B19]">
                  {pendingDepositCount}
                </p>
              </div>
            </div>
          </Link>
          )}

          {canAccessBilling && (
          <article className="rounded-2xl border border-[#EEE6DF] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-700">
                <BadgeDollarSign
                  size={19}
                />
              </div>

              <div>
                <p className="text-sm text-[#756A66]">
                  Faturamento deste mês
                </p>

                <p className="mt-1 text-xl font-bold text-[#241B19]">
                  {formatCurrency(
                    combinedMonthRevenue
                  )}
                </p>
              </div>
            </div>
          </article>
          )}
        </section>
        )}

        {canAccessBilling && (
        <section className="mt-6 overflow-hidden rounded-3xl border border-[#EEE6DF] bg-white shadow-sm">
          <div className="border-b border-[#EEE6DF] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8B0000]">
              Resumo financeiro
            </p>
            <h2 className="mt-1 text-xl font-bold text-[#241B19]">
              Faturamento deste mês
            </h2>
          </div>

          <div className="grid gap-px bg-[#EEE6DF] md:grid-cols-3">
            <Link
              href="/admin/faturamento?source=daily&period=month"
              className="bg-white p-5 transition hover:bg-[#FFFDF9]"
            >
              <p className="inline-flex items-center gap-2 text-sm font-bold text-[#756A66]">
                <ShoppingBag size={17} className="text-[#8B0000]" />
                Vendas diárias
              </p>
              <p className="mt-2 text-2xl font-bold text-[#241B19]">
                {formatCurrency(monthRevenue)}
              </p>
            </Link>

            <Link
              href="/admin/faturamento?source=preorders&period=month"
              className="bg-white p-5 transition hover:bg-[#FFFDF9]"
            >
              <p className="inline-flex items-center gap-2 text-sm font-bold text-[#756A66]">
                <CakeSlice size={17} className="text-[#8B0000]" />
                Encomendas
              </p>
              <p className="mt-2 text-2xl font-bold text-[#241B19]">
                {formatCurrency(monthPreorderRevenue)}
              </p>
            </Link>

            <Link
              href="/admin/faturamento?source=daily&period=month"
              className="bg-[#8B0000] p-5 text-white transition hover:bg-[#700000]"
            >
              <p className="text-sm font-bold text-white/75">
                Total consolidado
              </p>
              <p className="mt-2 text-2xl font-bold">
                {formatCurrency(combinedMonthRevenue)}
              </p>
            </Link>
          </div>
        </section>
        )}

        {/* CONTEÚDO INFERIOR */}
        <section
          className={`mt-8 grid gap-6 ${
            canAccessOrders
              ? "xl:grid-cols-[1.4fr_1fr]"
              : "xl:grid-cols-1"
          }`}
        >
          {/* PEDIDOS RECENTES */}
          {canAccessOrders && (
          <div className="overflow-hidden rounded-3xl border border-[#EEE6DF] bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-[#EEE6DF] p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8B0000]">
                  Pedidos
                </p>

                <h2 className="mt-1 text-xl font-bold text-[#241B19]">
                  Pedidos recentes
                </h2>
              </div>

              {canAccessOrders && (
              <Link
                href="/admin/pedidos"
                className="text-sm font-bold text-[#8B0000] transition hover:underline"
              >
                Ver todos
              </Link>
              )}
            </div>

            {recentOrders &&
            recentOrders.length > 0 ? (
              <div className="divide-y divide-[#EEE6DF]">
                {recentOrders.map(
                  (order) => {
                    const customer =
                      Array.isArray(
                        order.customers
                      )
                        ? order
                            .customers[0]
                        : order.customers;

                    return (
                      <div
                        key={order.id}
                        className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-[#241B19]">
                              Pedido #
                              {
                                order.order_number
                              }
                            </p>

                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                statusClasses[
                                  order
                                    .status
                                ] ??
                                "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {statusLabels[
                                order.status
                              ] ??
                                order.status}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-[#756A66]">
                            {customer
                              ? `${customer.first_name} ${customer.last_name}`
                              : "Cliente não identificado"}
                          </p>

                          <p className="mt-1 text-xs text-[#756A66]">
                            {order.order_type ===
                            "delivery"
                              ? "Entrega"
                              : "Retirada"}{" "}
                            •{" "}
                            {formatDate(
                              order.created_at
                            )}
                          </p>
                        </div>

                        <p className="font-bold text-[#8B0000]">
                          {formatCurrency(
                            Number(
                              order.total
                            )
                          )}
                        </p>
                      </div>
                    );
                  }
                )}
              </div>
            ) : (
              <div className="py-14 text-center">
                <ShoppingBag
                  size={38}
                  className="mx-auto text-[#D2B48C]"
                />

                <p className="mt-4 font-bold text-[#241B19]">
                  Nenhum pedido ainda
                </p>

                <p className="mt-2 text-sm text-[#756A66]">
                  Quando os primeiros
                  pedidos forem enviados,
                  eles aparecerão aqui.
                </p>
              </div>
            )}
          </div>
          )}

          {/* ACESSOS RÁPIDOS */}
          <div className="rounded-3xl bg-[#D2B48C] p-6">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8B0000]">
              La&apos;bel Digital
            </p>

            <h2 className="mt-2 text-2xl font-bold text-[#8B0000]">
              Central da operação
            </h2>

            <p className="mt-3 text-sm leading-6 text-[#49352C]">
              Acesse rapidamente as
              principais áreas do sistema.
            </p>

            <div className="mt-6 grid gap-3">
              {canAccessOrders && (
              <Link
                href="/admin/pedidos"
                className="flex items-center justify-between rounded-xl bg-white/60 px-4 py-3 text-sm font-bold text-[#8B0000] transition hover:bg-white"
              >
                Pedidos

                <span>→</span>
              </Link>
              )}

              {canAccessCatalog && (
              <Link
                href="/admin/produtos"
                className="flex items-center justify-between rounded-xl bg-white/60 px-4 py-3 text-sm font-bold text-[#8B0000] transition hover:bg-white"
              >
                Produtos

                <span>→</span>
              </Link>
              )}

              {canAccessOrders && (
              <Link
                href="/admin/pedidos/encomendas"
                className="flex items-center justify-between rounded-xl bg-white/60 px-4 py-3 text-sm font-bold text-[#8B0000] transition hover:bg-white"
              >
                Agenda de encomendas

                <span>→</span>
              </Link>
              )}

              {canAccessCustomers && (
              <Link
                href="/admin/clientes"
                className="flex items-center justify-between rounded-xl bg-white/60 px-4 py-3 text-sm font-bold text-[#8B0000] transition hover:bg-white"
              >
                Clientes

                <span>→</span>
              </Link>
              )}

              {canAccessDeliveries && (
              <Link
                href="/admin/entregas"
                className="flex items-center justify-between rounded-xl bg-white/60 px-4 py-3 text-sm font-bold text-[#8B0000] transition hover:bg-white"
              >
                Entregas

                <span>→</span>
              </Link>
              )}

              {canAccessBilling && (
              <Link
                href="/admin/faturamento"
                className="flex items-center justify-between rounded-xl bg-white/60 px-4 py-3 text-sm font-bold text-[#8B0000] transition hover:bg-white"
              >
                Faturamento

                <span>→</span>
              </Link>
              )}

              {canAccessSettings && (
              <Link
                href="/admin/configuracoes"
                className="flex items-center justify-between rounded-xl bg-white/60 px-4 py-3 text-sm font-bold text-[#8B0000] transition hover:bg-white"
              >
                Configurações

                <span>→</span>
              </Link>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
