"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type EventScheduleType = "weekly" | "period";
export type EventAvailabilityMode = "inherit" | "available_during_event" | "unavailable_during_event";

export interface EventProductPayload {
  product_id: string;
  variant_id: string | null;
  promotional_price: number | null;
  availability_mode: EventAvailabilityMode;
}

export interface CreateEventPayload {
  name: string;
  active: boolean;
  schedule_type: EventScheduleType;
  starts_at?: string | null;
  ends_at?: string | null;
  weekdays?: number[] | null;
  start_time?: string | null;
  end_time?: string | null;
  products: EventProductPayload[];
}

export interface UpdateEventPayload extends CreateEventPayload {
  id: string;
}

async function checkOverlap(supabase: ReturnType<typeof createSupabaseAdminClient>, payload: CreateEventPayload | UpdateEventPayload, eventIdToIgnore?: string) {
  let query = supabase
    .from("promotional_event_products")
    .select(`
      event_id,
      product_id,
      variant_id,
      products ( name ),
      product_variants ( name ),
      promotional_events!inner (
        id,
        active,
        schedule_type,
        starts_at,
        ends_at,
        weekdays,
        start_time,
        end_time
      )
    `)
    .eq("promotional_events.active", true);

  if (eventIdToIgnore) {
    query = query.neq("promotional_events.id", eventIdToIgnore);
  }

  const { data: existingProducts, error: checkError } = await query;
  if (checkError) throw checkError;

  for (const newProd of payload.products) {
    const overlapping = existingProducts?.filter((ep: { product_id: string; variant_id: string | null; promotional_events: unknown; products?: { name: string } | { name: string }[] | null; product_variants?: { name: string } | { name: string }[] | null }) => {
      if (ep.product_id !== newProd.product_id) return false;
      if (ep.variant_id !== newProd.variant_id) return false;

      const evt = ep.promotional_events as { schedule_type: string; starts_at: string | null; ends_at: string | null; weekdays: number[] | null; start_time: string | null; end_time: string | null; } | null;
      if (!evt) return false;

      if (payload.schedule_type === "period" && evt.schedule_type === "period") {
        const nS = new Date(payload.starts_at!).getTime();
        const nE = new Date(payload.ends_at!).getTime();
        const oS = new Date(evt.starts_at!).getTime();
        const oE = new Date(evt.ends_at!).getTime();
        return (nS < oE && nE > oS);
      }

      if (payload.schedule_type === "weekly" && evt.schedule_type === "weekly") {
        const sharedDays = payload.weekdays?.some(d => evt.weekdays?.includes(d));
        if (sharedDays) {
          return (payload.start_time! < evt.end_time! && payload.end_time! > evt.start_time!);
        }
        return false;
      }

      return true; // period x weekly cross overlap
    });

    if (overlapping && overlapping.length > 0) {
      const ep = overlapping[0];
      const prod = ep.products as unknown as { name: string } | { name: string }[] | null;
      const vari = ep.product_variants as unknown as { name: string } | { name: string }[] | null;
      const productName = Array.isArray(prod) ? prod[0]?.name : prod?.name;
      const variantName = Array.isArray(vari) ? vari[0]?.name : vari?.name;
      const prodName = productName || "Produto";
      const varName = variantName ? ` (${variantName})` : "";
      return { error: `${prodName}${varName} já participa de outro evento nesse período.` };
    }
  }

  return null;
}

export async function createPromotionalEvent(payload: CreateEventPayload) {
  const supabase = createSupabaseAdminClient();

  const overlapError = await checkOverlap(supabase, payload);
  if (overlapError) return overlapError;

  // Insert
  const { data: event, error: eventError } = await supabase
    .from("promotional_events")
    .insert({
      name: payload.name,
      active: payload.active,
      schedule_type: payload.schedule_type,
      starts_at: payload.starts_at,
      ends_at: payload.ends_at,
      weekdays: payload.weekdays,
      start_time: payload.start_time,
      end_time: payload.end_time,
    })
    .select()
    .single();

  if (eventError) return { error: eventError.message };

  if (payload.products.length > 0) {
    const { error: productsError } = await supabase
      .from("promotional_event_products")
      .insert(
        payload.products.map(p => ({
          event_id: event.id,
          product_id: p.product_id,
          variant_id: p.variant_id,
          promotional_price: p.promotional_price,
          availability_mode: p.availability_mode,
        }))
      );

    if (productsError) return { error: productsError.message };
  }

  revalidatePath("/admin/eventos");
  return { success: true };
}

export async function updatePromotionalEvent(payload: UpdateEventPayload) {
  const supabase = createSupabaseAdminClient();

  const overlapError = await checkOverlap(supabase, payload, payload.id);
  if (overlapError) return overlapError;

  const { error: eventError } = await supabase
    .from("promotional_events")
    .update({
      name: payload.name,
      active: payload.active,
      schedule_type: payload.schedule_type,
      starts_at: payload.starts_at,
      ends_at: payload.ends_at,
      weekdays: payload.weekdays,
      start_time: payload.start_time,
      end_time: payload.end_time,
      updated_at: new Date().toISOString()
    })
    .eq("id", payload.id);

  if (eventError) return { error: eventError.message };

  await supabase.from("promotional_event_products").delete().eq("event_id", payload.id);

  if (payload.products.length > 0) {
    const { error: productsError } = await supabase
      .from("promotional_event_products")
      .insert(
        payload.products.map(p => ({
          event_id: payload.id,
          product_id: p.product_id,
          variant_id: p.variant_id,
          promotional_price: p.promotional_price,
          availability_mode: p.availability_mode,
        }))
      );

    if (productsError) return { error: productsError.message };
  }

  revalidatePath("/admin/eventos");
  return { success: true };
}
