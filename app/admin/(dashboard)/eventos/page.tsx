import { CalendarRange, Plus } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import EventListItem from "./EventListItem";

export const dynamic = "force-dynamic";

function getEventStatus(event: { active: boolean; schedule_type: string; starts_at: string | null; ends_at: string | null; weekdays: number[] | null; start_time: string | null; end_time: string | null; }) {
  if (!event.active) return "Inativo";

  const now = new Date();
  const utcNow = now.getTime();

  if (event.schedule_type === "period") {
    if (event.starts_at && event.ends_at) {
      const startsAt = new Date(event.starts_at).getTime();
      const endsAt = new Date(event.ends_at).getTime();

      if (utcNow < startsAt) return "Agendado";
      if (utcNow > endsAt) return "Encerrado";
      return "Ativo agora";
    }
  }

  if (event.schedule_type === "weekly") {
    if (!event.weekdays || event.weekdays.length === 0) return "Inativo";

    // Simplification for list display: check if today's day is in weekdays and time is within bounds
    // Note: weekly uses local timezone in postgres, so 'now' in local time needs to be compared.
    // For simplicity, we just mark as active or inactive based on `active` flag for weekly,
    // or calculate based on local time. Let's do a basic check.
    const localHour = now.getHours().toString().padStart(2, "0") + ":" + now.getMinutes().toString().padStart(2, "0") + ":00";
    const today = now.getDay();

    if (event.weekdays.includes(today)) {
      if (event.start_time && event.end_time) {
        if (localHour >= event.start_time && localHour <= event.end_time) {
          return "Ativo agora";
        }
      }
    }
    return "Agendado";
  }

  return "Inativo";
}

async function getEventsData() {
  const supabase = await createSupabaseServerClient();

  const { data: events, error } = await supabase
    .from("promotional_events")
    .select(`
      id, name, active, schedule_type, starts_at, ends_at, weekdays, start_time, end_time, created_at,
      promotional_event_products ( count )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Não foi possível carregar os eventos.");
  }

  return events?.map(e => ({
    ...e,
    status: getEventStatus(e),
    itemsCount: e.promotional_event_products[0]?.count ?? 0
  }));
}

export default async function EventosPage() {
  const events = await getEventsData();

  return (
    <main className="p-5 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-primary">
              Marketing
            </p>
            <h1 className="mt-2 text-3xl font-bold text-brand-foreground">
              Eventos Promocionais
            </h1>
            <p className="mt-2 text-sm text-brand-muted-foreground">
              Gerencie promoções, cardápios temporários e campanhas agendadas.
            </p>
          </div>

          <Link
            href="/admin/eventos/novo"
            className="flex items-center justify-center gap-2 rounded-2xl bg-brand-primary px-6 py-3 font-bold text-white transition-colors hover:bg-brand-primary/90"
          >
            <Plus size={20} />
            Novo Evento
          </Link>
        </div>

        <section className="mt-8 overflow-hidden rounded-3xl border border-brand-border bg-white shadow-sm">
          <div className="border-b border-brand-border p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
                <CalendarRange size={20} />
              </div>
              <div>
                <h2 className="font-bold text-brand-foreground">
                  Eventos cadastrados
                </h2>
                <p className="text-xs text-brand-muted-foreground">
                  {events?.length ?? 0} evento(s)
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-brand-border">
            {events?.map((event) => (
              <EventListItem key={event.id} event={event} />
            ))}

            {(!events || events.length === 0) && (
              <div className="p-8 text-center text-brand-muted-foreground">
                Nenhum evento promocional cadastrado.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
