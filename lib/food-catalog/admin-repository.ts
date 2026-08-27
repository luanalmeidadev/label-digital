import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CatalogOptionGroupInput,
  CatalogOptionInput,
  CatalogVariantInput,
} from "@/lib/food-catalog/admin-validation";
import type { CatalogPricingMode } from "@/lib/food-catalog/types";

export class CatalogAdminRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogAdminRepositoryError";
  }
}

type Direction = "up" | "down";
type CatalogTable =
  | "product_variants"
  | "product_option_groups"
  | "product_options";

function repositoryError(
  operation: string,
  error: { code?: string; message: string }
): never {
  if (error.code === "23505") {
    throw new CatalogAdminRepositoryError(
      "Já existe um item com esse nome nesta configuração."
    );
  }

  throw new CatalogAdminRepositoryError(
    `Não foi possível ${operation}. Tente novamente.`
  );
}

async function requireProduct(
  supabase: SupabaseClient,
  productId: string
) {
  const { data, error } = await supabase
    .from("products")
    .select("id, pricing_mode")
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    repositoryError("consultar o produto", error);
  }

  if (!data) {
    throw new CatalogAdminRepositoryError("Produto não encontrado.");
  }

  return data as { id: string; pricing_mode: CatalogPricingMode };
}

async function requireOptionGroup(
  supabase: SupabaseClient,
  productId: string,
  optionGroupId: string
) {
  const { data, error } = await supabase
    .from("product_option_groups")
    .select("id, product_id, active, min_selections")
    .eq("id", optionGroupId)
    .eq("product_id", productId)
    .maybeSingle();

  if (error) {
    repositoryError("consultar o grupo", error);
  }

  if (!data) {
    throw new CatalogAdminRepositoryError("Grupo de opções não encontrado.");
  }

  return data as {
    id: string;
    product_id: string;
    active: boolean;
    min_selections: number;
  };
}

async function nextSortOrder(
  supabase: SupabaseClient,
  table: CatalogTable,
  scopeField: "product_id" | "option_group_id",
  scopeId: string
) {
  const { data, error } = await supabase
    .from(table)
    .select("sort_order")
    .eq(scopeField, scopeId)
    .order("sort_order", { ascending: false })
    .limit(1);

  if (error) {
    repositoryError("calcular a ordenação", error);
  }

  return Number(data?.[0]?.sort_order ?? -1) + 1;
}

async function countUsableVariants(
  supabase: SupabaseClient,
  productId: string,
  excludedId?: string
) {
  let query = supabase
    .from("product_variants")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId)
    .eq("active", true)
    .eq("available", true);

  if (excludedId) {
    query = query.neq("id", excludedId);
  }

  const { count, error } = await query;

  if (error) {
    repositoryError("validar as variantes", error);
  }

  return count ?? 0;
}

async function countUsableOptions(
  supabase: SupabaseClient,
  optionGroupId: string,
  excludedId?: string
) {
  let query = supabase
    .from("product_options")
    .select("id", { count: "exact", head: true })
    .eq("option_group_id", optionGroupId)
    .eq("active", true)
    .eq("available", true);

  if (excludedId) {
    query = query.neq("id", excludedId);
  }

  const { count, error } = await query;

  if (error) {
    repositoryError("validar as opções", error);
  }

  return count ?? 0;
}

async function ensureVariantCanBecomeUnavailable(
  supabase: SupabaseClient,
  productId: string,
  variantId: string
) {
  const product = await requireProduct(supabase, productId);

  if (
    product.pricing_mode === "variant" &&
    (await countUsableVariants(supabase, productId, variantId)) === 0
  ) {
    throw new CatalogAdminRepositoryError(
      "Produtos com preço por variante precisam manter ao menos uma variante ativa e disponível."
    );
  }
}

async function ensureOptionCanBecomeUnavailable(
  supabase: SupabaseClient,
  productId: string,
  optionGroupId: string,
  optionId: string
) {
  const group = await requireOptionGroup(supabase, productId, optionGroupId);

  if (
    group.active &&
    group.min_selections > 0 &&
    (await countUsableOptions(supabase, optionGroupId, optionId)) <
      group.min_selections
  ) {
    throw new CatalogAdminRepositoryError(
      "Esse grupo obrigatório precisa manter opções ativas e disponíveis suficientes."
    );
  }
}

export async function updateCatalogPricingMode(
  supabase: SupabaseClient,
  productId: string,
  pricingMode: CatalogPricingMode
) {
  await requireProduct(supabase, productId);

  if (
    pricingMode === "variant" &&
    (await countUsableVariants(supabase, productId)) === 0
  ) {
    throw new CatalogAdminRepositoryError(
      "Cadastre ao menos uma variante ativa e disponível antes de usar preço por variante."
    );
  }

  const { error } = await supabase
    .from("products")
    .update({ pricing_mode: pricingMode })
    .eq("id", productId);

  if (error) {
    repositoryError("alterar o tipo de preço", error);
  }
}

