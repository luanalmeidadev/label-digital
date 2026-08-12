"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

async function ensureAdmin() {
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

  return supabase;
}

function revalidateProducts() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/produtos");
}

export async function createProduct(formData: FormData) {
  const supabase = await ensureAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "");
  const description = String(
    formData.get("description") ?? ""
  ).trim();
  const price = Number(formData.get("price"));

  const available = formData.get("available") === "on";
  const featured = formData.get("featured") === "on";
  const active = formData.get("active") === "on";

  if (name.length < 2 || name.length > 100) {
    throw new Error("Nome de produto inválido.");
  }

  if (!categoryId) {
    throw new Error("Selecione uma categoria.");
  }

  if (Number.isNaN(price) || price < 0) {
    throw new Error("Preço inválido.");
  }

  const { data: lastProduct } = await supabase
    .from("products")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSortOrder =
    (lastProduct?.sort_order ?? 0) + 1;

  const { error } = await supabase
    .from("products")
    .insert({
      name,
      category_id: categoryId,
      description: description || null,
      price,
      product_type: "ready",
      available,
      featured,
      active,
      sort_order: nextSortOrder,
    });

  if (error) {
    throw new Error("Não foi possível cadastrar o produto.");
  }

  revalidateProducts();
}

export async function updateProduct(formData: FormData) {
  const supabase = await ensureAdmin();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "");
  const description = String(
    formData.get("description") ?? ""
  ).trim();
  const price = Number(formData.get("price"));

  const available = formData.get("available") === "on";
  const featured = formData.get("featured") === "on";
  const active = formData.get("active") === "on";

  if (!id) {
    throw new Error("Produto inválido.");
  }

  if (name.length < 2 || name.length > 100) {
    throw new Error("Nome de produto inválido.");
  }

  if (!categoryId) {
    throw new Error("Selecione uma categoria.");
  }

  if (Number.isNaN(price) || price < 0) {
    throw new Error("Preço inválido.");
  }

  const { error } = await supabase
    .from("products")
    .update({
      name,
      category_id: categoryId,
      description: description || null,
      price,
      available,
      featured,
      active,
    })
    .eq("id", id);

  if (error) {
    throw new Error("Não foi possível atualizar o produto.");
  }

  revalidateProducts();
}

export async function toggleProductAvailability(formData: FormData) {
  const supabase = await ensureAdmin();

  const id = String(formData.get("id") ?? "");
  const available =
    String(formData.get("available") ?? "") === "true";

  if (!id) {
    throw new Error("Produto inválido.");
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

export async function toggleProductStatus(formData: FormData) {
  const supabase = await ensureAdmin();

  const id = String(formData.get("id") ?? "");
  const active =
    String(formData.get("active") ?? "") === "true";

  if (!id) {
    throw new Error("Produto inválido.");
  }

  const { error } = await supabase
    .from("products")
    .update({
      active: !active,
    })
    .eq("id", id);

  if (error) {
    throw new Error("Não foi possível alterar o status.");
  }

  revalidateProducts();
}

export async function deleteProduct(formData: FormData) {
  const supabase = await ensureAdmin();

  const id = String(formData.get("id") ?? "");

  if (!id) {
    throw new Error("Produto inválido.");
  }

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error("Não foi possível excluir o produto.");
  }

  revalidateProducts();
}