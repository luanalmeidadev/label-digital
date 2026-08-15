"use server";

import { revalidatePath } from "next/cache";
import { requireAdminPermission } from "@/lib/admin-auth";

async function requireCatalogAccess() {
  const access =
    await requireAdminPermission("catalog");
  return access.supabase;
}

function createSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function createCategory(formData: FormData) {
  const supabase = await requireCatalogAccess();

  const name = String(formData.get("name") ?? "").trim();

  if (name.length < 2 || name.length > 50) {
    throw new Error("O nome da categoria deve ter entre 2 e 50 caracteres.");
  }

  const slug = createSlug(name);

  if (!slug) {
    throw new Error("Nome de categoria inválido.");
  }

  const { data: existingCategory } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existingCategory) {
    throw new Error("Já existe uma categoria com esse nome.");
  }

  const { data: lastCategory } = await supabase
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSortOrder = (lastCategory?.sort_order ?? 0) + 1;

  const { error } = await supabase.from("categories").insert({
    name,
    slug,
    active: true,
    sort_order: nextSortOrder,
  });

  if (error) {
    throw new Error("Não foi possível criar a categoria.");
  }

  revalidatePath("/");
  revalidatePath("/admin/categorias");
}
export async function updateCategory(formData: FormData) {
  const supabase = await requireCatalogAccess();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!id) {
    throw new Error("Categoria inválida.");
  }

  if (name.length < 2 || name.length > 50) {
    throw new Error("O nome da categoria deve ter entre 2 e 50 caracteres.");
  }

  const slug = createSlug(name);

  const { data: duplicate } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .neq("id", id)
    .maybeSingle();

  if (duplicate) {
    throw new Error("Já existe outra categoria com esse nome.");
  }

  const { error } = await supabase
    .from("categories")
    .update({
      name,
      slug,
    })
    .eq("id", id);

  if (error) {
    throw new Error("Não foi possível atualizar a categoria.");
  }

  revalidatePath("/");
  revalidatePath("/admin/categorias");
}

export async function toggleCategoryStatus(formData: FormData) {
  const supabase = await requireCatalogAccess();

  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";

  if (!id) {
    throw new Error("Categoria inválida.");
  }

  const { error } = await supabase
    .from("categories")
    .update({
      active: !active,
    })
    .eq("id", id);

  if (error) {
    throw new Error("Não foi possível alterar o status da categoria.");
  }

  revalidatePath("/");
  revalidatePath("/admin/categorias");
}

export async function moveCategory(formData: FormData) {
  const supabase = await requireCatalogAccess();

  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");

  if (!id || !["up", "down"].includes(direction)) {
    throw new Error("Movimentação inválida.");
  }

  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, sort_order")
    .order("sort_order");

  if (error || !categories) {
    throw new Error("Não foi possível carregar as categorias.");
  }

  const currentIndex = categories.findIndex(
    (category) => category.id === id
  );

  if (currentIndex === -1) {
    throw new Error("Categoria não encontrada.");
  }

  const targetIndex =
    direction === "up"
      ? currentIndex - 1
      : currentIndex + 1;

  if (
    targetIndex < 0 ||
    targetIndex >= categories.length
  ) {
    return;
  }

  const current = categories[currentIndex];
  const target = categories[targetIndex];

  const { error: currentError } = await supabase
    .from("categories")
    .update({
      sort_order: target.sort_order,
    })
    .eq("id", current.id);

  if (currentError) {
    throw new Error("Não foi possível reordenar as categorias.");
  }

  const { error: targetError } = await supabase
    .from("categories")
    .update({
      sort_order: current.sort_order,
    })
    .eq("id", target.id);

  if (targetError) {
    throw new Error("Não foi possível reordenar as categorias.");
  }

  revalidatePath("/");
  revalidatePath("/admin/categorias");
}

export async function deleteCategory(formData: FormData) {
  const supabase = await requireCatalogAccess();

  const id = String(formData.get("id") ?? "");

  if (!id) {
    throw new Error("Categoria inválida.");
  }

  const { count, error: productError } = await supabase
    .from("products")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("category_id", id);

  if (productError) {
    throw new Error(
      "Não foi possível verificar os produtos da categoria."
    );
  }

  if ((count ?? 0) > 0) {
    throw new Error(
      "Esta categoria possui produtos vinculados e não pode ser excluída."
    );
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error("Não foi possível excluir a categoria.");
  }

  revalidatePath("/");
  revalidatePath("/admin/categorias");
}
