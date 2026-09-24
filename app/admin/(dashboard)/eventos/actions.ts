"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function toggleEventStatus(id: string, newStatus: boolean) {
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from("promotional_events")
    .update({ active: newStatus })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/eventos");
  return { success: true };
}

export async function deleteEvent(id: string) {
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from("promotional_events")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/eventos");
  return { success: true };
}
