"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminPermission } from "@/lib/admin-auth";
import { recordAdminAudit } from "@/lib/admin-audit";
import { getPreorderCatalog } from "@/lib/preorder-catalog-store";
import {
  formatPreorderCurrency,
  getPreorderMaxFlavors,
  isAllowedPreorderQuantity,
  isPreorderRequestStatus,
  parsePreorderPrice,
  type PreorderRequest,
  type PreorderRequestStatus,
} from "@/lib/preorder-request";
import {
  getPreorderRequest,
  savePreorderRequest,
} from "@/lib/preorder-request-store";
import { normalizeWhatsAppPhone } from "@/lib/order-status";
import { reserveNextPreorderNumber } from "@/lib/sales-number-store";

export type ManualPreorderFormState = {
  error: string;
};

export type EditPreorderFormState = {
  error: string;
};

async function requireAdmin() {
  return requireAdminPermission("orders");
}

function revalidateRequest(id: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/pedidos/encomendas");
  revalidatePath("/admin/pedidos/encomendas/calendario");
  revalidatePath("/admin/faturamento");
  revalidatePath(
    `/admin/pedidos/encomendas/${id}`
  );
  revalidatePath(
    `/admin/pedidos/encomendas/${id}/imprimir`
  );
}

export async function updatePreorderPayment(
  formData: FormData
) {
  const access = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const paymentAction = String(
    formData.get("payment_action") ?? "custom"
  );
  const requestedAmountPaid = Number(
    formData.get("amount_paid")
  );

  if (
    !id ||
    !["custom", "deposit", "paid"].includes(
      paymentAction
    ) ||
    (paymentAction === "custom" &&
      (!Number.isFinite(requestedAmountPaid) ||
        requestedAmountPaid < 0 ||
        requestedAmountPaid > 1000000))
  ) {
    throw new Error("Informe um valor pago válido.");
  }

  const request = await getPreorderRequest(id);

  if (!request) {
    throw new Error("Encomenda não encontrada.");
  }

  if (request.total <= 0) {
    throw new Error(
      "Defina o valor total antes de registrar pagamentos."
    );
  }

  const amountPaid =
    paymentAction === "deposit"
      ? Number((request.total * 0.5).toFixed(2))
      : paymentAction === "paid"
        ? request.total
        : requestedAmountPaid;

  if (amountPaid > request.total) {
    throw new Error(
      "O valor pago não pode ser maior que o total da encomenda."
    );
  }

  const previousAmountPaid = request.amountPaid;
  request.amountPaid = amountPaid;
  request.updatedAt = new Date().toISOString();

  await savePreorderRequest(request);
  await recordAdminAudit(access, {
    action: "updated",
    entityType: "preorder",
    entityId: request.id,
    summary: `Atualizou o pagamento da encomenda #${request.requestNumber}`,
    metadata: {
      amount_paid: {
        before: previousAmountPaid,
        after: amountPaid,
      },
      total: request.total,
    },
  });
  revalidateRequest(request.id);
}

function parseFlavors(value: FormDataEntryValue | null) {
  try {
    const parsed: unknown = JSON.parse(
      String(value ?? "[]")
    );

    return Array.isArray(parsed)
      ? parsed
          .map((flavor) => String(flavor).trim())
          .filter(Boolean)
      : null;
  } catch {
    return null;
  }
}

function getSaoPauloDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function createManualPreorderRequest(
  _previousState: ManualPreorderFormState,
  formData: FormData
): Promise<ManualPreorderFormState> {
  const access = await requireAdmin();

  const customerName = String(
    formData.get("customer_name") ?? ""
  ).trim();
  const customerPhone = normalizeWhatsAppPhone(
    String(formData.get("customer_phone") ?? "")
  );
  const selectedProductName = String(
    formData.get("product_name") ?? ""
  ).trim();
  const customProductName = String(
    formData.get("custom_product_name") ?? ""
  ).trim();
  const selectedOptionLabel = String(
    formData.get("option_label") ?? ""
  ).trim();
  const customOptionLabel = String(
    formData.get("custom_option_label") ?? ""
  ).trim();
  const customUnitPrice = Number(
    formData.get("custom_unit_price")
  );
  const quantity = Number(formData.get("quantity"));
  const total = Number(formData.get("total"));
  const amountPaid = Number(
    formData.get("amount_paid") ?? 0
  );
  const desiredDate = String(
    formData.get("desired_date") ?? ""
  );
  const fulfillmentType = String(
    formData.get("fulfillment_type") ?? ""
  );
  const deliveryAddress = String(
    formData.get("delivery_address") ?? ""
  ).trim();
  const notes = String(
    formData.get("notes") ?? ""
  ).trim();
  const initialStatus = String(
    formData.get("status") ?? "confirmed"
  );
  const flavors = parseFlavors(formData.get("flavors"));

  if (customerName.length < 2 || customerName.length > 100) {
    return { error: "Informe o nome do cliente." };
  }

  if (customerPhone.length < 12 || customerPhone.length > 13) {
    return { error: "Informe um WhatsApp válido." };
  }

  if (
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 10000
  ) {
    return { error: "Informe uma quantidade válida." };
  }

  if (!Number.isFinite(total) || total <= 0 || total > 1000000) {
    return { error: "Informe o valor total da encomenda." };
  }

  if (
    !Number.isFinite(amountPaid) ||
    amountPaid < 0 ||
    amountPaid > total
  ) {
    return {
      error:
        "O valor recebido deve ficar entre zero e o total da encomenda.",
    };
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(desiredDate) ||
    desiredDate < getSaoPauloDate()
  ) {
    return { error: "Informe uma data válida para a encomenda." };
  }

  if (!['new', 'confirmed'].includes(initialStatus)) {
    return { error: "Escolha uma situação inicial válida." };
  }

  if (!['pickup', 'delivery'].includes(fulfillmentType)) {
    return { error: "Escolha retirada ou entrega." };
  }

  if (
    fulfillmentType === "delivery" &&
    (deliveryAddress.length < 8 || deliveryAddress.length > 300)
  ) {
    return { error: "Informe o endereço de entrega." };
  }

  if (!flavors || notes.length > 1000) {
    return { error: "Revise os detalhes da encomenda." };
  }

  const catalog = await getPreorderCatalog();
  const product = catalog
    .flatMap((category) => category.products)
    .find((item) => item.name === selectedProductName);
  const isCustom = selectedProductName === "__custom__";

  if (!product && !isCustom) {
    return { error: "Escolha um produto válido." };
  }

  const option = product?.prices.find(
    (price) => price.label === selectedOptionLabel
  );

  if (product && !option) {
    return { error: "Escolha um tamanho ou opção válida." };
  }

  if (
    product &&
    (!isAllowedPreorderQuantity(product, quantity) ||
      flavors.some(
        (flavor) => !product.flavors?.includes(flavor)
      ) ||
      (product.flavors?.length && flavors.length === 0) ||
      flavors.length >
        getPreorderMaxFlavors(product, quantity))
  ) {
    return { error: "Revise a quantidade e os sabores escolhidos." };
  }

  if (
    isCustom &&
    (customProductName.length < 2 ||
      customProductName.length > 120 ||
      customOptionLabel.length > 120 ||
      !Number.isFinite(customUnitPrice) ||
      customUnitPrice <= 0)
  ) {
    return { error: "Preencha os dados do produto personalizado." };
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const requestNumber =
    await reserveNextPreorderNumber();
  const unitPrice = isCustom
    ? customUnitPrice
    : parsePreorderPrice(option?.value ?? "");
  const request: PreorderRequest = {
    id,
    requestNumber,
    status: initialStatus as "new" | "confirmed",
    createdAt: now,
    updatedAt: now,
    desiredDate,
    customerName,
    customerPhone,
    productName: isCustom ? customProductName : product!.name,
    optionLabel: isCustom
      ? customOptionLabel || "Personalizada"
      : option!.label,
    optionPrice: isCustom
      ? formatPreorderCurrency(unitPrice)
      : option!.value,
    total,
    amountPaid,
    quantity,
    quantityUnit: isCustom
      ? "item(ns)"
      : product!.quantityUnit ?? "item(ns)",
    flavors,
    fulfillmentType: fulfillmentType as "pickup" | "delivery",
    deliveryAddress:
      fulfillmentType === "delivery" ? deliveryAddress : "",
    notes,
    completedAt: null,
    source: "manual",
  };

  try {
    await savePreorderRequest(request);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível cadastrar a encomenda.",
    };
  }

  await recordAdminAudit(access, {
    action: "created",
    entityType: "preorder",
    entityId: request.id,
    summary: `Criou manualmente a encomenda #${request.requestNumber}`,
    metadata: {
      request_number: request.requestNumber,
      product_name: request.productName,
      option_label: request.optionLabel,
      quantity: request.quantity,
      total: request.total,
      amount_paid: request.amountPaid,
      desired_date: request.desiredDate,
      fulfillment_type: request.fulfillmentType,
      status: request.status,
    },
  });

  revalidateRequest(id);
  redirect(`/admin/pedidos/encomendas/${id}`);
}

