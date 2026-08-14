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

const PRODUCT_IMAGE_BUCKET = "product-images";
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

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

  return supabase;
}

function parseAllowedQuantities(
  value: FormDataEntryValue | null
) {
  const text = String(value ?? "").trim();

  if (!text) {
    return [];
  }

  const quantities = text
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map(Number);

  if (
    quantities.length > 20 ||
    quantities.some(
      (quantity) =>
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 10000
    )
  ) {
    return null;
  }

  return [...new Set(quantities)].sort(
    (first, second) => first - second
  );
}

function parseOptionalPositiveInteger(
  value: FormDataEntryValue | null
) {
  const text = String(value ?? "").trim();

  if (!text) {
    return undefined;
  }

  const parsed = Number(text);

  return Number.isInteger(parsed) &&
    parsed >= 1 &&
    parsed <= 10000
    ? parsed
    : null;
}

function validateImage(image: File) {
  if (!ALLOWED_IMAGE_TYPES.includes(image.type)) {
    throw new Error(
      "Formato de imagem inválido. Use JPG, PNG ou WebP."
    );
  }

  if (image.size > MAX_IMAGE_SIZE) {
    throw new Error(
      "A imagem deve ter no máximo 5 MB."
    );
  }
}

function createImagePath(image: File) {
  const extension =
    image.name
      .split(".")
      .pop()
      ?.toLowerCase() ?? "jpg";

  return `preorders/${crypto.randomUUID()}.${extension}`;
}

function extractStoragePath(imageUrl: string) {
  const marker = `/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/`;
  const markerIndex = imageUrl.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  const path = imageUrl.slice(
    markerIndex + marker.length
  );

  try {
    const decodedPath = decodeURIComponent(path);
    return decodedPath.startsWith("preorders/")
      ? decodedPath
      : null;
  } catch {
    return path.startsWith("preorders/")
      ? path
      : null;
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
  const supabase = await requireAdmin();

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
  const allowedQuantities =
    parseAllowedQuantities(
      formData.get("allowed_quantities")
    );
  const priceBaseQuantity = Number(
    formData.get("price_base_quantity")
  );
  const quantityIncrement =
    parseOptionalPositiveInteger(
      formData.get("quantity_increment")
    );
  const flavorQuantityStep =
    parseOptionalPositiveInteger(
      formData.get("flavor_quantity_step")
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
  const imagePositionX = Number(
    formData.get("image_position_x") ?? 50
  );
  const imagePositionY = Number(
    formData.get("image_position_y") ?? 50
  );
  const newImage = formData.get("image");

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

  if (!allowedQuantities) {
    return {
      success: false,
      error:
        "Revise as quantidades disponíveis.",
    };
  }

  if (quantityIncrement === null) {
    return {
      success: false,
      error:
        "Informe um incremento de quantidade válido.",
    };
  }

  if (flavorQuantityStep === null) {
    return {
      success: false,
      error:
        "Informe uma quantidade por sabor válida.",
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
    !Number.isInteger(priceBaseQuantity) ||
    priceBaseQuantity < 1 ||
    priceBaseQuantity > 10000
  ) {
    return {
      success: false,
      error:
        "Informe a quantidade correspondente ao preço.",
    };
  }

  if (
    allowedQuantities.length > 0 &&
    (allowedQuantities[0] !== minimumQuantity ||
      allowedQuantities.some(
        (quantity) => quantity < minimumQuantity
      ))
  ) {
    return {
      success: false,
      error:
        "A menor quantidade disponível deve ser igual à quantidade mínima.",
    };
  }

  if (
    !Number.isFinite(imagePositionX) ||
    imagePositionX < 0 ||
    imagePositionX > 100 ||
    !Number.isFinite(imagePositionY) ||
    imagePositionY < 0 ||
    imagePositionY > 100
  ) {
    return {
      success: false,
      error: "Posição da imagem inválida.",
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

  const oldImage = product.image;
  let nextImage = oldImage;
  let uploadedImagePath: string | null = null;

  if (
    newImage instanceof File &&
    newImage.size > 0
  ) {
    try {
      validateImage(newImage);
      uploadedImagePath = createImagePath(newImage);
      const { error } = await supabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .upload(uploadedImagePath, newImage, {
          contentType: newImage.type,
          upsert: false,
        });

      if (error) {
        throw new Error(
          `Não foi possível enviar a imagem: ${error.message}`
        );
      }

      const {
        data: { publicUrl },
      } = supabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .getPublicUrl(uploadedImagePath);

      nextImage = publicUrl;
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível enviar a imagem.",
      };
    }
  }

  product.prices = prices;
  product.flavors =
    flavors.length > 0 ? flavors : undefined;
  product.minimumQuantity = minimumQuantity;
  product.allowedQuantities =
    allowedQuantities.length > 0
      ? allowedQuantities
      : undefined;
  product.quantityIncrement = quantityIncrement;
  product.quantityUnit = quantityUnit;
  product.priceBaseQuantity = priceBaseQuantity;
  product.leadTimeDays = leadTimeDays;
  product.maxFlavors = maxFlavors;
  product.flavorQuantityStep =
    flavorQuantityStep;
  product.image = nextImage;
  product.imagePositionX = imagePositionX;
  product.imagePositionY = imagePositionY;

  try {
    await savePreorderCatalog(catalog);
  } catch (error) {
    if (uploadedImagePath) {
      await supabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .remove([uploadedImagePath]);
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível salvar o produto.",
    };
  }

  if (nextImage !== oldImage) {
    const oldImagePath =
      extractStoragePath(oldImage);

    if (oldImagePath) {
      const { error } = await supabase.storage
        .from(PRODUCT_IMAGE_BUCKET)
        .remove([oldImagePath]);

      if (error) {
        console.error(
          "Erro ao remover imagem antiga da encomenda:",
          error.message
        );
      }
    }
  }

  revalidatePath("/encomendas");
  revalidatePath("/admin/encomendas");

  return { success: true };
}
