"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  const supabase = await createSupabaseServerClient();

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
  const supabase = await createSupabaseServerClient();

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
  const supabase = await createSupabaseServerClient();

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