export async function updatePreorderRequestDetails(
  _previousState: EditPreorderFormState,
  formData: FormData
): Promise<EditPreorderFormState> {
  const access = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const customerName = String(
    formData.get("customer_name") ?? ""
  ).trim();
  const customerPhone = normalizeWhatsAppPhone(
    String(formData.get("customer_phone") ?? "")
  );
  const selectedProductName = String(
    formData.get("product_name") ?? ""
  ).trim();
  const customProductName = String(
    formData.get("custom_product_name") ?? ""
  ).trim();
  const selectedOptionLabel = String(
    formData.get("option_label") ?? ""
  ).trim();
  const customOptionLabel = String(
    formData.get("custom_option_label") ?? ""
  ).trim();
  const customUnitPrice = Number(
    formData.get("custom_unit_price")
  );
  const quantity = Number(formData.get("quantity"));
  const total = Number(formData.get("total"));
  const desiredDate = String(
    formData.get("desired_date") ?? ""
  );
  const fulfillmentType = String(
    formData.get("fulfillment_type") ?? ""
  );
  const deliveryAddress = String(
    formData.get("delivery_address") ?? ""
  ).trim();
  const notes = String(
    formData.get("notes") ?? ""
  ).trim();
  const flavors = parseFlavors(formData.get("flavors"));

  const request = await getPreorderRequest(id);

  if (!request) {
    return { error: "Encomenda não encontrada." };
  }

  if (
    request.status === "completed" ||
    request.status === "cancelled"
  ) {
    return {
      error:
        "Encomendas finalizadas ou canceladas não podem ser editadas.",
    };
  }

  if (customerName.length < 2 || customerName.length > 100) {
    return { error: "Informe o nome do cliente." };
  }

  if (customerPhone.length < 12 || customerPhone.length > 13) {
    return { error: "Informe um WhatsApp válido." };
  }

  if (
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 10000
  ) {
    return { error: "Informe uma quantidade válida." };
  }

  if (
    !Number.isFinite(total) ||
    total <= 0 ||
    total > 1000000 ||
    total < request.amountPaid
  ) {
    return {
      error:
        "O total deve ser válido e não pode ser menor que o valor já pago.",
    };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(desiredDate)) {
    return { error: "Informe uma data válida." };
  }

  if (!["pickup", "delivery"].includes(fulfillmentType)) {
    return { error: "Escolha retirada ou entrega." };
  }

  if (
    fulfillmentType === "delivery" &&
    (deliveryAddress.length < 8 || deliveryAddress.length > 300)
  ) {
    return { error: "Informe o endereço de entrega." };
  }

  if (!flavors || notes.length > 1000) {
    return { error: "Revise os detalhes da encomenda." };
  }

  const catalog = await getPreorderCatalog();
  const product = catalog
    .flatMap((category) => category.products)
    .find((item) => item.name === selectedProductName);
  const isCustom = selectedProductName === "__custom__";

  if (!product && !isCustom) {
    return { error: "Escolha um produto válido." };
  }

  const option = product?.prices.find(
    (price) => price.label === selectedOptionLabel
  );

  if (product && !option) {
    return { error: "Escolha um tamanho ou opção válida." };
  }

  if (
    product &&
    (!isAllowedPreorderQuantity(product, quantity) ||
      flavors.some(
        (flavor) => !product.flavors?.includes(flavor)
      ) ||
      (product.flavors?.length && flavors.length === 0) ||
      flavors.length >
        getPreorderMaxFlavors(product, quantity))
  ) {
    return { error: "Revise a quantidade e os sabores escolhidos." };
  }

  if (
    isCustom &&
    (customProductName.length < 2 ||
      customProductName.length > 120 ||
      customOptionLabel.length > 120 ||
      !Number.isFinite(customUnitPrice) ||
      customUnitPrice <= 0)
  ) {
    return { error: "Preencha os dados do produto personalizado." };
  }

  const unitPrice = isCustom
    ? customUnitPrice
    : parsePreorderPrice(option?.value ?? "");

  const previousDetails = {
    product_name: request.productName,
    option_label: request.optionLabel,
    quantity: request.quantity,
    total: request.total,
    desired_date: request.desiredDate,
    fulfillment_type: request.fulfillmentType,
  };

  request.customerName = customerName;
  request.customerPhone = customerPhone;
  request.productName = isCustom
    ? customProductName
    : product!.name;
  request.optionLabel = isCustom
    ? customOptionLabel || "Personalizada"
    : option!.label;
  request.optionPrice = isCustom
    ? formatPreorderCurrency(unitPrice)
    : option!.value;
  request.total = total;
  request.quantity = quantity;
  request.quantityUnit = isCustom
    ? "item(ns)"
    : product!.quantityUnit ?? "item(ns)";
  request.flavors = flavors;
  request.desiredDate = desiredDate;
  request.fulfillmentType = fulfillmentType as
    | "pickup"
    | "delivery";
  request.deliveryAddress =
    fulfillmentType === "delivery"
      ? deliveryAddress
      : "";
  request.notes = notes;
  request.updatedAt = new Date().toISOString();

  try {
    await savePreorderRequest(request);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a encomenda.",
    };
  }

  await recordAdminAudit(access, {
    action: "updated",
    entityType: "preorder",
    entityId: request.id,
    summary: `Atualizou os detalhes da encomenda #${request.requestNumber}`,
    metadata: {
      before: previousDetails,
      after: {
        product_name: request.productName,
        option_label: request.optionLabel,
        quantity: request.quantity,
        total: request.total,
        desired_date: request.desiredDate,
        fulfillment_type: request.fulfillmentType,
      },
    },
  });

  revalidateRequest(request.id);
  redirect(`/admin/pedidos/encomendas/${request.id}`);
}

