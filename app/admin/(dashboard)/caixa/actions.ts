"use server";

import { revalidatePath } from "next/cache";

import { recordAdminAudit } from "@/lib/admin-audit";
import {
  requireAdminPermission,
  requireAnyAdminPermission,
} from "@/lib/admin-auth";
import {
  isPaymentMethod,
  type PaymentMethod,
} from "@/lib/payment-method";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CashierActionResult = {
  success: boolean;
  error?: string;
};

export type CashMovementType =
  | "supply"
  | "withdrawal"
  | "expense";

export type CashClosingResult =
  | {
      success: true;
      expectedCash: number;
      countedCash: number;
      difference: number;
    }
  | {
      success: false;
      error: string;
    };

export type CashierSaleInput = {
  cashSessionId: string;
  reference: string;
  customerName?: string;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  payments: Array<{
    method: PaymentMethod;
    amount: number;
    tenderedAmount?: number | null;
  }>;
};

export type ProductLossReason =
  | "expired"
  | "damaged"
  | "production"
  | "internal"
  | "other";

export type CashierSaleResult =
  | {
      success: true;
      orderId: string;
      orderNumber: number;
      total: number;
      change: number;
    }
  | {
      success: false;
      error: string;
    };

function revalidateCashier() {
  revalidatePath("/admin");
  revalidatePath("/admin/caixa");
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/faturamento");
  revalidatePath("/admin/relatorios");
  revalidatePath("/admin/atividades");
}

export async function openCashSession(
  formData: FormData
): Promise<CashierActionResult> {
  const access = await requireAdminPermission("cashier");
  const openingBalance = Number(
    formData.get("opening_balance")
  );

  if (
    !Number.isFinite(openingBalance) ||
    openingBalance < 0 ||
    openingBalance > 1000000
  ) {
    return {
      success: false,
      error: "Informe um saldo inicial válido.",
    };
  }

  const { data: existingSession } = await access.supabase
    .from("cash_sessions")
    .select("id")
    .eq("status", "open")
    .maybeSingle();

  if (existingSession) {
    return {
      success: false,
      error: "Já existe um caixa aberto.",
    };
  }

  const { data: session, error } = await access.supabase
    .from("cash_sessions")
    .insert({
      opening_balance: Number(openingBalance.toFixed(2)),
      opened_by: access.user.id,
    })
    .select("id")
    .single();

  if (error || !session) {
    return {
      success: false,
      error:
        error?.code === "23505"
          ? "Outro usuário acabou de abrir o caixa. Atualize a página."
          : "Não foi possível abrir o caixa.",
    };
  }

  await recordAdminAudit(access, {
    action: "created",
    entityType: "cash_session",
    entityId: session.id,
    summary: "Abriu o caixa",
    metadata: {
      opening_balance: Number(openingBalance.toFixed(2)),
    },
  });

  revalidateCashier();
  return { success: true };
}

