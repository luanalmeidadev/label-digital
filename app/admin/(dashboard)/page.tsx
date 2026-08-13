import Link from "next/link";

import {
  BadgeDollarSign,
  CircleDollarSign,
  Package,
  ShoppingBag,
  Users,
} from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
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
  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: admin } = await supabase
    .from("admin_profiles")
    .select("name")
    .eq("id", user!.id)
    .single();

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
    {
      label: "Produtos ativos",
      value: String(
        activeProductsCount ?? 0
      ),
      icon: Package,
    },
    {
      label: "Pedidos hoje",
      value: String(
        todayOrdersCount ?? 0
      ),
      icon: ShoppingBag,
    },
    {
      label: "Clientes",
      value: String(
        customersCount ?? 0
      ),
      icon: Users,
    },
    {
      label: "Faturamento hoje",
      value: formatCurrency(
        todayRevenue
      ),
      icon: CircleDollarSign,
    },
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
        <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
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
        <section className="mt-6 grid gap-4 sm:grid-cols-2">
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
                    monthRevenue
                  )}
                </p>
              </div>
            </div>
          </article>
        </section>

        {/* CONTEÚDO INFERIOR */}
        <section className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          {/* PEDIDOS RECENTES */}
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

              <Link
                href="/admin/pedidos"
                className="text-sm font-bold text-[#8B0000] transition hover:underline"
              >
                Ver todos
              </Link>
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
              <Link
                href="/admin/pedidos"
                className="flex items-center justify-between rounded-xl bg-white/60 px-4 py-3 text-sm font-bold text-[#8B0000] transition hover:bg-white"
              >
                Pedidos

                <span>→</span>
              </Link>

              <Link
                href="/admin/produtos"
                className="flex items-center justify-between rounded-xl bg-white/60 px-4 py-3 text-sm font-bold text-[#8B0000] transition hover:bg-white"
              >
                Produtos

                <span>→</span>
              </Link>

              <Link
                href="/admin/clientes"
                className="flex items-center justify-between rounded-xl bg-white/60 px-4 py-3 text-sm font-bold text-[#8B0000] transition hover:bg-white"
              >
                Clientes

                <span>→</span>
              </Link>

              <Link
                href="/admin/faturamento"
                className="flex items-center justify-between rounded-xl bg-white/60 px-4 py-3 text-sm font-bold text-[#8B0000] transition hover:bg-white"
              >
                Faturamento

                <span>→</span>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}