export async function saveCatalogVariant(
  supabase: SupabaseClient,
  input: CatalogVariantInput
) {
  await requireProduct(supabase, input.productId);

  if (input.variantId) {
    const { data: current, error: currentError } = await supabase
      .from("product_variants")
      .select("id, active, available")
      .eq("id", input.variantId)
      .eq("product_id", input.productId)
      .maybeSingle();

    if (currentError) {
      repositoryError("consultar a variante", currentError);
    }

    if (!current) {
      throw new CatalogAdminRepositoryError("Variante não encontrada.");
    }

    if (
      current.active &&
      current.available &&
      (!input.active || !input.available)
    ) {
      await ensureVariantCanBecomeUnavailable(
        supabase,
        input.productId,
        input.variantId
      );
    }

    const { error } = await supabase
      .from("product_variants")
      .update({
        name: input.name,
        price: input.price,
        active: input.active,
        available: input.available,
      })
      .eq("id", input.variantId)
      .eq("product_id", input.productId);

    if (error) {
      repositoryError("atualizar a variante", error);
    }

    return input.variantId;
  }

  const sortOrder = await nextSortOrder(
    supabase,
    "product_variants",
    "product_id",
    input.productId
  );
  const { data, error } = await supabase
    .from("product_variants")
    .insert({
      product_id: input.productId,
      name: input.name,
      price: input.price,
      active: input.active,
      available: input.available,
      sort_order: sortOrder,
    })
    .select("id")
    .single();

  if (error) {
    repositoryError("criar a variante", error);
  }

  return data.id as string;
}

export async function deleteCatalogVariant(
  supabase: SupabaseClient,
  productId: string,
  variantId: string
) {
  const { data, error: readError } = await supabase
    .from("product_variants")
    .select("id, active, available")
    .eq("id", variantId)
    .eq("product_id", productId)
    .maybeSingle();

  if (readError) {
    repositoryError("consultar a variante", readError);
  }

  if (!data) {
    throw new CatalogAdminRepositoryError("Variante não encontrada.");
  }

  if (data.active && data.available) {
    await ensureVariantCanBecomeUnavailable(supabase, productId, variantId);
  }

  const { error } = await supabase
    .from("product_variants")
    .delete()
    .eq("id", variantId)
    .eq("product_id", productId);

  if (error) {
    repositoryError("remover a variante", error);
  }
}

export async function saveCatalogOptionGroup(
  supabase: SupabaseClient,
  input: CatalogOptionGroupInput
) {
  await requireProduct(supabase, input.productId);

  if (input.optionGroupId) {
    await requireOptionGroup(supabase, input.productId, input.optionGroupId);

    if (input.active && input.minSelections > 0) {
      const usableOptions = await countUsableOptions(
        supabase,
        input.optionGroupId
      );

      if (usableOptions < input.minSelections) {
        throw new CatalogAdminRepositoryError(
          "Adicione opções ativas e disponíveis suficientes antes de tornar o grupo obrigatório."
        );
      }
    }

    const { error } = await supabase
      .from("product_option_groups")
      .update({
        name: input.name,
        selection_mode: input.selectionMode,
        min_selections: input.minSelections,
        max_selections: input.maxSelections,
        presentation_mode: input.presentationMode,
        active: input.active,
      })
      .eq("id", input.optionGroupId)
      .eq("product_id", input.productId);

    if (error) {
      repositoryError("atualizar o grupo", error);
    }

    return input.optionGroupId;
  }

  const sortOrder = await nextSortOrder(
    supabase,
    "product_option_groups",
    "product_id",
    input.productId
  );
  const { data, error } = await supabase
    .from("product_option_groups")
    .insert({
      product_id: input.productId,
      name: input.name,
      selection_mode: input.selectionMode,
      min_selections: input.minSelections,
      max_selections: input.maxSelections,
      presentation_mode: input.presentationMode,
      active: input.active,
      sort_order: sortOrder,
    })
    .select("id")
    .single();

  if (error) {
    repositoryError("criar o grupo", error);
  }

  return data.id as string;
}

export async function deleteCatalogOptionGroup(
  supabase: SupabaseClient,
  productId: string,
  optionGroupId: string
) {
  await requireOptionGroup(supabase, productId, optionGroupId);

  const { error } = await supabase
    .from("product_option_groups")
    .delete()
    .eq("id", optionGroupId)
    .eq("product_id", productId);

  if (error) {
    repositoryError("remover o grupo", error);
  }
}

