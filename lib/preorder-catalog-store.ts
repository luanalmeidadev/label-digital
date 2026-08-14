import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  preorderCategories,
  type PreorderCategory,
} from "@/lib/preorder-menu";

export const preorderStorageBucket =
  "preorder-catalog";
const catalogPath = "catalog.json";

function cloneDefaultCatalog() {
  return JSON.parse(
    JSON.stringify(preorderCategories)
  ) as PreorderCategory[];
}

function isValidCatalog(
  value: unknown
): value is PreorderCategory[] {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every(
    (category) =>
      category &&
      typeof category === "object" &&
      typeof category.id === "string" &&
      typeof category.name === "string" &&
      Array.isArray(category.products) &&
      category.products.every(
        (product: unknown) =>
          product &&
          typeof product === "object" &&
          typeof (
            product as { name?: unknown }
          ).name === "string" &&
          Array.isArray(
            (
              product as {
                prices?: unknown;
              }
            ).prices
          )
      )
  );
}

async function ensureBucket() {
  const supabase =
    createSupabaseAdminClient();
  const { data: buckets, error } =
    await supabase.storage.listBuckets();

  if (error) {
    throw new Error(
      "Não foi possível acessar o armazenamento do catálogo."
    );
  }

  if (
    !buckets.some(
      (bucket) =>
        bucket.name === preorderStorageBucket
    )
  ) {
    const { error: createError } =
      await supabase.storage.createBucket(
        preorderStorageBucket,
        {
          public: false,
          fileSizeLimit: 1024 * 1024,
          allowedMimeTypes: [
            "application/json",
          ],
        }
      );

    if (createError) {
      throw new Error(
        "Não foi possível preparar o catálogo de encomendas."
      );
    }
  }

  return supabase;
}

export async function getPreorderStorageClient() {
  return ensureBucket();
}

export async function savePreorderCatalog(
  catalog: PreorderCategory[]
) {
  const supabase = await ensureBucket();
  const body = new Blob(
    [JSON.stringify(catalog, null, 2)],
    {
      type: "application/json",
    }
  );

  const { error } = await supabase.storage
    .from(preorderStorageBucket)
    .upload(catalogPath, body, {
      contentType: "application/json",
      cacheControl: "0",
      upsert: true,
    });

  if (error) {
    throw new Error(
      "Não foi possível salvar o catálogo de encomendas."
    );
  }
}

export async function getPreorderCatalog() {
  try {
    const supabase = await ensureBucket();
    const { data, error } = await supabase.storage
      .from(preorderStorageBucket)
      .download(catalogPath);

    if (error) {
      const initialCatalog =
        cloneDefaultCatalog();
      await savePreorderCatalog(initialCatalog);
      return initialCatalog;
    }

    const parsed: unknown = JSON.parse(
      await data.text()
    );

    if (!isValidCatalog(parsed)) {
      throw new Error(
        "O catálogo salvo possui formato inválido."
      );
    }

    return parsed;
  } catch (error) {
    console.error(
      "Erro ao carregar catálogo de encomendas:",
      error
    );
    return cloneDefaultCatalog();
  }
}

export async function getPreorderCatalogForUpdate() {
  const supabase = await ensureBucket();
  const { data, error } = await supabase.storage
    .from(preorderStorageBucket)
    .download(catalogPath);

  if (error) {
    throw new Error(
      "Não foi possível carregar a versão atual do catálogo. Tente novamente."
    );
  }

  const parsed: unknown = JSON.parse(
    await data.text()
  );

  if (!isValidCatalog(parsed)) {
    throw new Error(
      "O catálogo salvo possui formato inválido."
    );
  }

  return parsed;
}
