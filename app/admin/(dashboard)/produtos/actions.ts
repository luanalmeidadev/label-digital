"use server";

import { revalidatePath } from "next/cache";

import { requireAdminPermission } from "@/lib/admin-auth";
import { recordAdminAudit } from "@/lib/admin-audit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getImageDisplaySettings,
  removeDailyProductZoom,
  setDailyProductZoom,
} from "@/lib/image-display-settings-store";

const PRODUCT_BUCKET = "product-images";

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/* ------------------------------------------------ */
/* AUTENTICAÇÃO */
/* ------------------------------------------------ */

async function ensureAdmin() {
  const access =
    await requireAdminPermission("catalog");
  return access.supabase;
}

/* ------------------------------------------------ */
/* REVALIDAÇÃO */
/* ------------------------------------------------ */

function revalidateProducts() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/produtos");
}

/* ------------------------------------------------ */
/* HELPERS DE IMAGEM */
/* ------------------------------------------------ */

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

  return `products/${crypto.randomUUID()}.${extension}`;
}

function extractStoragePath(
  imageUrl: string | null
) {
  if (!imageUrl) {
    return null;
  }

  const marker =
    `/storage/v1/object/public/${PRODUCT_BUCKET}/`;

  const markerIndex =
    imageUrl.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  const path = imageUrl.slice(
    markerIndex + marker.length
  );

  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

async function uploadProductImage(
  supabase: Awaited<
    ReturnType<typeof createSupabaseServerClient>
  >,
  image: File
) {
  validateImage(image);

  const filePath = createImagePath(image);

  const { error } = await supabase.storage
    .from(PRODUCT_BUCKET)
    .upload(filePath, image, {
      contentType: image.type,
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
    .from(PRODUCT_BUCKET)
    .getPublicUrl(filePath);

  return {
    filePath,
    publicUrl,
  };
}

async function removeProductImage(
  supabase: Awaited<
    ReturnType<typeof createSupabaseServerClient>
  >,
  imageUrl: string | null
) {
  const filePath =
    extractStoragePath(imageUrl);

  if (!filePath) {
    return;
  }

  const { error } = await supabase.storage
    .from(PRODUCT_BUCKET)
    .remove([filePath]);

  if (error) {
    console.error(
      "Erro ao remover imagem do Storage:",
      error.message
    );
  }
}

/* ------------------------------------------------ */
/* CRIAR PRODUTO */
/* ------------------------------------------------ */

export async function createProduct(
  formData: FormData
) {
  const supabase =
    await ensureAdmin();

  const name = String(
    formData.get("name") ?? ""
  ).trim();

  const categoryId = String(
    formData.get("category_id") ?? ""
  );

  const description = String(
    formData.get("description") ?? ""
  ).trim();

  const price = Number(
    formData.get("price")
  );

  const imagePositionX = Number(
    formData.get("image_position_x") ?? 50
  );

  const imagePositionY = Number(
    formData.get("image_position_y") ?? 50
  );

  const imageZoom = Number(
    formData.get("image_zoom") ?? 100
  );

  const available =
    formData.get("available") === "on";

  const featured =
    formData.get("featured") === "on";

  const active =
    formData.get("active") === "on";

  const image =
    formData.get("image");

  if (
    name.length < 2 ||
    name.length > 100
  ) {
    throw new Error(
      "O nome do produto deve ter entre 2 e 100 caracteres."
    );
  }

  if (!categoryId) {
    throw new Error(
      "Selecione uma categoria."
    );
  }

  if (
    Number.isNaN(price) ||
    price < 0
  ) {
    throw new Error(
      "Informe um preço válido."
    );
  }

  if (
    Number.isNaN(imagePositionX) ||
    imagePositionX < 0 ||
    imagePositionX > 100 ||
    Number.isNaN(imagePositionY) ||
    imagePositionY < 0 ||
    imagePositionY > 100 ||
    Number.isNaN(imageZoom) ||
    imageZoom < 100 ||
    imageZoom > 180
  ) {
    throw new Error(
      "Posição da imagem inválida."
    );
  }

  const { data: category } =
    await supabase
      .from("categories")
      .select("id")
      .eq("id", categoryId)
      .single();

  if (!category) {
    throw new Error(
      "Categoria inválida."
    );
  }

  let imageUrl: string | null = null;
  let uploadedPath: string | null = null;

  if (
    image instanceof File &&
    image.size > 0
  ) {
    const upload =
      await uploadProductImage(
        supabase,
        image
      );

    imageUrl = upload.publicUrl;
    uploadedPath = upload.filePath;
  }

  const { data: lastProduct } =
    await supabase
      .from("products")
      .select("sort_order")
      .order("sort_order", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

  const nextSortOrder =
    (lastProduct?.sort_order ?? 0) + 1;

  const { data: createdProduct, error } = await supabase
    .from("products")
    .insert({
      name,
      category_id: categoryId,
      description:
        description || null,
      price,
      image_url: imageUrl,
      image_position_x: imagePositionX,
      image_position_y: imagePositionY,
      product_type: "ready",
      available,
      featured,
      active,
      sort_order: nextSortOrder,
    })
    .select("id")
    .single();

  if (error || !createdProduct) {
    if (uploadedPath) {
      await supabase.storage
        .from(PRODUCT_BUCKET)
        .remove([uploadedPath]);
    }

    throw new Error(
      "Não foi possível cadastrar o produto."
    );
  }

  if (imageZoom !== 100) {
    try {
      await setDailyProductZoom(
        createdProduct.id,
        imageZoom
      );
    } catch {
      await supabase
        .from("products")
        .delete()
        .eq("id", createdProduct.id);

      if (uploadedPath) {
        await supabase.storage
          .from(PRODUCT_BUCKET)
          .remove([uploadedPath]);
      }

      throw new Error(
        "Não foi possível salvar o enquadramento da imagem."
      );
    }
  }

  revalidateProducts();
}

/* ------------------------------------------------ */
/* EDITAR PRODUTO */
/* ------------------------------------------------ */

export async function updateProduct(
  formData: FormData
) {
  const access =
    await requireAdminPermission("catalog");
  const { supabase } = access;

  const id = String(
    formData.get("id") ?? ""
  );

  const name = String(
    formData.get("name") ?? ""
  ).trim();

  const categoryId = String(
    formData.get("category_id") ?? ""
  );

  const description = String(
    formData.get("description") ?? ""
  ).trim();

  const price = Number(
    formData.get("price")
      );

      const imagePositionX = Number(
      formData.get("image_position_x") ?? 50
    );

    const imagePositionY = Number(
      formData.get("image_position_y") ?? 50
    );

    const imageZoom = Number(
      formData.get("image_zoom") ?? 100
    );

  const available =
    formData.get("available") === "on";

  const featured =
    formData.get("featured") === "on";

  const active =
    formData.get("active") === "on";

  const removeImage =
    String(
      formData.get("remove_image") ?? ""
    ) === "true";

  const newImage =
    formData.get("image");

  if (!id) {
    throw new Error(
      "Produto inválido."
    );
  }

  if (
    name.length < 2 ||
    name.length > 100
  ) {
    throw new Error(
      "Nome de produto inválido."
    );
  }

  if (!categoryId) {
    throw new Error(
      "Selecione uma categoria."
    );
  }

  if (
    Number.isNaN(price) ||
    price < 0
  ) {
    throw new Error(
      "Preço inválido."
    );
  }

  if (
    Number.isNaN(imagePositionX) ||
    imagePositionX < 0 ||
    imagePositionX > 100 ||
    Number.isNaN(imagePositionY) ||
    imagePositionY < 0 ||
    imagePositionY > 100 ||
    Number.isNaN(imageZoom) ||
    imageZoom < 100 ||
    imageZoom > 180
  ) {
    throw new Error(
      "Posição da imagem inválida."
    );
  }

  const { data: product } =
    await supabase
      .from("products")
      .select("id, image_url")
      .eq("id", id)
      .single();

  if (!product) {
    throw new Error(
      "Produto não encontrado."
    );
  }

  const oldImageUrl =
    product.image_url as string | null;
  const imageSettings =
    await getImageDisplaySettings();
  const previousImageZoom =
    imageSettings.dailyProductZoom[id] ?? 100;

  let nextImageUrl =
    oldImageUrl;

  let newlyUploadedPath:
    | string
    | null = null;

  /*
   * Se uma nova imagem foi selecionada,
   * ela tem prioridade sobre "remover".
   */
  if (
    newImage instanceof File &&
    newImage.size > 0
  ) {
    const upload =
      await uploadProductImage(
        supabase,
        newImage
      );

    nextImageUrl =
      upload.publicUrl;

    newlyUploadedPath =
      upload.filePath;
  } else if (removeImage) {
    nextImageUrl = null;
  }

  const { error } = await supabase
    .from("products")
    .update({
      name,
      category_id: categoryId,
      description:
        description || null,
      price,
      image_url: nextImageUrl,
      image_position_x: imagePositionX,
      image_position_y: imagePositionY,
      available,
      featured,
      active,
    })
    .eq("id", id);

  /*
   * Se o banco falhar depois de subir
   * uma nova imagem, removemos a nova
   * imagem para não criar arquivo órfão.
   */
  if (error) {
    if (newlyUploadedPath) {
      await supabase.storage
        .from(PRODUCT_BUCKET)
        .remove([
          newlyUploadedPath,
        ]);
    }

    throw new Error(
      "Não foi possível atualizar o produto."
    );
  }

  /*
   * Só apagamos a imagem antiga depois
   * que o banco confirmou a atualização.
   */
  const imageChanged =
    nextImageUrl !== oldImageUrl;

  if (
    imageChanged &&
    oldImageUrl
  ) {
    await removeProductImage(
      supabase,
      oldImageUrl
    );
  }

  await setDailyProductZoom(id, imageZoom);

  if (
    imageChanged ||
    previousImageZoom !== imageZoom
  ) {
    await recordAdminAudit(access, {
      action: "updated",
      entityType: "product",
      entityId: id,
      summary: `Atualizou a imagem do produto “${name}”`,
      metadata: {
        image_changed: imageChanged,
        image_zoom: {
          before: previousImageZoom,
          after: imageZoom,
        },
      },
    });
  }

  revalidateProducts();
}

/* ------------------------------------------------ */
/* REORDENAR DENTRO DA CATEGORIA */
/* ------------------------------------------------ */

export async function moveProduct(
  formData: FormData
) {
  const supabase = await ensureAdmin();

  const id = String(
    formData.get("id") ?? ""
  );

  const direction = String(
    formData.get("direction") ?? ""
  );

  if (
    !id ||
    !["up", "down"].includes(direction)
  ) {
    throw new Error(
      "Movimentação inválida."
    );
  }

  const { data: products, error } =
    await supabase
      .from("products")
      .select(
        "id, category_id, sort_order"
      )
      .order("sort_order")
      .order("id");

  if (error || !products) {
    throw new Error(
      "Não foi possível carregar os produtos."
    );
  }

  const current = products.find(
    (product) => product.id === id
  );

  if (!current) {
    throw new Error(
      "Produto não encontrado."
    );
  }

  const categoryProducts = products.filter(
    (product) =>
      product.category_id ===
      current.category_id
  );

  const currentIndex =
    categoryProducts.findIndex(
      (product) => product.id === id
    );

  const targetIndex =
    direction === "up"
      ? currentIndex - 1
      : currentIndex + 1;

  if (
    currentIndex === -1 ||
    targetIndex < 0 ||
    targetIndex >=
      categoryProducts.length
  ) {
    return;
  }

  const target =
    categoryProducts[targetIndex];

  const { error: currentError } =
    await supabase
      .from("products")
      .update({
        sort_order: target.sort_order,
      })
      .eq("id", current.id);

  if (currentError) {
    throw new Error(
      "Não foi possível reordenar os produtos."
    );
  }

  const { error: targetError } =
    await supabase
      .from("products")
      .update({
        sort_order: current.sort_order,
      })
      .eq("id", target.id);

  if (targetError) {
    const { error: rollbackError } =
      await supabase
        .from("products")
        .update({
          sort_order: current.sort_order,
        })
        .eq("id", current.id);

    if (rollbackError) {
      console.error(
        "Erro ao restaurar a ordem do produto:",
        rollbackError.message
      );
    }

    throw new Error(
      "Não foi possível reordenar os produtos."
    );
  }

  revalidateProducts();
}

/* ------------------------------------------------ */
/* DISPONÍVEL / ESGOTADO */
/* ------------------------------------------------ */

export async function toggleProductAvailability(
  formData: FormData
) {
  const supabase =
    await ensureAdmin();

  const id = String(
    formData.get("id") ?? ""
  );

  const available =
    String(
      formData.get("available") ?? ""
    ) === "true";

  if (!id) {
    throw new Error(
      "Produto inválido."
    );
  }

  const { error } = await supabase
    .from("products")
    .update({
      available: !available,
    })
    .eq("id", id);

  if (error) {
    throw new Error(
      "Não foi possível alterar a disponibilidade."
    );
  }

  revalidateProducts();
}

/* ------------------------------------------------ */
/* ATIVAR / DESATIVAR */
/* ------------------------------------------------ */

export async function toggleProductStatus(
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
      "Produto inválido."
    );
  }

  const { error } = await supabase
    .from("products")
    .update({
      active: !active,
    })
    .eq("id", id);

  if (error) {
    throw new Error(
      "Não foi possível alterar o status."
    );
  }

  revalidateProducts();
}

/* ------------------------------------------------ */
/* EXCLUIR PRODUTO */
/* ------------------------------------------------ */

export async function deleteProduct(
  formData: FormData
) {
  const supabase =
    await ensureAdmin();

  const id = String(
    formData.get("id") ?? ""
  );

  if (!id) {
    throw new Error(
      "Produto inválido."
    );
  }

  /*
   * Pegamos a imagem antes de apagar
   * o produto.
   */
  const { data: product } =
    await supabase
      .from("products")
      .select("id, image_url")
      .eq("id", id)
      .single();

  if (!product) {
    throw new Error(
      "Produto não encontrado."
    );
  }

  const imageUrl =
    product.image_url as string | null;

  /*
   * Primeiro apagamos o registro.
   */
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(
      "Não foi possível excluir o produto."
    );
  }

  /*
   * Somente depois removemos a imagem.
   */
  if (imageUrl) {
    await removeProductImage(
      supabase,
      imageUrl
    );
  }

  await removeDailyProductZoom(id);

  revalidateProducts();
}