export async function createCashierSale(
  input: CashierSaleInput
): Promise<CashierSaleResult> {
  const access = await requireAdminPermission("cashier");
  const customerName = String(
    input?.customerName ?? ""
  ).trim();
  const notes = String(input?.notes ?? "").trim();

  if (
    !uuidPattern.test(String(input?.cashSessionId ?? "")) ||
    !uuidPattern.test(String(input?.reference ?? ""))
  ) {
    return {
      success: false,
      error: "Não foi possível identificar o caixa ou a venda.",
    };
  }

  if (customerName.length > 100 || notes.length > 1000) {
    return {
      success: false,
      error: "Revise o nome do cliente e as observações.",
    };
  }

  if (
    !Array.isArray(input?.items) ||
    input.items.length < 1 ||
    input.items.length > 50 ||
    input.items.some(
      (item) =>
        !uuidPattern.test(String(item.productId ?? "")) ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 1000
    )
  ) {
    return {
      success: false,
      error: "Revise os itens da venda.",
    };
  }

  if (
    !Array.isArray(input.payments) ||
    input.payments.length < 1 ||
    input.payments.length > 4 ||
    input.payments.some(
      (payment) =>
        !isPaymentMethod(payment.method) ||
        !Number.isFinite(payment.amount) ||
        payment.amount <= 0
    ) ||
    new Set(input.payments.map((payment) => payment.method)).size !==
      input.payments.length
  ) {
    return {
      success: false,
      error: "Revise as formas de pagamento.",
    };
  }

  const normalizedPayments = input.payments.map((payment) => {
    const amount = Number(payment.amount.toFixed(2));
    const isCash = payment.method === "cash";
    const tenderedInput = Number(
      payment.tenderedAmount ?? amount
    );
    const tenderedAmount = isCash
      ? Number(tenderedInput.toFixed(2))
      : null;

    return {
      method: payment.method,
      amount,
      tenderedAmount,
      changeAmount: isCash
        ? Number((tenderedAmount! - amount).toFixed(2))
        : null,
    };
  });
  const invalidCashPayment = normalizedPayments.some(
    (payment) =>
      payment.method === "cash" &&
      (!Number.isFinite(payment.tenderedAmount) ||
        payment.tenderedAmount! < payment.amount)
  );

  if (invalidCashPayment) {
    return {
      success: false,
      error:
        "O valor recebido em dinheiro não pode ser menor que a parcela em dinheiro.",
    };
  }

  const change = normalizedPayments.reduce(
    (sum, payment) => sum + (payment.changeAmount ?? 0),
    0
  );
  const { data, error } = await access.supabase.rpc(
    "create_cashier_sale",
    {
      p_cash_session_id: input.cashSessionId,
      p_cashier_reference: input.reference,
      p_items: input.items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
      })),
      p_payments: normalizedPayments.map((payment) => ({
        method: payment.method,
        amount: payment.amount,
        tendered_amount: payment.tenderedAmount,
        change_amount: payment.changeAmount,
      })),
      p_customer_name: customerName || null,
      p_notes: notes || null,
    }
  );

  const sale = Array.isArray(data) ? data[0] : null;

  if (error || !sale) {
    console.error("Erro ao registrar venda no caixa:", error);
    return {
      success: false,
      error:
        error?.message.includes("não estão disponíveis")
          ? "Um ou mais produtos ficaram indisponíveis. Atualize o caixa."
          : error?.message.includes("não está aberto")
            ? "Este caixa não está mais aberto. Atualize a página."
            : "Não foi possível concluir a venda.",
    };
  }

  await recordAdminAudit(access, {
    action: "created",
    entityType: "cashier_sale",
    entityId: sale.order_id,
    summary: `Registrou a venda de caixa #${sale.order_number}`,
    metadata: {
      order_number: Number(sale.order_number),
      total: Number(sale.total),
      payment_method:
        normalizedPayments.length === 1
          ? normalizedPayments[0].method
          : "mixed",
      payments: normalizedPayments.map((payment) => ({
        method: payment.method,
        amount: payment.amount,
      })),
      change,
      item_count: input.items.reduce(
        (sum, item) => sum + item.quantity,
        0
      ),
    },
  });

  revalidateCashier();
  return {
    success: true,
    orderId: sale.order_id,
    orderNumber: Number(sale.order_number),
    total: Number(sale.total),
    change,
  };
}

