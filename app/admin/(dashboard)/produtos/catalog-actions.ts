"use server";

import { revalidatePath } from "next/cache";

import { requireAdminPermission } from "@/lib/admin-auth";
import { recordAdminAudit, type AdminAuditEntry } from "@/lib/admin-audit";
import {
  CatalogAdminValidationError,
  parseCatalogDeleteInput,
  parseCatalogMoveInput,
  parseCatalogOptionGroupInput,
  parseCatalogOptionInput,
  parseCatalogPricingMode,
  parseCatalogVariantInput,
} from "@/lib/food-catalog/admin-validation";
import {
  CatalogAdminRepositoryError,
  deleteCatalogOption,
  deleteCatalogOptionGroup,
  deleteCatalogVariant,
  moveCatalogOption,
  moveCatalogOptionGroup,
  moveCatalogVariant,
  saveCatalogOption,
  saveCatalogOptionGroup,
  saveCatalogVariant,
  updateCatalogPricingMode,
} from "@/lib/food-catalog/admin-repository";

export type CatalogAdminActionResult = {
  ok: boolean;
  message: string;
};

type MutationResult = {
  message: string;
  audit: AdminAuditEntry;
};

function revalidateCatalog() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/produtos");
}

async function runCatalogMutation(
  operation: (
    access: Awaited<ReturnType<typeof requireAdminPermission>>
  ) => Promise<MutationResult>
): Promise<CatalogAdminActionResult> {
  const access = await requireAdminPermission("catalog");

  try {
    const result = await operation(access);
    await recordAdminAudit(access, result.audit);
    revalidateCatalog();
    return { ok: true, message: result.message };
  } catch (error) {
    if (
      error instanceof CatalogAdminValidationError ||
      error instanceof CatalogAdminRepositoryError
    ) {
      return { ok: false, message: error.message };
    }

    console.error("Falha ao atualizar o catálogo configurável:", error);
    return {
      ok: false,
      message: "Não foi possível salvar a configuração. Tente novamente.",
    };
  }
}

export async function setCatalogPricingMode(formData: FormData) {
  return runCatalogMutation(async (access) => {
    const input = parseCatalogPricingMode(formData);
    await updateCatalogPricingMode(
      access.supabase,
      input.productId,
      input.pricingMode
    );

    return {
      message: "Tipo de preço atualizado.",
      audit: {
        action: "updated",
        entityType: "product_catalog",
        entityId: input.productId,
        summary: "Alterou o tipo de preço do produto.",
        metadata: { pricingMode: input.pricingMode },
      },
    };
  });
}

export async function saveProductVariant(formData: FormData) {
  return runCatalogMutation(async (access) => {
    const input = parseCatalogVariantInput(formData);
    const variantId = await saveCatalogVariant(access.supabase, input);
    const created = input.variantId === null;

    return {
      message: created ? "Variante adicionada." : "Variante atualizada.",
      audit: {
        action: created ? "created" : "updated",
        entityType: "product_variant",
        entityId: variantId,
        summary: `${created ? "Adicionou" : "Atualizou"} a variante ${input.name}.`,
        metadata: { productId: input.productId, price: input.price },
      },
    };
  });
}

export async function removeProductVariant(formData: FormData) {
  return runCatalogMutation(async (access) => {
    const input = parseCatalogDeleteInput(formData);
    await deleteCatalogVariant(
      access.supabase,
      input.productId,
      input.entityId
    );

    return {
      message: "Variante removida. Pedidos anteriores continuam preservados.",
      audit: {
        action: "deleted",
        entityType: "product_variant",
        entityId: input.entityId,
        summary: "Removeu uma variante do catálogo.",
        metadata: { productId: input.productId },
      },
    };
  });
}

export async function reorderProductVariant(formData: FormData) {
  return runCatalogMutation(async (access) => {
    const input = parseCatalogMoveInput(formData);
    await moveCatalogVariant(
      access.supabase,
      input.productId,
      input.entityId,
      input.direction
    );

    return {
      message: "Ordem das variantes atualizada.",
      audit: {
        action: "updated",
        entityType: "product_variant",
        entityId: input.entityId,
        summary: "Reordenou uma variante do catálogo.",
        metadata: { productId: input.productId, direction: input.direction },
      },
    };
  });
}