export async function saveCatalogOption(
  supabase: SupabaseClient,
  input: CatalogOptionInput
) {
  await requireOptionGroup(supabase, input.productId, input.optionGroupId);

  if (input.optionId) {
    const { data: current, error: currentError } = await supabase
      .from("product_options")
      .select("id, active, available")
      .eq("id", input.optionId)
      .eq("option_group_id", input.optionGroupId)
      .maybeSingle();

    if (currentError) {
      repositoryError("consultar a opção", currentError);
    }

    if (!current) {
      throw new CatalogAdminRepositoryError("Opção não encontrada.");
    }

    if (
      current.active &&
      current.available &&
      (!input.active || !input.available)
    ) {
      await ensureOptionCanBecomeUnavailable(
        supabase,
        input.productId,
        input.optionGroupId,
        input.optionId
      );
    }

    const { error } = await supabase
      .from("product_options")
      .update({
        name: input.name,
        price_delta: input.priceDelta,
        active: input.active,
        available: input.available,
      })
      .eq("id", input.optionId)
      .eq("option_group_id", input.optionGroupId);

    if (error) {
      repositoryError("atualizar a opção", error);
    }

    return input.optionId;
  }

  const sortOrder = await nextSortOrder(
    supabase,
    "product_options",
    "option_group_id",
    input.optionGroupId
  );
  const { data, error } = await supabase
    .from("product_options")
    .insert({
      option_group_id: input.optionGroupId,
      name: input.name,
      price_delta: input.priceDelta,
      active: input.active,
      available: input.available,
      sort_order: sortOrder,
    })
    .select("id")
    .single();

  if (error) {
    repositoryError("criar a opção", error);
  }

  return data.id as string;
}

export async function deleteCatalogOption(
  supabase: SupabaseClient,
  productId: string,
  optionGroupId: string,
  optionId: string
) {
  const { data, error: readError } = await supabase
    .from("product_options")
    .select("id, active, available")
    .eq("id", optionId)
    .eq("option_group_id", optionGroupId)
    .maybeSingle();

  if (readError) {
    repositoryError("consultar a opção", readError);
  }

  if (!data) {
    throw new CatalogAdminRepositoryError("Opção não encontrada.");
  }

  if (data.active && data.available) {
    await ensureOptionCanBecomeUnavailable(
      supabase,
      productId,
      optionGroupId,
      optionId
    );
  }

  const { error } = await supabase
    .from("product_options")
    .delete()
    .eq("id", optionId)
    .eq("option_group_id", optionGroupId);

  if (error) {
    repositoryError("remover a opção", error);
  }
}

async function moveCatalogEntity(
  supabase: SupabaseClient,
  table: CatalogTable,
  scopeField: "product_id" | "option_group_id",
  scopeId: string,
  entityId: string,
  direction: Direction
) {
  const { data, error } = await supabase
    .from(table)
    .select("id, sort_order")
    .eq(scopeField, scopeId)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    repositoryError("consultar a ordenação", error);
  }

  const rows = (data ?? []) as Array<{ id: string; sort_order: number }>;
  const currentIndex = rows.findIndex((row) => row.id === entityId);
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

  if (currentIndex < 0) {
    throw new CatalogAdminRepositoryError("Item não encontrado.");
  }

  if (targetIndex < 0 || targetIndex >= rows.length) {
    return;
  }

  const current = rows[currentIndex];
  const target = rows[targetIndex];
  const { error: currentError } = await supabase
    .from(table)
    .update({ sort_order: target.sort_order })
    .eq("id", current.id)
    .eq(scopeField, scopeId);

  if (currentError) {
    repositoryError("reordenar o item", currentError);
  }

  const { error: targetError } = await supabase
    .from(table)
    .update({ sort_order: current.sort_order })
    .eq("id", target.id)
    .eq(scopeField, scopeId);

  if (targetError) {
    await supabase
      .from(table)
      .update({ sort_order: current.sort_order })
      .eq("id", current.id)
      .eq(scopeField, scopeId);
    repositoryError("reordenar o item", targetError);
  }
}

export async function moveCatalogVariant(
  supabase: SupabaseClient,
  productId: string,
  variantId: string,
  direction: Direction
) {
  await requireProduct(supabase, productId);
  await moveCatalogEntity(
    supabase,
    "product_variants",
    "product_id",
    productId,
    variantId,
    direction
  );
}

export async function moveCatalogOptionGroup(
  supabase: SupabaseClient,
  productId: string,
  optionGroupId: string,
  direction: Direction
) {
  await requireProduct(supabase, productId);
  await moveCatalogEntity(
    supabase,
    "product_option_groups",
    "product_id",
    productId,
    optionGroupId,
    direction
  );
}

export async function moveCatalogOption(
  supabase: SupabaseClient,
  productId: string,
  optionGroupId: string,
  optionId: string,
  direction: Direction
) {
  await requireOptionGroup(supabase, productId, optionGroupId);
  await moveCatalogEntity(
    supabase,
    "product_options",
    "option_group_id",
    optionGroupId,
    optionId,
    direction
  );
}