export async function cancelCompletedOrder(
  formData: FormData
): Promise<CashierActionResult> {
  const access = await requireAnyAdminPermission([
    "cashier",
    "orders",
  ]);
  const orderId = String(formData.get("order_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!uuidPattern.test(orderId)) {
    return { success: false, error: "Pedido inválido." };
  }

  if (reason.length < 3 || reason.length > 300) {
    return {
      success: false,
      error: "Informe um motivo entre 3 e 300 caracteres.",
    };
  }

  const { data, error } = await access.supabase.rpc(
    "cancel_completed_order",
    {
      p_order_id: orderId,
      p_reason: reason,
    }
  );
  const cancellation = Array.isArray(data) ? data[0] : null;

  if (error || !cancellation) {
    console.error("Erro ao estornar venda:", error);
    return {
      success: false,
      error: error?.message.includes("Abra o caixa")
        ? "Abra o caixa antes de estornar esta venda."
        : error?.message.includes("dinheiro disponível")
          ? "Não há dinheiro suficiente no caixa para realizar o estorno."
          : error?.message.includes("já foi estornada")
            ? "Esta venda já foi estornada."
            : error?.message.includes("finalizados")
              ? "Somente pedidos finalizados podem ser estornados."
              : "Não foi possível cancelar e estornar a venda.",
    };
  }

  await recordAdminAudit(access, {
    action: "updated",
    entityType: "order_refund",
    entityId: orderId,
    summary: "Cancelou e estornou uma venda",
    metadata: {
      reason,
      refunded_total: Number(cancellation.refunded_total),
    },
  });

  revalidateCashier();
  revalidatePath(`/pedido/${orderId}`);
  return { success: true };
}

export async function createProductLoss(
  formData: FormData
): Promise<CashierActionResult> {
  const access = await requireAdminPermission("cashier");
  const cashSessionId = String(
    formData.get("cash_session_id") ?? ""
  );
  const reference = String(formData.get("loss_reference") ?? "");
  const productId = String(formData.get("product_id") ?? "");
  const quantity = Number(formData.get("quantity"));
  const reason = String(
    formData.get("reason") ?? ""
  ) as ProductLossReason;
  const notes = String(formData.get("notes") ?? "").trim();
  const allowedReasons = new Set<ProductLossReason>([
    "expired",
    "damaged",
    "production",
    "internal",
    "other",
  ]);

  if (
    !uuidPattern.test(cashSessionId) ||
    !uuidPattern.test(reference) ||
    !uuidPattern.test(productId)
  ) {
    return {
      success: false,
      error: "Não foi possível identificar o caixa, produto ou registro.",
    };
  }

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) {
    return { success: false, error: "Informe uma quantidade válida." };
  }

  if (!allowedReasons.has(reason) || notes.length > 300) {
    return { success: false, error: "Revise o motivo e as observações." };
  }

  const { data, error } = await access.supabase.rpc(
    "create_product_loss",
    {
      p_cash_session_id: cashSessionId,
      p_loss_reference: reference,
      p_product_id: productId,
      p_quantity: quantity,
      p_reason: reason,
      p_notes: notes || null,
    }
  );
  const loss = Array.isArray(data) ? data[0] : null;

  if (error || !loss) {
    console.error("Erro ao registrar perda:", error);
    return {
      success: false,
      error: error?.message.includes("não está aberto")
        ? "Este caixa não está mais aberto. Atualize a página."
        : "Não foi possível registrar a perda.",
    };
  }

  await recordAdminAudit(access, {
    action: "created",
    entityType: "product_loss",
    entityId: loss.loss_id,
    summary: "Registrou uma perda de produto",
    metadata: {
      product_id: productId,
      quantity,
      reason,
      estimated_value: Number(loss.estimated_value),
    },
  });

  revalidateCashier();
  return { success: true };
}