export async function saveProductOptionGroup(formData: FormData) {
  return runCatalogMutation(async (access) => {
    const input = parseCatalogOptionGroupInput(formData);
    const groupId = await saveCatalogOptionGroup(access.supabase, input);
    const created = input.optionGroupId === null;

    return {
      message: created ? "Grupo adicionado." : "Regras do grupo atualizadas.",
      audit: {
        action: created ? "created" : "updated",
        entityType: "product_option_group",
        entityId: groupId,
        summary: `${created ? "Adicionou" : "Atualizou"} o grupo ${input.name}.`,
        metadata: {
          productId: input.productId,
          selectionMode: input.selectionMode,
          minSelections: input.minSelections,
          maxSelections: input.maxSelections,
        },
      },
    };
  });
}

export async function removeProductOptionGroup(formData: FormData) {
  return runCatalogMutation(async (access) => {
    const input = parseCatalogDeleteInput(formData);
    await deleteCatalogOptionGroup(
      access.supabase,
      input.productId,
      input.entityId
    );

    return {
      message: "Grupo removido. Pedidos anteriores continuam preservados.",
      audit: {
        action: "deleted",
        entityType: "product_option_group",
        entityId: input.entityId,
        summary: "Removeu um grupo de opções do catálogo.",
        metadata: { productId: input.productId },
      },
    };
  });
}

export async function reorderProductOptionGroup(formData: FormData) {
  return runCatalogMutation(async (access) => {
    const input = parseCatalogMoveInput(formData);
    await moveCatalogOptionGroup(
      access.supabase,
      input.productId,
      input.entityId,
      input.direction
    );

    return {
      message: "Ordem dos grupos atualizada.",
      audit: {
        action: "updated",
        entityType: "product_option_group",
        entityId: input.entityId,
        summary: "Reordenou um grupo de opções.",
        metadata: { productId: input.productId, direction: input.direction },
      },
    };
  });
}

export async function saveProductOption(formData: FormData) {
  return runCatalogMutation(async (access) => {
    const input = parseCatalogOptionInput(formData);
    const optionId = await saveCatalogOption(access.supabase, input);
    const created = input.optionId === null;

    return {
      message: created ? "Opção adicionada." : "Opção atualizada.",
      audit: {
        action: created ? "created" : "updated",
        entityType: "product_option",
        entityId: optionId,
        summary: `${created ? "Adicionou" : "Atualizou"} a opção ${input.name}.`,
        metadata: {
          productId: input.productId,
          optionGroupId: input.optionGroupId,
          priceDelta: input.priceDelta,
        },
      },
    };
  });
}

export async function removeProductOption(formData: FormData) {
  return runCatalogMutation(async (access) => {
    const input = parseCatalogDeleteInput(formData);

    if (!input.optionGroupId) {
      throw new CatalogAdminValidationError("Grupo inválido.");
    }

    await deleteCatalogOption(
      access.supabase,
      input.productId,
      input.optionGroupId,
      input.entityId
    );

    return {
      message: "Opção removida. Pedidos anteriores continuam preservados.",
      audit: {
        action: "deleted",
        entityType: "product_option",
        entityId: input.entityId,
        summary: "Removeu uma opção do catálogo.",
        metadata: {
          productId: input.productId,
          optionGroupId: input.optionGroupId,
        },
      },
    };
  });
}

export async function reorderProductOption(formData: FormData) {
  return runCatalogMutation(async (access) => {
    const input = parseCatalogMoveInput(formData);

    if (!input.optionGroupId) {
      throw new CatalogAdminValidationError("Grupo inválido.");
    }

    await moveCatalogOption(
      access.supabase,
      input.productId,
      input.optionGroupId,
      input.entityId,
      input.direction
    );

    return {
      message: "Ordem das opções atualizada.",
      audit: {
        action: "updated",
        entityType: "product_option",
        entityId: input.entityId,
        summary: "Reordenou uma opção do catálogo.",
        metadata: {
          productId: input.productId,
          optionGroupId: input.optionGroupId,
          direction: input.direction,
        },
      },
    };
  });
}
