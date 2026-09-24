import { Ticket } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import CouponDialog from "@/components/admin/CouponDialog";
import DeleteCouponDialog from "@/components/admin/DeleteCouponDialog";
import { toggleCouponStatus } from "./actions";

async function getCouponsData() {
  const supabase = await createSupabaseServerClient();

  const { data: coupons, error } = await supabase
    .from("coupons")
    .select("id, code, discount_percent, expires_at, active, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Não foi possível carregar os cupons.");
  }

  const now = Date.now();

  return coupons?.map(c => ({
    ...c,
    isExpired: c.expires_at ? new Date(c.expires_at).getTime() < now : false
  }));
}

export default async function CuponsPage() {
  const coupons = await getCouponsData();

  return (
    <main className="p-5 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-primary">
              Marketing
            </p>

            <h1 className="mt-2 text-3xl font-bold text-brand-foreground">
              Cupons de Desconto
            </h1>

            <p className="mt-2 text-sm text-brand-muted-foreground">
              Crie cupons promocionais para seus clientes.
            </p>
          </div>

          <CouponDialog />
        </div>

        <section className="mt-8 overflow-hidden rounded-3xl border border-brand-border bg-white shadow-sm">
          <div className="border-b border-brand-border p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                <Ticket size={20} />
              </div>

              <div>
                <h2 className="font-bold text-brand-foreground">
                  Cupons cadastrados
                </h2>

                <p className="text-xs text-brand-muted-foreground">
                  {coupons?.length ?? 0} cupom(ns)
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-brand-border">
            {coupons?.map((coupon) => {
              return (
                <div
                  key={coupon.id}
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF7F5] text-sm font-bold text-brand-primary">
                      {coupon.discount_percent}%
                    </div>

                    <div>
                      <p className="font-bold text-brand-foreground">
                        {coupon.code}
                      </p>

                      <p className="mt-1 text-xs text-brand-muted-foreground">
                        {coupon.expires_at ? (
                          coupon.isExpired ? (
                            <span className="text-red-500">
                              Expirou em{" "}
                              {new Intl.DateTimeFormat("pt-BR").format(
                                new Date(coupon.expires_at)
                              )}
                            </span>
                          ) : (
                            <span>
                              Válido até{" "}
                              {new Intl.DateTimeFormat("pt-BR").format(
                                new Date(coupon.expires_at)
                              )}
                            </span>
                          )
                        ) : (
                          "Validade indeterminada"
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        coupon.active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {coupon.active ? "Ativo" : "Inativo"}
                    </span>

                    <CouponDialog
                      coupon={{
                        id: coupon.id,
                        code: coupon.code,
                        discountPercent: coupon.discount_percent,
                        expiresAt: coupon.expires_at,
                      }}
                    />

                    <form action={toggleCouponStatus}>
                      <input type="hidden" name="id" value={coupon.id} />
                      <input
                        type="hidden"
                        name="active"
                        value={String(coupon.active)}
                      />

                      <button
                        type="submit"
                        className="rounded-lg border border-brand-border px-3 py-2 text-xs font-bold text-brand-primary transition hover:border-brand-secondary"
                      >
                        {coupon.active ? "Desativar" : "Ativar"}
                      </button>
                    </form>

                    <DeleteCouponDialog id={coupon.id} />
                  </div>
                </div>
              );
            })}

            {coupons?.length === 0 && (
              <div className="p-10 text-center">
                <Ticket size={36} className="mx-auto text-brand-secondary" />

                <p className="mt-4 font-bold text-brand-foreground">
                  Nenhum cupom cadastrado
                </p>

                <p className="mt-2 text-sm text-brand-muted-foreground">
                  Crie o primeiro cupom para oferecer descontos aos seus clientes.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
