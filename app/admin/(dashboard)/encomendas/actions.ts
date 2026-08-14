"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getPreorderCatalogForUpdate,
  savePreorderCatalog,
} from "@/lib/preorder-catalog-store";
import type {
  PreorderCategory,
  PreorderPrice,
} from "@/lib/preorder-menu";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UpdatePreorderProductResult = {
  success: boolean;
  error?: string;
};

async function requireAdmin() {
  const supabase =
    await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: admin } = await supabase
    .from("admin_profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!admin) {
    throw new Error("Acesso não autorizado.");
  }
}

function parsePrices(
  value: FormDataEntryValue | null
) {
  try {
    const parsed: unknown = JSON.parse(
      String(value ?? "[]")
    );

    if (
      !Array.isArray(parsed) ||
      parsed.length < 1 ||
      parsed.length > 10
    ) {
      return null;
    }

    const prices = parsed.map((item) => ({
      label: String(item?.label ?? "").trim(),
      value: String(item?.value ?? "").trim(),
    }));

    if (
      prices.some(
        (price) =>
          price.label.length < 1 ||
          price.label.length > 80 ||
          price.value.length < 1 ||
          price.value.length > 40
      )
    ) {
      return null;
    }

    return prices satisfies PreorderPrice[];
  } catch {
    return null;
  }
}

function parseFlavors(
  value: FormDataEntryValue | null
) {
  try {
    const parsed: unknown = JSON.parse(
      String(value ?? "[]")
    );

    if (
      !Array.isArray(parsed) ||
      parsed.length > 40
    ) {
      return null;
    }

    const flavors = parsed.map((item) =>
      String(item).trim()
    );

    if (
      flavors.some(
        (flavor) =>
          flavor.length < 1 ||
          flavor.length > 80
      )
    ) {
      return null;
    }

    return [...new Set(flavors)];
  } catch {
    return null;
  }
}

export async function updatePreorderProduct(
  formData: FormData
): Promise<UpdatePreorderProductResult> {
  await requireAdmin();

  const categoryId = String(
    formData.get("category_id") ?? ""
  );
  const productName = String(
    formData.get("product_name") ?? ""
  );
  const quantityUnit = String(
    formData.get("quantity_unit") ?? ""
  ).trim();
  const minimumQuantity = Number(
    formData.get("minimum_quantity")
  );
  const leadTimeDays = Number(
    formData.get("lead_time_days")
  );
  const maxFlavorsValue = String(
    formData.get("max_flavors") ?? ""
  ).trim();
  const maxFlavors = maxFlavorsValue
    ? Number(maxFlavorsValue)
    : undefined;
  const prices = parsePrices(
    formData.get("prices")
  );
  const flavors = parseFlavors(
    formData.get("flavors")
  );

  if (!categoryId || !productName) {
    return {
      success: false,
      error: "Produto de encomenda inválido.",
    };
  }

  if (!prices) {
    return {
      success: false,
      error:
        "Adicione pelo menos uma opção com nome e preço.",
    };
  }

  if (!flavors) {
    return {
      success: false,
      error: "Revise a lista de sabores.",
    };
  }

  if (
    !Number.isInteger(minimumQuantity) ||
    minimumQuantity < 1 ||
    minimumQuantity > 10000
  ) {
    return {
      success: false,
      error: "Informe uma quantidade mínima válida.",
    };
  }

  if (
    quantityUnit.length < 1 ||
    quantityUnit.length > 30
  ) {
    return {
      success: false,
      error: "Informe uma unidade de quantidade válida.",
    };
  }

  if (
    !Number.isInteger(leadTimeDays) ||
    leadTimeDays < 1 ||
    leadTimeDays > 365
  ) {
    return {
      success: false,
      error: "Informe uma antecedência válida.",
    };
  }

  if (
    maxFlavors !== undefined &&
    (!Number.isInteger(maxFlavors) ||
      maxFlavors < 1 ||
      maxFlavors > flavors.length)
  ) {
    return {
      success: false,
      error:
        "O limite de sabores deve respeitar a quantidade de sabores cadastrados.",
    };
  }

  let catalog: PreorderCategory[];

  try {
    catalog =
      await getPreorderCatalogForUpdate();
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível carregar o catálogo.",
    };
  }
  const category = catalog.find(
    (item) => item.id === categoryId
  );
  const product = category?.products.find(
    (item) => item.name === productName
  );

  if (!product) {
    return {
      success: false,
      error: "Produto não encontrado.",
    };
  }

  product.prices = prices;
  product.flavors =
    flavors.length > 0 ? flavors : undefined;
  product.minimumQuantity = minimumQuantity;
  product.quantityUnit = quantityUnit;
  product.leadTimeDays = leadTimeDays;
  product.maxFlavors = maxFlavors;

  try {
    await savePreorderCatalog(catalog);
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o produto.",
    };
  }

  revalidatePath("/encomendas");
  revalidatePath("/admin/encomendas");

  return { success: true };
}
