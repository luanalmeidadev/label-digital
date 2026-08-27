import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CatalogPricingMode,
  FoodCatalogConfiguration,
  FoodCatalogProduct,
  OptionPresentationMode,
  OptionSelectionMode,
  ProductOption,
  ProductOptionGroup,
  ProductVariant,
} from "@/lib/food-catalog/types";

type ProductRow = {
  id: string;
  name: string;
  price: number | string;
  pricing_mode: CatalogPricingMode;
  active: boolean;
  available: boolean;
};

type ProductVariantRow = {
  id: string;
  product_id: string;
  name: string;
  sku: string | null;
  price: number | string;
  active: boolean;
  available: boolean;
  sort_order: number;
};

type ProductOptionGroupRow = {
  id: string;
  product_id: string;
  name: string;
  selection_mode: OptionSelectionMode;
  min_selections: number;
  max_selections: number | null;
  presentation_mode: OptionPresentationMode;
  active: boolean;
  sort_order: number;
};

type ProductOptionRow = {
  id: string;
  option_group_id: string;
  name: string;
  price_delta: number | string;
  active: boolean;
  available: boolean;
  sort_order: number;
};

type CatalogReadOptions = {
  publicOnly?: boolean;
};

export interface FoodCatalogProductRepository {
  getProductById(productId: string): Promise<FoodCatalogProduct | null>;
}

