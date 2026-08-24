"use server";

import { revalidatePath } from "next/cache";

import { recordAdminAudit } from "@/lib/admin-audit";
import { requireAdminPermission } from "@/lib/admin-auth";
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

export type CashierSaleInput = {
  cashSessionId: string;
  reference: string;
  customerName?: string;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  payment: {
    method: PaymentMethod;
    amount: number;
    tenderedAmount?: number | null;
  };
};

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
    !input.payment ||
    !isPaymentMethod(input.payment.method) ||
    !Number.isFinite(input.payment.amount) ||
    input.payment.amount <= 0
  ) {
    return {
      success: false,
      error: "Escolha uma forma de pagamento válida.",
    };
  }

  const amount = Number(input.payment.amount.toFixed(2));
  const isCash = input.payment.method === "cash";
  const tenderedInput = Number(
    input.payment.tenderedAmount ?? amount
  );
  const tenderedAmount = isCash
    ? Number(tenderedInput.toFixed(2))
    : null;

  if (
    isCash &&
    (!Number.isFinite(tenderedAmount) ||
      tenderedAmount! < amount)
  ) {
    return {
      success: false,
      error: "O valor recebido em dinheiro não pode ser menor que o total.",
    };
  }

  const change = isCash
    ? Number((tenderedAmount! - amount).toFixed(2))
    : 0;
  const { data, error } = await access.supabase.rpc(
    "create_cashier_sale",
    {
      p_cash_session_id: input.cashSessionId,
      p_cashier_reference: input.reference,
      p_items: input.items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
      })),
      p_payments: [
        {
          method: input.payment.method,
          amount,
          tendered_amount: tenderedAmount,
          change_amount: isCash ? change : null,
        },
      ],
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
      payment_method: input.payment.method,
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
