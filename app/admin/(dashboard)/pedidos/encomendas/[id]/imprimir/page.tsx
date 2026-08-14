import { notFound } from "next/navigation";

import PrintOrderButton from "@/components/admin/PrintOrderButton";
import {
  formatPreorderCurrency,
  getPreorderBalance,
  getPreorderPaymentStatus,
  preorderPaymentStatusLabels,
  preorderRequestStatusLabels,
} from "@/lib/preorder-request";
import { getPreorderRequest } from "@/lib/preorder-request-store";

export const dynamic = "force-dynamic";

function formatDesiredDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function ImprimirEncomendaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const request = await getPreorderRequest(id);

  if (!request) {
    notFound();
  }

  const paymentStatus =
    getPreorderPaymentStatus(request);

  return (
    <>
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
              color: black !important;
              background: white !important;
              font-size: 11px;
              line-height: 1.35;
            }

            #print-area .print-title {
              font-size: 16px !important;
            }

            #print-area .print-date {
              font-size: 14px !important;
            }

            #print-area section {
              break-inside: avoid;
            }
          }
        `}
      </style>

      <main className="min-h-screen bg-[#FFFDF9] p-4 sm:p-8 print:min-h-0 print:bg-white print:p-0">
        <div className="mx-auto max-w-[420px]">
          <div className="mb-5 flex justify-end print:hidden">
            <PrintOrderButton autoPrint />
          </div>

          <div
            id="print-area"
            className="w-full bg-white p-4 text-black shadow-sm print:p-0 print:shadow-none"
          >
            <header className="border-b border-dashed border-black pb-4 text-center">
              <h1 className="print-title text-xl font-bold uppercase">
                La&apos;Bel Confeitaria
              </h1>
              <p className="mt-1 text-sm font-bold uppercase">Comanda de encomenda</p>
              <p className="mt-1 text-sm">{request.requestNumber}</p>
              <p className="mt-1 text-xs font-bold uppercase">
                {preorderRequestStatusLabels[request.status]}
              </p>
            </header>

            <section className="border-b border-dashed border-black py-4 text-center">
              <p className="text-xs font-bold uppercase">Data desejada</p>
              <p className="print-date mt-1 text-base font-bold capitalize">
                {formatDesiredDate(request.desiredDate)}
              </p>
              <p className="mt-2 text-sm font-bold uppercase">
                {request.fulfillmentType === "delivery"
                  ? "Entrega"
                  : "Retirada na loja"}
              </p>
            </section>

            <section className="border-b border-dashed border-black py-4">
              <h2 className="font-bold uppercase">Cliente</h2>
              <p className="mt-2 font-bold">{request.customerName}</p>
              <p className="mt-1">{request.customerPhone}</p>
              {request.fulfillmentType === "delivery" && (
                <div className="mt-3">
                  <p className="font-bold uppercase">Endereço</p>
                  <p className="mt-1 whitespace-pre-wrap">{request.deliveryAddress}</p>
                </div>
              )}
            </section>

            <section className="border-b border-dashed border-black py-4">
              <h2 className="font-bold uppercase">Pagamento</h2>
              <div className="mt-2 flex justify-between gap-4">
                <span>Situação</span>
                <span className="text-right font-bold">
                  {preorderPaymentStatusLabels[paymentStatus]}
                </span>
              </div>
              <div className="mt-2 flex justify-between gap-4">
                <span>Valor pago</span>
                <span className="font-bold">
                  {formatPreorderCurrency(request.amountPaid)}
                </span>
              </div>
              <div className="mt-2 flex justify-between gap-4">
                <span>Saldo</span>
                <span className="font-bold">
                  {formatPreorderCurrency(getPreorderBalance(request))}
                </span>
              </div>
            </section>

            <section className="border-b border-dashed border-black py-4">
              <h2 className="font-bold uppercase">Produto</h2>
              <p className="mt-2 text-sm font-bold">{request.productName}</p>
              {request.optionLabel && (
                <div className="mt-3 flex justify-between gap-4">
                  <span>{request.optionLabel}</span>
                  <span className="text-right font-bold">
                    {request.optionPrice || "A confirmar"}
                  </span>
                </div>
              )}
              <div className="mt-3 flex justify-between gap-4">
                <span className="font-bold">Quantidade</span>
                <span className="text-right font-bold">
                  {request.quantity} {request.quantityUnit}
                </span>
              </div>
              {request.flavors.length > 0 && (
                <div className="mt-3">
                  <p className="font-bold">Sabores</p>
                  <p className="mt-1">{request.flavors.join(", ")}</p>
                </div>
              )}
              <div className="mt-4 flex justify-between gap-4 border-t border-black pt-3 text-base font-bold">
                <span>TOTAL</span>
                <span>
                  {request.total > 0
                    ? formatPreorderCurrency(request.total)
                    : "A DEFINIR"}
                </span>
              </div>
            </section>

            <section className="border-b border-dashed border-black py-4">
              <h2 className="font-bold uppercase">Observações</h2>
              <p className="mt-2 whitespace-pre-wrap">
                {request.notes || "Nenhuma observação informada."}
              </p>
            </section>

            <section className="border-b border-dashed border-black py-4">
              <div className="flex justify-between gap-4">
                <span className="font-bold">Solicitada em</span>
                <span className="text-right">{formatDateTime(request.createdAt)}</span>
              </div>
              <p className="mt-3 text-center text-xs font-bold">
                Reserva confirmada após pagamento de 50%
              </p>
            </section>

            <footer className="pt-4 text-center text-xs">
              <p className="font-bold">La&apos;Bel Confeitaria</p>
              <p className="mt-1">{request.requestNumber}</p>
            </footer>
          </div>
        </div>
      </main>
    </>
  );
}
