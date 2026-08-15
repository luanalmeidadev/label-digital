import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Check,
  CheckCircle2,
  Clock3,
  PackageCheck,
  ShoppingBag,
  Truck,
  XCircle,
} from "lucide-react";

import BrandLogo from "@/components/brand/BrandLogo";
import OrderTrackingRefresh from "@/components/store/OrderTrackingRefresh";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Acompanhar pedido",
  description:
    "Acompanhe o andamento do seu pedido na La’Bel Confeitaria.",
  robots: {
    index: false,
    follow: false,
  },
};

type TrackingStage = {
  status: string;
  label: string;
  description: string;
  icon: typeof CheckCircle2;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStages(
  orderType: string
): TrackingStage[] {
  return [
    {
      status: "received",
      label: "Pedido recebido",
      description:
        "Recebemos seu pedido pelo cardápio.",
      icon: ShoppingBag,
    },
    {
      status: "confirmed",
      label: "Pedido confirmado",
      description:
        "A La’Bel confirmou e iniciou o preparo.",
      icon: PackageCheck,
    },
    orderType === "delivery"
      ? {
          status: "out_for_delivery",
          label: "Saiu para entrega",
          description:
            "Seu pedido está a caminho.",
          icon: Truck,
        }
      : {
          status: "ready_for_pickup",
          label: "Pronto para retirada",
          description:
            "Seu pedido já pode ser retirado na loja.",
          icon: ShoppingBag,
        },
    {
      status: "completed",
      label: "Pedido finalizado",
      description:
        orderType === "delivery"
          ? "Pedido entregue com sucesso."
          : "Pedido retirado com sucesso.",
      icon: CheckCircle2,
    },
  ];
}

function getStageIndex(
  status: string,
  stages: TrackingStage[]
) {
  if (
    status === "created" ||
    status === "sent_to_whatsapp"
  ) {
    return 0;
  }

  return Math.max(
    stages.findIndex(
      (stage) => stage.status === status
    ),
    0
  );
}

export default async function OrderTrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!uuidPattern.test(id)) {
    notFound();
  }

  const supabase =
    createSupabaseAdminClient();

  const { data: order, error } =
    await supabase
      .from("orders")
      .select(
        "id, order_number, order_type, status, created_at, completed_at"
      )
      .eq("id", id)
      .maybeSingle();

  if (error) {
    console.error(
      "Erro ao carregar acompanhamento do pedido:",
      error
    );

    throw new Error(
      "Não foi possível carregar o pedido."
    );
  }

  if (!order) {
    notFound();
  }

  const stages = getStages(
    order.order_type
  );

  const currentStageIndex =
    getStageIndex(order.status, stages);

  const cancelled =
    order.status === "cancelled";

  return (
    <main className="min-h-screen bg-[#FFFDF9] px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <header className="rounded-3xl bg-[#8B0000] px-6 py-7 text-center shadow-sm sm:px-10">
          <Link
            href="/"
            className="inline-flex"
            aria-label="Voltar ao cardápio da La’Bel"
          >
            <BrandLogo variant="order" eager />
          </Link>

          <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-[#F7E8DA]">
            Acompanhamento
          </p>

          <h1 className="mt-2 text-3xl font-bold text-white">
            Pedido #{order.order_number}
          </h1>

          <p className="mt-2 text-sm text-[#F7E8DA]">
            Criado em {formatDate(order.created_at)}
          </p>
        </header>

        <section className="mt-5 rounded-3xl border border-[#EEE6DF] bg-white p-5 shadow-sm sm:p-8">
          {cancelled ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
              <div className="flex items-start gap-3">
                <XCircle
                  size={23}
                  className="mt-0.5 shrink-0 text-red-600"
                />

                <div>
                  <h2 className="font-bold text-red-700">
                    Pedido cancelado
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-red-600">
                    Fale com a La’Bel pelo WhatsApp caso precise de ajuda.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-2xl bg-[#FFF7F5] p-4">
                <Clock3
                  size={21}
                  className="shrink-0 text-[#8B0000]"
                />

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8B0000]">
                    Status atual
                  </p>

                  <p className="mt-1 font-bold text-[#241B19]">
                    {
                      stages[currentStageIndex]
                        .label
                    }
                  </p>
                </div>
              </div>

              <div className="mt-7 space-y-1">
                {stages.map((stage, index) => {
                  const completed =
                    index < currentStageIndex;

                  const active =
                    index === currentStageIndex;

                  const StageIcon = stage.icon;

                  return (
                    <div
                      key={stage.status}
                      className="relative flex gap-4 pb-7 last:pb-0"
                    >
                      {index < stages.length - 1 && (
                        <div
                          className={`absolute left-[19px] top-10 h-[calc(100%-2rem)] w-0.5 ${
                            completed
                              ? "bg-[#8B0000]"
                              : "bg-[#EEE6DF]"
                          }`}
                        />
                      )}

                      <div
                        className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${
                          completed || active
                            ? "border-[#8B0000] bg-[#8B0000] text-white"
                            : "border-[#EEE6DF] bg-white text-[#A99E99]"
                        }`}
                      >
                        {completed ? (
                          <Check size={18} />
                        ) : (
                          <StageIcon size={18} />
                        )}
                      </div>

                      <div className="pt-1.5">
                        <p
                          className={`font-bold ${
                            completed || active
                              ? "text-[#241B19]"
                              : "text-[#A99E99]"
                          }`}
                        >
                          {stage.label}
                        </p>

                        <p
                          className={`mt-1 text-sm leading-5 ${
                            completed || active
                              ? "text-[#756A66]"
                              : "text-[#B8AEAA]"
                          }`}
                        >
                          {stage.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="mt-8 border-t border-[#EEE6DF] pt-5">
            <OrderTrackingRefresh />
          </div>
        </section>

        <div className="mt-5 text-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-[#D2B48C] px-5 py-3 text-sm font-bold text-[#8B0000] transition hover:bg-[#FFF7F5]"
          >
            Voltar ao cardápio
          </Link>
        </div>
      </div>
    </main>
  );
}
