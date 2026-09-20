import { createSupabaseServerClient } from "@/lib/supabase/server";
import EventForm from "../EventForm";

export const dynamic = "force-dynamic";

async function getCatalog() {
  const supabase = await createSupabaseServerClient();
  const { data: products, error } = await supabase
    .from("products")
    .select(`
      id, name,
      product_variants ( id, name )
    `)
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) throw new Error("Não foi possível carregar o catálogo");

  return products.map(p => ({
    id: p.id,
    name: p.name,
    variants: p.product_variants.sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name))
  }));
}

export default async function NovoEventoPage() {
  const catalog = await getCatalog();

  return (
    <main className="p-5 sm:p-8">
      <EventForm catalog={catalog} />
    </main>
  );
}
