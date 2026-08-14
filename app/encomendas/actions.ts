"use server";

import { getPreorderCatalog } from "@/lib/preorder-catalog-store";
import {
  parsePreorderPrice,
  type PreorderRequest,
} from "@/lib/preorder-request";
import { savePreorderRequest } from "@/lib/preorder-request-store";
import { normalizeWhatsAppPhone } from "@/lib/order-status";

export type CreatePreorderRequestResult = {
  success: boolean;
  requestId?: string;
  requestNumber?: string;
  error?: string;
};

function getMinimumDate(leadTimeDays: number) {
  const parts = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).formatToParts(new Date());
  const year = Number(
    parts.find((part) => part.type === "year")
      ?.value
  );
  const month = Number(
    parts.find((part) => part.type === "month")
      ?.value
  );
  const day = Number(
    parts.find((part) => part.type === "day")
      ?.value
  );
  const minimumDate = new Date(
    Date.UTC(year, month - 1, day + leadTimeDays)
  );

  return minimumDate.toISOString().slice(0, 10);
}

function parseFlavors(value: FormDataEntryValue | null) {
  try {
    const parsed: unknown = JSON.parse(
      String(value ?? "[]")
    );

    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed.map((flavor) =>
      String(flavor).trim()
    );
  } catch {
    return null;
  }
}

export async function createPreorderRequest(
  formData: FormData
): Promise<CreatePreorderRequestResult> {
  const customerName = String(
    formData.get("customer_name") ?? ""
  ).trim();
  const customerPhone =
    normalizeWhatsAppPhone(
      String(
        formData.get("customer_phone") ?? ""
      )
    );
  const productName = String(
    formData.get("product_name") ?? ""
  ).trim();
  const optionLabel = String(
    formData.get("option_label") ?? ""
  ).trim();
  const quantity = Number(
    formData.get("quantity")
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
  const flavors = parseFlavors(
    formData.get("flavors")
  );

  if (
    customerName.length < 2 ||
    customerName.length > 100
  ) {
    return {
      success: false,
      error: "Informe um nome válido.",
    };
  }

  if (
    customerPhone.length < 12 ||
    customerPhone.length > 13
  ) {
    return {
      success: false,
      error: "Informe um WhatsApp válido.",
    };
  }

  if (
    !["pickup", "delivery"].includes(
      fulfillmentType
    )
  ) {
    return {
      success: false,
      error: "Escolha retirada ou entrega.",
    };
  }

  if (
    fulfillmentType === "delivery" &&
    (deliveryAddress.length < 8 ||
      deliveryAddress.length > 300)
  ) {
    return {
      success: false,
      error: "Informe o endereço de entrega.",
    };
  }

  if (notes.length > 1000 || !flavors) {
    return {
      success: false,
      error: "Revise os detalhes da encomenda.",
    };
  }

  const catalog = await getPreorderCatalog();
  const product = catalog
    .flatMap((category) => category.products)
    .find((item) => item.name === productName);
  const isCustom =
    productName === "Encomenda personalizada";

  if (!product && !isCustom) {
    return {
      success: false,
      error: "Produto não encontrado.",
    };
  }

  const minimumQuantity =
    product?.minimumQuantity ?? 1;
  const quantityUnit =
    product?.quantityUnit ?? "item(ns)";
  const leadTimeDays =
    product?.leadTimeDays ?? 2;
  const option = product?.prices.find(
    (price) => price.label === optionLabel
  );

  if (
    product &&
    (!optionLabel || !option)
  ) {
    return {
      success: false,
      error: "Escolha uma opção válida.",
    };
  }

  if (
    !Number.isInteger(quantity) ||
    quantity < minimumQuantity ||
    quantity > 10000
  ) {
    return {
      success: false,
      error: `A quantidade mínima é ${minimumQuantity} ${quantityUnit}.`,
    };
  }

  if (
    product?.flavors?.length &&
    (flavors.length === 0 ||
      flavors.some(
        (flavor) =>
          !product.flavors?.includes(flavor)
      ) ||
      (product.maxFlavors !== undefined &&
        flavors.length > product.maxFlavors))
  ) {
    return {
      success: false,
      error: "Escolha sabores válidos.",
    };
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      desiredDate
    ) ||
    desiredDate < getMinimumDate(leadTimeDays)
  ) {
    return {
      success: false,
      error: `Escolha uma data com pelo menos ${leadTimeDays} dias de antecedência.`,
    };
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const dateCode = now
    .slice(0, 10)
    .replace(/-/g, "");
  const requestNumber = `ENC-${dateCode}-${id
    .slice(0, 4)
    .toUpperCase()}`;
  const request: PreorderRequest = {
    id,
    requestNumber,
    status: "new",
    createdAt: now,
    updatedAt: now,
    desiredDate,
    customerName,
    customerPhone,
    productName,
    optionLabel:
      option?.label ?? "Personalizada",
    optionPrice:
      option?.value ?? "A confirmar",
    total:
      parsePreorderPrice(option?.value ?? "") *
      quantity,
    amountPaid: 0,
    quantity,
    quantityUnit,
    flavors,
    fulfillmentType:
      fulfillmentType as "pickup" | "delivery",
    deliveryAddress:
      fulfillmentType === "delivery"
        ? deliveryAddress
        : "",
    notes,
    completedAt: null,
    source: "online",
  };

  try {
    await savePreorderRequest(request);
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível registrar a encomenda.",
    };
  }

  return {
    success: true,
    requestId: id,
    requestNumber,
  };
}
