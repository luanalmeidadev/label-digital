import "server-only";

import {
  getPreorderStorageClient,
  preorderStorageBucket,
} from "@/lib/preorder-catalog-store";
import {
  isPreorderRequestStatus,
  parsePreorderPrice,
  type PreorderRequest,
} from "@/lib/preorder-request";

const requestFolder = "requests";

function getRequestPath(id: string) {
  return `${requestFolder}/${id}.json`;
}

function isSafeRequestId(id: string) {
  return /^[0-9a-f-]{36}$/i.test(id);
}

function parsePreorderRequest(
  value: unknown
): PreorderRequest | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const request = value as Partial<PreorderRequest>;

  const isValid =
    typeof request.id === "string" &&
    typeof request.requestNumber === "string" &&
    typeof request.status === "string" &&
    isPreorderRequestStatus(request.status) &&
    typeof request.createdAt === "string" &&
    typeof request.updatedAt === "string" &&
    typeof request.desiredDate === "string" &&
    typeof request.customerName === "string" &&
    typeof request.customerPhone === "string" &&
    typeof request.productName === "string" &&
    typeof request.optionLabel === "string" &&
    typeof request.optionPrice === "string" &&
    typeof request.quantity === "number" &&
    typeof request.quantityUnit === "string" &&
    (request.fulfillmentType === "pickup" ||
      request.fulfillmentType === "delivery") &&
    typeof request.deliveryAddress === "string" &&
    typeof request.notes === "string" &&
    Array.isArray(request.flavors) &&
    request.flavors.every(
      (flavor) => typeof flavor === "string"
    );

  if (!isValid) {
    return null;
  }

  const total =
    typeof request.total === "number" &&
    Number.isFinite(request.total)
      ? request.total
      : parsePreorderPrice(request.optionPrice!) *
        request.quantity!;
  const amountPaid =
    typeof request.amountPaid === "number" &&
    Number.isFinite(request.amountPaid)
      ? Math.min(
          Math.max(request.amountPaid, 0),
          Math.max(total, 0)
        )
      : 0;
  const completedAt =
    request.status === "completed"
      ? typeof request.completedAt === "string"
        ? request.completedAt
        : request.updatedAt!
      : null;

  return {
    ...(request as PreorderRequest),
    total,
    amountPaid,
    completedAt,
    source:
      request.source === "manual"
        ? "manual"
        : "online",
  };
}

export async function savePreorderRequest(
  request: PreorderRequest
) {
  const supabase =
    await getPreorderStorageClient();
  const body = new Blob(
    [JSON.stringify(request, null, 2)],
    { type: "application/json" }
  );
  const { error } = await supabase.storage
    .from(preorderStorageBucket)
    .upload(getRequestPath(request.id), body, {
      contentType: "application/json",
      cacheControl: "0",
      upsert: true,
    });

  if (error) {
    throw new Error(
      "Não foi possível registrar a encomenda."
    );
  }
}

export async function getPreorderRequest(
  id: string
) {
  if (!isSafeRequestId(id)) {
    return null;
  }

  const supabase =
    await getPreorderStorageClient();
  const { data, error } = await supabase.storage
    .from(preorderStorageBucket)
    .download(getRequestPath(id));

  if (error) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(
      await data.text()
    );
    return parsePreorderRequest(parsed);
  } catch {
    return null;
  }
}

export async function listPreorderRequests() {
  const supabase =
    await getPreorderStorageClient();
  const { data: files, error } =
    await supabase.storage
      .from(preorderStorageBucket)
      .list(requestFolder, {
        limit: 1000,
        sortBy: {
          column: "created_at",
          order: "desc",
        },
      });

  if (error) {
    throw new Error(
      "Não foi possível carregar as encomendas."
    );
  }

  const requests = await Promise.all(
    (files ?? [])
      .filter((file) => file.name.endsWith(".json"))
      .map(async (file) => {
        const id = file.name.replace(/\.json$/, "");
        return getPreorderRequest(id);
      })
  );

  return requests
    .filter(
      (request): request is PreorderRequest =>
        request !== null
    )
    .sort(
      (first, second) =>
        second.createdAt.localeCompare(
          first.createdAt
        )
    );
}
