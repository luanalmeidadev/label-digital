import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, PencilLine } from "lucide-react";

import ManualPreorderForm from "@/components/admin/ManualPreorderForm";
import OrdersPanelTabs from "@/components/admin/OrdersPanelTabs";
import { getPreorderCatalog } from "@/lib/preorder-catalog-store";
import { getPreorderRequest } from "@/lib/preorder-request-store";

export const dynamic = "force-dynamic";

export default async function EditarEncomendaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [request, catalog] = await Promise.all([
    getPreorderRequest(id),
    getPreorderCatalog(),
  ]);

  if (!request) {
    notFound();
  }

  if (
    request.status === "completed" ||
    request.status === "cancelled"
  ) {
    redirect(`/admin/pedidos/encomendas/${request.id}`);
  }

  const products = catalog.flatMap((category) =>
    category.products.map((product) => ({
      name: product.name,
      prices: product.prices,
      flavors: product.flavors,
      minimumQuantity: product.minimumQuantity,
      allowedQuantities: product.allowedQuantities,
      quantityIncrement: product.quantityIncrement,
      quantityUnit: product.quantityUnit,
      priceBaseQuantity: product.priceBaseQuantity,
      maxFlavors: product.maxFlavors,
      flavorQuantityStep: product.flavorQuantityStep,
      categoryName: category.name,
    }))
  );

  return (
    <main className="p-5 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/admin/pedidos/encomendas/${request.id}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-[#8B0000] hover:underline"
        >
          <ArrowLeft size={16} />
          Voltar para os detalhes
        </Link>

        <div className="mt-4 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#8B0000]/10 text-[#8B0000]">
            <PencilLine size={22} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8B0000]">
              {request.requestNumber}
            </p>
            <h1 className="mt-1 text-3xl font-bold text-[#241B19]">
              Editar encomenda
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#756A66]">
              Atualize os detalhes combinados com o cliente sem alterar os pagamentos ou o andamento atual.
            </p>
          </div>
        </div>

        <OrdersPanelTabs active="preorders" />

        <div className="mt-8">
          <ManualPreorderForm
            products={products}
            request={request}
          />
        </div>
      </div>
    </main>
  );
}