export async function createCashMovement(
  formData: FormData
): Promise<CashierActionResult> {
  const access = await requireAdminPermission("cashier");
  const cashSessionId = String(
    formData.get("cash_session_id") ?? ""
  );
  const reference = String(
    formData.get("movement_reference") ?? ""
  );
  const movementType = String(
    formData.get("movement_type") ?? ""
  ) as CashMovementType;
  const amount = Number(formData.get("amount"));
  const description = String(
    formData.get("description") ?? ""
  ).trim();
  const allowedTypes = new Set<CashMovementType>([
    "supply",
    "withdrawal",
    "expense",
  ]);

  if (
    !uuidPattern.test(cashSessionId) ||
    !uuidPattern.test(reference)
  ) {
    return {
      success: false,
      error: "Não foi possível identificar o caixa ou a movimentação.",
    };
  }

  if (!allowedTypes.has(movementType)) {
    return {
      success: false,
      error: "Escolha um tipo de movimentação válido.",
    };
  }

  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 1000000
  ) {
    return {
      success: false,
      error: "Informe um valor maior que zero.",
    };
  }

  if (description.length < 2 || description.length > 300) {
    return {
      success: false,
      error: "Informe uma descrição entre 2 e 300 caracteres.",
    };
  }

  const { data, error } = await access.supabase.rpc(
    "create_cash_movement",
    {
      p_cash_session_id: cashSessionId,
      p_movement_reference: reference,
      p_movement_type: movementType,
      p_amount: Number(amount.toFixed(2)),
      p_description: description,
    }
  );
  const movement = Array.isArray(data) ? data[0] : null;

  if (error || !movement) {
    console.error("Erro ao registrar movimentação de caixa:", error);
    return {
      success: false,
      error: error?.message.includes("não está aberto")
        ? "Este caixa não está mais aberto. Atualize a página."
        : error?.message.includes("maior que o dinheiro disponível")
          ? "A saída não pode ser maior que o dinheiro disponível no caixa."
          : "Não foi possível registrar a movimentação.",
    };
  }

  const movementLabels: Record<CashMovementType, string> = {
    supply: "suprimento",
    withdrawal: "sangria",
    expense: "despesa",
  };

  await recordAdminAudit(access, {
    action: "created",
    entityType: "cash_movement",
    entityId: movement.movement_id,
    summary: `Registrou ${movementLabels[movementType]} no caixa`,
    metadata: {
      movement_type: movementType,
      amount: Number(amount.toFixed(2)),
      description,
    },
  });

  revalidateCashier();
  return { success: true };
}

export async function closeCashSession(
  formData: FormData
): Promise<CashClosingResult> {
  const access = await requireAdminPermission("cashier");
  const cashSessionId = String(
    formData.get("cash_session_id") ?? ""
  );
  const countedCash = Number(
    formData.get("closing_cash_counted")
  );
  const notes = String(formData.get("notes") ?? "").trim();

  if (!uuidPattern.test(cashSessionId)) {
    return {
      success: false,
      error: "Não foi possível identificar o caixa.",
    };
  }

  if (
    !Number.isFinite(countedCash) ||
    countedCash < 0 ||
    countedCash > 1000000
  ) {
    return {
      success: false,
      error: "Informe o valor contado no caixa.",
    };
  }

  if (notes.length > 500) {
    return {
      success: false,
      error: "As observações devem ter no máximo 500 caracteres.",
    };
  }

  const { data, error } = await access.supabase.rpc(
    "close_cash_session",
    {
      p_cash_session_id: cashSessionId,
      p_closing_cash_counted: Number(countedCash.toFixed(2)),
      p_notes: notes || null,
    }
  );
  const closing = Array.isArray(data) ? data[0] : null;

  if (error || !closing) {
    console.error("Erro ao fechar caixa:", error);
    return {
      success: false,
      error: error?.message.includes("já foi fechado")
        ? "Este caixa já foi fechado. Atualize a página."
        : "Não foi possível fechar o caixa.",
    };
  }

  await recordAdminAudit(access, {
    action: "updated",
    entityType: "cash_session",
    entityId: cashSessionId,
    summary: "Fechou o caixa",
    metadata: {
      expected_cash: Number(closing.expected_cash),
      counted_cash: Number(closing.counted_cash),
      difference: Number(closing.difference),
      cash_sales: Number(closing.cash_sales),
      supplies: Number(closing.supplies),
      outflows: Number(closing.outflows),
    },
  });

  revalidateCashier();
  return {
    success: true,
    expectedCash: Number(closing.expected_cash),
    countedCash: Number(closing.counted_cash),
    difference: Number(closing.difference),
  };
}