export async function updatePreorderRequestStatus(
  formData: FormData
) {
  const access = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const status = String(
    formData.get("status") ?? ""
  );
  const total = Number(formData.get("total"));

  if (
    !id ||
    !isPreorderRequestStatus(status) ||
    !Number.isFinite(total) ||
    total <= 0 ||
    total > 1000000
  ) {
    throw new Error(
      "Revise a situação e o valor total da encomenda."
    );
  }

  const request = await getPreorderRequest(id);

  if (!request) {
    throw new Error("Encomenda não encontrada.");
  }

  if (
    request.status === "completed" ||
    request.status === "cancelled"
  ) {
    throw new Error(
      "Encomendas finalizadas ou canceladas não podem ser alteradas."
    );
  }

  if (total < request.amountPaid) {
    throw new Error(
      "O valor total não pode ser menor que o valor já pago."
    );
  }

  const previousStatus = request.status;
  const previousTotal = request.total;
  request.status =
    status as PreorderRequestStatus;
  request.total = total;
  request.updatedAt = new Date().toISOString();
  request.completedAt =
    status === "completed"
      ? request.updatedAt
      : null;

  await savePreorderRequest(request);
  await recordAdminAudit(access, {
    action: "updated",
    entityType: "preorder",
    entityId: request.id,
    summary: `Atualizou a situação da encomenda #${request.requestNumber}`,
    metadata: {
      status: {
        before: previousStatus,
        after: request.status,
      },
      total: {
        before: previousTotal,
        after: request.total,
      },
    },
  });
  revalidateRequest(request.id);
}
