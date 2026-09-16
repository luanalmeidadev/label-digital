"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPublicInstallationProfile } from "@/config/installation/public";
import { getEndOfDayUTC } from "@/lib/timezone";

export async function createCoupon(formData: FormData) {
  const code = formData.get("code")?.toString().trim().toUpperCase();
  const discountPercentStr = formData.get("discount_percent")?.toString();
  const expiresAtStr = formData.get("expires_at")?.toString();

  if (!code || !/^[A-Z0-9_-]{1,20}$/.test(code)) {
    throw new Error("O código deve ter até 20 caracteres (apenas letras, números, hífen e underline).");
  }

  const discountPercent = Number(discountPercentStr);
  if (isNaN(discountPercent) || discountPercent <= 0 || discountPercent > 100) {
    throw new Error("O desconto deve ser entre 1 e 100%.");
  }

  let expiresAt: string | null = null;
  if (expiresAtStr) {
    const installation = getPublicInstallationProfile();
    const timeZone = installation.regionalization.timeZone || "America/Sao_Paulo";

    expiresAt = getEndOfDayUTC(expiresAtStr, timeZone).toISOString();
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("coupons").insert({
    code,
    discount_percent: discountPercent,
    expires_at: expiresAt,
  });

  if (error) {
    console.error("Erro ao criar cupom:", error);
    if (error.code === "23505") {
      throw new Error("Já existe um cupom com este código.");
    }
    throw new Error("Não foi possível criar o cupom.");
  }

  revalidatePath("/admin/cupons");
}

export async function toggleCouponStatus(formData: FormData) {
  const id = formData.get("id")?.toString();
  const currentActive = formData.get("active") === "true";

  if (!id) {
    throw new Error("Cupom inválido.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("coupons")
    .update({ active: !currentActive })
    .eq("id", id);

  if (error) {
    console.error("Erro ao atualizar cupom:", error);
    throw new Error("Não foi possível atualizar o status.");
  }

  revalidatePath("/admin/cupons");
}


export async function updateCoupon(formData: FormData) {
  const id = formData.get('id')?.toString();
  const code = formData.get('code')?.toString().trim().toUpperCase();
  const discountPercentStr = formData.get('discount_percent')?.toString();
  const expiresAtStr = formData.get('expires_at')?.toString();

  if (!id) {
    throw new Error('ID do cupom não fornecido.');
  }

  if (!code || !/^[A-Z0-9_-]{1,20}$/.test(code)) {
    throw new Error('O código deve ter até 20 caracteres (apenas letras, números, hífen e underline).');
  }

  const discountPercent = Number(discountPercentStr);
  if (isNaN(discountPercent) || discountPercent <= 0 || discountPercent > 100) {
    throw new Error('O desconto deve ser entre 1 e 100%.');
  }

  let expiresAt: string | null = null;
  if (expiresAtStr) {
    const installation = getPublicInstallationProfile();
    const timeZone = installation.regionalization.timeZone || 'America/Sao_Paulo';
    expiresAt = getEndOfDayUTC(expiresAtStr, timeZone).toISOString();
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('coupons').update({
    code,
    discount_percent: discountPercent,
    expires_at: expiresAt,
  }).eq('id', id);

  if (error) {
    console.error('Erro ao atualizar cupom:', error);
    if (error.code === '23505') {
      throw new Error('Já existe um cupom com este código.');
    }
    throw new Error('Não foi possível atualizar o cupom.');
  }

  revalidatePath('/admin/cupons');
}
