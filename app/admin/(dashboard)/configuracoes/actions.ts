"use server";

import { revalidatePath } from "next/cache";

import { requireAdminPermission } from "@/lib/admin-auth";

async function ensureAdmin() {
  const access =
    await requireAdminPermission("settings");
  return access.supabase;
}

function revalidateSettings() {
  revalidatePath("/");
  revalidatePath("/encomendas");
  revalidatePath("/admin");
  revalidatePath("/admin/configuracoes");
}

/* =========================================
   DADOS DA LOJA
========================================= */

export async function updateStoreSettings(
  formData: FormData
) {
  const supabase =
    await ensureAdmin();

  const id = String(
    formData.get("id") ?? ""
  );

  const storeName = String(
    formData.get("store_name") ?? ""
  ).trim();

  const whatsapp = String(
    formData.get("whatsapp") ?? ""
  ).trim();

  const instagram = String(
    formData.get("instagram") ?? ""
  ).trim();

  const addressStreet = String(
    formData.get("address_street") ?? ""
  ).trim();

  const addressNumber = String(
    formData.get("address_number") ?? ""
  ).trim();

  const addressCity = String(
    formData.get("address_city") ?? ""
  ).trim();

  const addressState = String(
    formData.get("address_state") ?? ""
  ).trim();

  const pickupEnabled =
    formData.get("pickup_enabled") === "on";

  const deliveryEnabled =
    formData.get("delivery_enabled") === "on";

  if (!id) {
    throw new Error(
      "Configuração da loja inválida."
    );
  }

  if (storeName.length < 2) {
    throw new Error(
      "Informe um nome válido para a loja."
    );
  }

  if (!whatsapp) {
    throw new Error(
      "Informe o WhatsApp da loja."
    );
  }

  const { error } = await supabase
    .from("store_settings")
    .update({
      store_name: storeName,
      whatsapp,
      instagram:
        instagram || null,

      address_street:
        addressStreet || null,

      address_number:
        addressNumber || null,

      address_city:
        addressCity || null,

      address_state:
        addressState || null,

      pickup_enabled:
        pickupEnabled,

      delivery_enabled:
        deliveryEnabled,

      updated_at:
        new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(
      "Não foi possível atualizar os dados da loja."
    );
  }

  revalidateSettings();
}

/* =========================================
   HORÁRIOS
========================================= */

export async function updateBusinessHours(
  formData: FormData
) {
  const supabase =
    await ensureAdmin();

  const weekday = Number(
    formData.get("weekday")
  );

  const isOpen =
    formData.get("is_open") === "on";

  let opensAt = String(
    formData.get("opens_at") ?? ""
  );

  let closesAt = String(
    formData.get("closes_at") ?? ""
  );

  if (
    Number.isNaN(weekday) ||
    weekday < 0 ||
    weekday > 6
  ) {
    throw new Error(
      "Dia da semana inválido."
    );
  }

  /*
   * Caso o dia estivesse fechado e
   * seja reaberto sem horários preenchidos,
   * usamos horários padrão.
   */
  if (isOpen) {
    if (!opensAt) {
      opensAt = "09:00";
    }

    if (!closesAt) {
      closesAt =
        weekday === 6
          ? "17:00"
          : "19:00";
    }
  }

  if (
    isOpen &&
    opensAt >= closesAt
  ) {
    throw new Error(
      "O horário de fechamento deve ser posterior ao de abertura."
    );
  }

  const { error } = await supabase
    .from("business_hours")
    .update({
      is_open: isOpen,

      opens_at:
        isOpen ? opensAt : null,

      closes_at:
        isOpen ? closesAt : null,
    })
    .eq("weekday", weekday);

  if (error) {
    throw new Error(
      "Não foi possível atualizar o horário."
    );
  }

  revalidateSettings();
}

/* =========================================
   CRIAR REGIÃO DE ENTREGA
========================================= */

export async function createDeliveryZone(
  formData: FormData
) {
  const supabase =
    await ensureAdmin();

  const neighborhood = String(
    formData.get("neighborhood") ?? ""
  ).trim();

  const feeType = String(
    formData.get("fee_type") ?? "consult"
  );

  const deliveryFeeRaw = String(
    formData.get("delivery_fee") ?? ""
  );

  if (neighborhood.length < 2) {
    throw new Error(
      "Informe uma região válida."
    );
  }

  if (
    feeType !== "fixed" &&
    feeType !== "consult"
  ) {
    throw new Error(
      "Tipo de taxa inválido."
    );
  }

  let deliveryFee:
    | number
    | null = null;

  if (feeType === "fixed") {
    deliveryFee =
      Number(deliveryFeeRaw);

    if (
      Number.isNaN(deliveryFee) ||
      deliveryFee < 0
    ) {
      throw new Error(
        "Informe uma taxa de entrega válida."
      );
    }
  }

  const { error } = await supabase
    .from("delivery_zones")
    .insert({
      neighborhood,
      fee_type: feeType,
      delivery_fee:
        feeType === "consult"
          ? null
          : deliveryFee,
      active: true,
    });

  if (error) {
    throw new Error(
      "Não foi possível cadastrar a região."
    );
  }

  revalidateSettings();
}

/* =========================================
   EDITAR REGIÃO
========================================= */

export async function updateDeliveryZone(
  formData: FormData
) {
  const supabase =
    await ensureAdmin();

  const id = String(
    formData.get("id") ?? ""
  );

  const neighborhood = String(
    formData.get("neighborhood") ?? ""
  ).trim();

  const feeType = String(
    formData.get("fee_type") ?? ""
  );

  const deliveryFeeRaw = String(
    formData.get("delivery_fee") ?? ""
  );

  if (!id) {
    throw new Error(
      "Região inválida."
    );
  }

  if (neighborhood.length < 2) {
    throw new Error(
      "Informe uma região válida."
    );
  }

  if (
    feeType !== "fixed" &&
    feeType !== "consult"
  ) {
    throw new Error(
      "Tipo de taxa inválido."
    );
  }

  let deliveryFee:
    | number
    | null = null;

  if (feeType === "fixed") {
    deliveryFee =
      Number(deliveryFeeRaw);

    if (
      Number.isNaN(deliveryFee) ||
      deliveryFee < 0
    ) {
      throw new Error(
        "Informe uma taxa válida."
      );
    }
  }

  const { error } = await supabase
    .from("delivery_zones")
    .update({
      neighborhood,
      fee_type: feeType,
      delivery_fee:
        feeType === "consult"
          ? null
          : deliveryFee,
    })
    .eq("id", id);

  if (error) {
    throw new Error(
      "Não foi possível atualizar a região."
    );
  }

  revalidateSettings();
}

/* =========================================
   ATIVAR / DESATIVAR REGIÃO
========================================= */

export async function toggleDeliveryZone(
  formData: FormData
) {
  const supabase =
    await ensureAdmin();

  const id = String(
    formData.get("id") ?? ""
  );

  const active =
    String(
      formData.get("active") ?? ""
    ) === "true";

  if (!id) {
    throw new Error(
      "Região inválida."
    );
  }

  const { error } = await supabase
    .from("delivery_zones")
    .update({
      active: !active,
    })
    .eq("id", id);

  if (error) {
    throw new Error(
      "Não foi possível alterar o status da região."
    );
  }

  revalidateSettings();
}

/* =========================================
   EXCLUIR REGIÃO
========================================= */

export async function deleteDeliveryZone(
  formData: FormData
) {
  const supabase =
    await ensureAdmin();

  const id = String(
    formData.get("id") ?? ""
  );

  if (!id) {
    throw new Error(
      "Região inválida."
    );
  }

  const { error } = await supabase
    .from("delivery_zones")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(
      "Não foi possível excluir a região."
    );
  }

  revalidateSettings();
}
