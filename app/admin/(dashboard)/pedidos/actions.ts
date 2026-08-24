"use server";

import { revalidatePath } from "next/cache";

import { requireAnyAdminPermission } from "@/lib/admin-auth";
import { hasAdminPermission } from "@/lib/admin-permissions";
import {
  isAllowedOrderStatusTransition,
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

function revalidateOrders(orderId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/entregas");
  revalidatePath("/admin/caixa");
  revalidatePath("/admin/faturamento");
  revalidatePath(`/pedido/${orderId}`);
}

function statusError(
  error: string
): UpdateOrderStatusResult {
  return {
    notification: null,
    error,
  };
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
    return statusError("Pedido inválido.");
  }

  if (!allowedStatuses.includes(status)) {
    return statusError("Status inválido.");
  }

  const { data: order } = await supabase
    .from("orders")
    .select(`
      id,
      order_number,
      status,
      order_type,
      sales_channel,
      customers (
        phone
      )
    `)
    .eq("id", id)
    .single();

  if (!order) {
    return statusError(
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
    return statusError(
      "Você não tem permissão para realizar esta alteração."
    );
  }

  if (order.status === "completed") {
    return statusError(
      "Pedidos finalizados não podem ter o status alterado."
    );
  }

  if (order.status === "cancelled") {
    return statusError(
      "Pedidos cancelados não podem ter o status alterado."
    );
  }

  if (
    !isAllowedOrderStatusTransition(
      order.status,
      status,
      order.order_type
    )
  ) {
    return statusError(
      "Essa alteração não corresponde à próxima etapa do pedido."
    );
  }

  if (
    status === "out_for_delivery" &&
    order.order_type !== "delivery"
  ) {
    return statusError(
      "Somente pedidos de entrega podem sair para entrega."
    );
  }

  if (
    status === "ready_for_pickup" &&
    order.order_type !== "pickup"
  ) {
    return statusError(
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

  const { error } =
    status === "completed" &&
    order.sales_channel === "online"
      ? await supabase.rpc("complete_online_order", {
          p_order_id: id,
        })
      : await supabase
          .from("orders")
          .update(updateData)
          .eq("id", id);

  if (error) {
    console.error(
      "Erro ao atualizar status do pedido:",
      error
    );

    if (
      error.message.includes(
        "Abra o caixa antes de receber um pedido em dinheiro"
      )
    ) {
      return statusError(
        "Abra o caixa antes de finalizar este pedido em dinheiro."
      );
    }

    return statusError(
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
    error: null,
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