function toCatalogNumber(value: number | string, field: string) {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Valor inválido no catálogo: ${field}.`);
  }

  return parsed;
}

function throwCatalogReadError(source: string, error: { message: string }) {
  throw new Error(`Falha ao consultar ${source}: ${error.message}`);
}

export async function getFoodCatalogProductBase(
  supabase: SupabaseClient,
  productId: string,
  options: CatalogReadOptions = {}
) {
  let query = supabase
    .from("products")
    .select("id, name, price, pricing_mode, active, available")
    .eq("id", productId);

  if (options.publicOnly) {
    query = query.eq("active", true);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throwCatalogReadError("produto", error);
  }

  if (!data) {
    return null;
  }

  const row = data as ProductRow;

  return {
    id: row.id,
    name: row.name,
    price: toCatalogNumber(row.price, "products.price"),
    pricingMode: row.pricing_mode,
    active: row.active,
    available: row.available,
  };
}

export async function getProductVariants(
  supabase: SupabaseClient,
  productId: string,
  options: CatalogReadOptions = {}
): Promise<ProductVariant[]> {
  let query = supabase
    .from("product_variants")
    .select("id, product_id, name, sku, price, active, available, sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (options.publicOnly) {
    query = query.eq("active", true);
  }

  const { data, error } = await query;

  if (error) {
    throwCatalogReadError("variantes", error);
  }

  return ((data ?? []) as ProductVariantRow[]).map((row) => ({
    id: row.id,
    productId: row.product_id,
    name: row.name,
    sku: row.sku,
    price: toCatalogNumber(row.price, "product_variants.price"),
    active: row.active,
    available: row.available,
    sortOrder: row.sort_order,
  }));
}

export async function getProductOptionGroups(
  supabase: SupabaseClient,
  productId: string,
  options: CatalogReadOptions = {}
): Promise<ProductOptionGroup[]> {
  let groupsQuery = supabase
    .from("product_option_groups")
    .select(
      "id, product_id, name, selection_mode, min_selections, max_selections, presentation_mode, active, sort_order"
    )
    .eq("product_id", productId)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (options.publicOnly) {
    groupsQuery = groupsQuery.eq("active", true);
  }

  const { data: groupData, error: groupError } = await groupsQuery;

  if (groupError) {
    throwCatalogReadError("grupos de opções", groupError);
  }

  const groupRows = (groupData ?? []) as ProductOptionGroupRow[];

  if (groupRows.length === 0) {
    return [];
  }

  const groupIds = groupRows.map((group) => group.id);
  let optionsQuery = supabase
    .from("product_options")
    .select(
      "id, option_group_id, name, price_delta, active, available, sort_order"
    )
    .in("option_group_id", groupIds)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (options.publicOnly) {
    optionsQuery = optionsQuery.eq("active", true);
  }

  const { data: optionData, error: optionError } = await optionsQuery;

  if (optionError) {
    throwCatalogReadError("opções", optionError);
  }

  const optionsByGroup = new Map<string, ProductOption[]>();

  for (const row of (optionData ?? []) as ProductOptionRow[]) {
    const option: ProductOption = {
      id: row.id,
      optionGroupId: row.option_group_id,
      name: row.name,
      priceDelta: toCatalogNumber(row.price_delta, "product_options.price_delta"),
      active: row.active,
      available: row.available,
      sortOrder: row.sort_order,
    };
    const current = optionsByGroup.get(option.optionGroupId) ?? [];
    current.push(option);
    optionsByGroup.set(option.optionGroupId, current);
  }

  return groupRows.map((row) => ({
    id: row.id,
    productId: row.product_id,
    name: row.name,
    selectionMode: row.selection_mode,
    minSelections: row.min_selections,
    maxSelections: row.max_selections,
    presentationMode: row.presentation_mode,
    active: row.active,
    sortOrder: row.sort_order,
    options: optionsByGroup.get(row.id) ?? [],
  }));
}

export async function getConfiguredFoodCatalogProduct(
  supabase: SupabaseClient,
  productId: string,
  options: CatalogReadOptions = {}
): Promise<FoodCatalogProduct | null> {
  const product = await getFoodCatalogProductBase(
    supabase,
    productId,
    options
  );

  if (!product) {
    return null;
  }

  const [variants, optionGroups] = await Promise.all([
    getProductVariants(supabase, productId, options),
    getProductOptionGroups(supabase, productId, options),
  ]);

  return {
    ...product,
    variants,
    optionGroups,
  };
}

export async function getFoodCatalogConfigurations(
  supabase: SupabaseClient,
  productIds: readonly string[],
  options: CatalogReadOptions = {}
): Promise<Record<string, FoodCatalogConfiguration>> {
  if (productIds.length === 0) {
    return {};
  }

  let productsQuery = supabase
    .from("products")
    .select("id, pricing_mode")
    .in("id", [...productIds]);
  let variantsQuery = supabase
    .from("product_variants")
    .select("id, product_id, name, sku, price, active, available, sort_order")
    .in("product_id", [...productIds])
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  let groupsQuery = supabase
    .from("product_option_groups")
    .select(
      "id, product_id, name, selection_mode, min_selections, max_selections, presentation_mode, active, sort_order"
    )
    .in("product_id", [...productIds])
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (options.publicOnly) {
    productsQuery = productsQuery.eq("active", true);
    variantsQuery = variantsQuery.eq("active", true);
    groupsQuery = groupsQuery.eq("active", true);
  }

  const [productsResult, variantsResult, groupsResult] = await Promise.all([
    productsQuery,
    variantsQuery,
    groupsQuery,
  ]);

  if (productsResult.error) {
    throwCatalogReadError("produtos configuráveis", productsResult.error);
  }

  if (variantsResult.error) {
    throwCatalogReadError("variantes", variantsResult.error);
  }

  if (groupsResult.error) {
    throwCatalogReadError("grupos de opções", groupsResult.error);
  }

  const groupRows = (groupsResult.data ?? []) as ProductOptionGroupRow[];
  const groupIds = groupRows.map((group) => group.id);
  let catalogOptionsQuery = supabase
    .from("product_options")
    .select(
      "id, option_group_id, name, price_delta, active, available, sort_order"
    )
    .in("option_group_id", groupIds)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (options.publicOnly) {
    catalogOptionsQuery = catalogOptionsQuery.eq("active", true);
  }

  const optionsResult = groupIds.length
    ? await catalogOptionsQuery
    : { data: [], error: null };

  if (optionsResult.error) {
    throwCatalogReadError("opções", optionsResult.error);
  }

  const variantsByProduct = new Map<string, ProductVariant[]>();
  for (const row of (variantsResult.data ?? []) as ProductVariantRow[]) {
    const current = variantsByProduct.get(row.product_id) ?? [];
    current.push({
      id: row.id,
      productId: row.product_id,
      name: row.name,
      sku: row.sku,
      price: toCatalogNumber(row.price, "product_variants.price"),
      active: row.active,
      available: row.available,
      sortOrder: row.sort_order,
    });
    variantsByProduct.set(row.product_id, current);
  }

  const optionsByGroup = new Map<string, ProductOption[]>();
  for (const row of (optionsResult.data ?? []) as ProductOptionRow[]) {
    const current = optionsByGroup.get(row.option_group_id) ?? [];
    current.push({
      id: row.id,
      optionGroupId: row.option_group_id,
      name: row.name,
      priceDelta: toCatalogNumber(
        row.price_delta,
        "product_options.price_delta"
      ),
      active: row.active,
      available: row.available,
      sortOrder: row.sort_order,
    });
    optionsByGroup.set(row.option_group_id, current);
  }

  const groupsByProduct = new Map<string, ProductOptionGroup[]>();
  for (const row of groupRows) {
    const current = groupsByProduct.get(row.product_id) ?? [];
    current.push({
      id: row.id,
      productId: row.product_id,
      name: row.name,
      selectionMode: row.selection_mode,
      minSelections: row.min_selections,
      maxSelections: row.max_selections,
      presentationMode: row.presentation_mode,
      active: row.active,
      sortOrder: row.sort_order,
      options: optionsByGroup.get(row.id) ?? [],
    });
    groupsByProduct.set(row.product_id, current);
  }

  return Object.fromEntries(
    (productsResult.data ?? []).map((row) => [
      row.id,
      {
        pricingMode: row.pricing_mode as CatalogPricingMode,
        variants: variantsByProduct.get(row.id) ?? [],
        optionGroups: groupsByProduct.get(row.id) ?? [],
      },
    ])
  );
}

export function createFoodCatalogProductRepository(
  supabase: SupabaseClient
): FoodCatalogProductRepository {
  return {
    getProductById(productId) {
      return getConfiguredFoodCatalogProduct(supabase, productId);
    },
  };
}
