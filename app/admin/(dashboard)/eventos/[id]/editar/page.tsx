import { createSupabaseServerClient } from "@/lib/supabase/server";
import EventForm from "../../EventForm";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

async function getEventAndCatalog(id: string) {
  const supabase = await createSupabaseServerClient();

  const { data: event, error: eventError } = await supabase
    .from("promotional_events")
    .select(`
      *,
      promotional_event_products (
        product_id,
        variant_id,
        promotional_price,
        availability_mode
      )
    `)
    .eq("id", id)
    .single();

  if (eventError || !event) {
    return { event: null, catalog: [] };
  }

  const { data: products, error: catalogError } = await supabase
    .from("products")
    .select(`
      id, name,
      product_variants ( id, name )
    `)
    .eq("active", true)
    .order("name", { ascending: true });

  if (catalogError) throw new Error("Não foi possível carregar o catálogo");

  const catalog = products.map(p => ({
    id: p.id,
    name: p.name,
    variants: p.product_variants.sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name))
  }));

  return { event, catalog };
}

export default async function EditarEventoPage({ params }: { params: { id: string } }) {
  const { event, catalog } = await getEventAndCatalog(params.id);

  if (!event) {
    notFound();
  }

  return (
    <main className="p-5 sm:p-8">
      <EventForm catalog={catalog} initialData={event} />
    </main>
  );
}
