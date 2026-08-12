"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedStatuses = [
  "created",
  "sent_to_whatsapp",
  "confirmed",
  "out_for_delivery",
  "ready_for_pickup",
  "completed",
  "cancelled",
];

async function ensureAdmin() {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: admin } = await supabase
    .from("admin_profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!admin) {
    throw new Error(
      "Acesso não autorizado."
    );
  }

  return supabase;
}

function revalidateOrders() {
  revalidatePath("/admin");
  revalidatePath("/admin/pedidos");
}

export async function updateOrderStatus(
  formData: FormData
) {
  const supabase =
    await ensureAdmin();

  const id = String(
    formData.get("id") ?? ""
  );

  const status = String(
    formData.get("status") ?? ""
  );

  if (!id) {
    throw new Error(
      "Pedido inválido."
    );
  }

  if (!allowedStatuses.includes(status)) {
    throw new Error(
      "Status inválido."
    );
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, order_type")
    .eq("id", id)
    .single();

  if (!order) {
    throw new Error(
      "Pedido não encontrado."
    );
  }

  if (order.status === "completed") {
    throw new Error(
      "Pedidos finalizados não podem ter o status alterado."
    );
  }

  if (order.status === "cancelled") {
    throw new Error(
      "Pedidos cancelados não podem ter o status alterado."
    );
  }

  if (
    status === "out_for_delivery" &&
    order.order_type !== "delivery"
  ) {
    throw new Error(
      "Somente pedidos de entrega podem sair para entrega."
    );
  }

  if (
    status === "ready_for_pickup" &&
    order.order_type !== "pickup"
  ) {
    throw new Error(
      "Somente pedidos de retirada podem ficar prontos para retirada."
    );
  }

  const updateData: {
  status: string;
  completed_at?: string | null;
} = {
  status,
};

if (status === "completed") {
  updateData.completed_at = new Date().toISOString();
} else {
  updateData.completed_at = null;
}

const { error } = await supabase
  .from("orders")
  .update(updateData)
  .eq("id", id);

  if (error) {
    throw new Error(
      "Não foi possível atualizar o status do pedido."
    );
  }

  revalidateOrders();
}