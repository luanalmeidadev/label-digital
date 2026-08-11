import {
  Package,
  ShoppingBag,
  Users,
  DollarSign,
} from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logoutAdmin } from "../logout/actions";

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: admin } = await supabase
    .from("admin_profiles")
    .select("name")
    .eq("id", user!.id)
    .single();

  const stats = [
    {
      label: "Produtos",
      value: "0",
      icon: Package,
    },
    {
      label: "Pedidos hoje",
      value: "0",
      icon: ShoppingBag,
    },
    {
      label: "Clientes",
      value: "0",
      icon: Users,
    },
    {
      label: "Faturamento hoje",
      value: "R$ 0,00",
      icon: DollarSign,
    },
  ];

  return (
    <main className="p-5 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8B0000]">
              Visão geral
            </p>

            <h1 className="mt-2 text-3xl font-bold text-[#241B19]">
              Olá, {admin?.name ?? "Administrador"} 👋
            </h1>

            <p className="mt-2 text-sm text-[#756A66]">
              Acompanhe aqui o movimento da La&apos;bel.
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

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <article
                key={stat.label}
                className="rounded-2xl border border-[#EEE6DF] bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#8B0000]/10 text-[#8B0000]">
                    <Icon size={21} />
                  </div>
                </div>

                <p className="mt-5 text-sm text-[#756A66]">
                  {stat.label}
                </p>

                <p className="mt-1 text-2xl font-bold text-[#241B19]">
                  {stat.value}
                </p>
              </article>
            );
          })}
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl border border-[#EEE6DF] bg-white p-6 shadow-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8B0000]">
                Pedidos
              </p>

              <h2 className="mt-1 text-xl font-bold">
                Pedidos recentes
              </h2>
            </div>

            <div className="mt-10 py-10 text-center">
              <ShoppingBag
                size={38}
                className="mx-auto text-[#D2B48C]"
              />

              <p className="mt-4 font-bold text-[#241B19]">
                Nenhum pedido ainda
              </p>

              <p className="mt-2 text-sm text-[#756A66]">
                Quando os primeiros pedidos forem enviados pelo cardápio,
                eles aparecerão aqui.
              </p>
            </div>
          </div>

          <div className="rounded-3xl bg-[#D2B48C] p-6">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8B0000]">
              La&apos;bel Digital
            </p>

            <h2 className="mt-2 text-2xl font-bold text-[#8B0000]">
              Sistema em construção
            </h2>

            <p className="mt-3 text-sm leading-6 text-[#49352C]">
              Estamos preparando produtos, pedidos, clientes,
              entregas e configurações para deixar toda a operação
              centralizada em um só lugar.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}