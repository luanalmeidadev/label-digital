"use server";

import { revalidatePath } from "next/cache";

import { requireAnyAdminPermission } from "@/lib/admin-auth";
import { hasAdminPermission } from "@/lib/admin-permissions";
import {
  isNotifiableOrderStatus,
  type UpdateOrderStatusResult,
} from "@/lib/order-status";

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
  return requireAnyAdminPermission([
    "orders",
    "deliveries",
  ]);
}

function isAllowedStatusTransition(
  currentStatus: string,
  nextStatus: string,
  orderType: string
) {
  if (nextStatus === "cancelled") {
    return true;
  }

  if (currentStatus === "created") {
    return nextStatus === "sent_to_whatsapp";
  }

  if (currentStatus === "sent_to_whatsapp") {
    return nextStatus === "confirmed";
  }

  if (currentStatus === "confirmed") {
    return orderType === "delivery"
      ? nextStatus === "out_for_delivery"
      : nextStatus === "ready_for_pickup";
  }

  return (
    (currentStatus === "out_for_delivery" ||
      currentStatus === "ready_for_pickup") &&
    nextStatus === "completed"
  );
}

function revalidateOrders(orderId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/entregas");
  revalidatePath(`/pedido/${orderId}`);
}

export async function updateOrderStatus(
  formData: FormData
): Promise<UpdateOrderStatusResult> {
  const access = await ensureAdmin();
  const supabase = access.supabase;
  const canManageOrders = hasAdminPermission(
    access.permissions,
    "orders"
  );

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
    .select(`
      id,
      order_number,
      status,
      order_type,
      customers (
        phone
      )
    `)
    .eq("id", id)
    .single();

  if (!order) {
    throw new Error(
      "Pedido não encontrado."
    );
  }

  if (
    !canManageOrders &&
    (order.order_type !== "delivery" ||
      ![
        "out_for_delivery",
        "completed",
      ].includes(status))
  ) {
    throw new Error(
      "Você não tem permissão para realizar esta alteração."
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
    !isAllowedStatusTransition(
      order.status,
      status,
      order.order_type
    )
  ) {
    throw new Error(
      "Essa alteração não corresponde à próxima etapa do pedido."
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
    updateData.completed_at =
      new Date().toISOString();
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

  const customer = Array.isArray(
    order.customers
  )
    ? order.customers[0]
    : order.customers;

  revalidateOrders(order.id);

  return {
    notification:
      isNotifiableOrderStatus(status) &&
      customer?.phone
        ? {
            orderId: order.id,
            orderNumber: Number(
              order.order_number
            ),
            phone: customer.phone,
            status,
          }
        : null,
  };
}
