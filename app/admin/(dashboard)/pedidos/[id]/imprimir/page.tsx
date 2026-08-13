import { notFound } from "next/navigation";

import PrintOrderButton from "@/components/admin/PrintOrderButton";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

const statusLabels: Record<string, string> = {
  created: "Criado",
  sent_to_whatsapp: "Enviado ao WhatsApp",
  confirmed: "Confirmado",
  out_for_delivery: "Saiu para entrega",
  ready_for_pickup: "Pronto para retirada",
  completed: "Finalizado",
  cancelled: "Cancelado",
};

export default async function ImprimirPedidoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase =
    await createSupabaseServerClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      order_type,
      status,
      subtotal,
      delivery_fee,
      total,
      notes,
      created_at,

      customers (
        first_name,
        last_name,
        phone
      ),

      addresses (
        street,
        number,
        complement,
        neighborhood,
        city,
        reference
      ),

      order_items (
        id,
        product_name,
        quantity,
        unit_price
      )
    `)
    .eq("id", id)
    .single();

  if (error || !order) {
    notFound();
  }

  const customer = Array.isArray(order.customers)
    ? order.customers[0]
    : order.customers;

  const address = Array.isArray(order.addresses)
    ? order.addresses[0]
    : order.addresses;

  const items = order.order_items ?? [];

  return (
    <>
      {/*
        CSS específico da impressão.

        O restante do painel administrativo fica invisível
        e somente #print-area é enviado para a impressora.
      */}
      <style>
        {`
          @media print {
            @page {
              size: 80mm auto;
              margin: 4mm;
            }

            html,
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
            }

            body * {
              visibility: hidden;
            }

            #print-area,
            #print-area * {
              visibility: visible;
            }

            #print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 72mm !important;
              max-width: 72mm !important;
              margin: 0 !important;
              padding: 0 !important;
              font-size: 11px;
              line-height: 1.35;
              color: black !important;
              background: white !important;
            }

            #print-area .print-title {
              font-size: 16px !important;
            }

            #print-area .print-total {
              font-size: 15px !important;
            }

            #print-area section {
              break-inside: avoid;
            }
          }
        `}
      </style>

      <main className="min-h-screen bg-[#FFFDF9] p-4 sm:p-8 print:min-h-0 print:bg-white print:p-0">
        <div className="mx-auto max-w-[420px]">
          {/* AÇÕES */}
          <div className="mb-5 flex justify-end print:hidden">
            <PrintOrderButton autoPrint />
          </div>

          {/* COMANDA */}
          <div
            id="print-area"
            className="w-full bg-white p-4 text-black shadow-sm print:p-0 print:shadow-none"
          >
            {/* CABEÇALHO */}
            <header className="border-b border-dashed border-black pb-4 text-center">
              <h1 className="print-title text-xl font-bold uppercase">
                La&apos;bel Confeitaria
              </h1>

              <p className="mt-1 text-sm">
                Pedido #{order.order_number}
              </p>

              <p className="mt-1 text-sm font-bold uppercase">
                {statusLabels[order.status] ??
                  order.status}
              </p>
            </header>

            {/* DADOS DO PEDIDO */}
            <section className="border-b border-dashed border-black py-4">
              <div className="flex justify-between gap-4">
                <span className="font-bold">
                  Pedido
                </span>

                <span>
                  #{order.order_number}
                </span>
              </div>

              <div className="mt-2 flex justify-between gap-4">
                <span className="font-bold">
                  Data
                </span>

                <span className="text-right">
                  {formatDate(order.created_at)}
                </span>
              </div>

              <div className="mt-2 flex justify-between gap-4">
                <span className="font-bold">
                  Tipo
                </span>

                <span className="text-right">
                  {order.order_type === "delivery"
                    ? "Entrega"
                    : "Retirada no local"}
                </span>
              </div>
            </section>

            {/* CLIENTE */}
            <section className="border-b border-dashed border-black py-4">
              <h2 className="font-bold uppercase">
                Cliente
              </h2>

              <p className="mt-2">
                {customer
                  ? `${customer.first_name} ${customer.last_name}`
                  : "Cliente não identificado"}
              </p>

              {customer?.phone && (
                <p className="mt-1">
                  {customer.phone}
                </p>
              )}
            </section>

            {/* ENTREGA */}
            {order.order_type === "delivery" &&
              address && (
                <section className="border-b border-dashed border-black py-4">
                  <h2 className="font-bold uppercase">
                    Endereço de entrega
                  </h2>

                  <p className="mt-2">
                    {address.street},{" "}
                    {address.number}
                  </p>

                  {address.complement && (
                    <p>{address.complement}</p>
                  )}

                  <p>
                    {address.neighborhood} -{" "}
                    {address.city}
                  </p>

                  {address.reference && (
                    <p className="mt-2">
                      <strong>Referência:</strong>{" "}
                      {address.reference}
                    </p>
                  )}
                </section>
              )}

            {/* ITENS */}
            <section className="border-b border-dashed border-black py-4">
              <h2 className="font-bold uppercase">
                Itens do pedido
              </h2>

              <div className="mt-3 space-y-4">
                {items.map((item) => (
                  <div key={item.id}>
                    <div className="flex items-start justify-between gap-4">
                      <p className="font-bold">
                        {item.quantity}x{" "}
                        {item.product_name}
                      </p>

                      <p className="whitespace-nowrap font-bold">
                        {formatCurrency(
                          Number(item.unit_price) *
                            Number(item.quantity)
                        )}
                      </p>
                    </div>

                    <p className="mt-1 text-xs">
                      {formatCurrency(
                        Number(item.unit_price)
                      )}{" "}
                      cada
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* OBSERVAÇÕES */}
            {order.notes && (
              <section className="border-b border-dashed border-black py-4">
                <h2 className="font-bold uppercase">
                  Observações
                </h2>

                <p className="mt-2 whitespace-pre-wrap text-sm">
                  {order.notes}
                </p>
              </section>
            )}

            {/* VALORES */}
            <section className="py-4">
              <div className="flex justify-between gap-4">
                <span>Subtotal</span>

                <span>
                  {formatCurrency(
                    Number(order.subtotal)
                  )}
                </span>
              </div>

              {order.order_type === "delivery" && (
                <div className="mt-2 flex justify-between gap-4">
                  <span>Taxa de entrega</span>

                  <span>
                    {formatCurrency(
                      Number(order.delivery_fee)
                    )}
                  </span>
                </div>
              )}

              <div className="print-total mt-4 flex justify-between gap-4 border-t border-black pt-3 text-lg font-bold">
                <span>TOTAL</span>

                <span>
                  {formatCurrency(
                    Number(order.total)
                  )}
                </span>
              </div>
            </section>

            {/* RODAPÉ */}
            <footer className="border-t border-dashed border-black pt-4 text-center text-xs">
              <p className="font-bold">
                La&apos;bel Confeitaria
              </p>

              <p className="mt-1">
                Pedido #{order.order_number}
              </p>
            </footer>
          </div>
        </div>
      </main>
    </>
  );
}