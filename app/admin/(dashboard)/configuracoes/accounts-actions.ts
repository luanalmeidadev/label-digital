"use server";

import { revalidatePath } from "next/cache";

import { requireAdministrator } from "@/lib/admin-auth";
import {
  type AdminPermission,
  type AdminRole,
  allAdminPermissions,
  normalizeAdminPermissions,
} from "@/lib/admin-permissions";
import { getSiteUrl } from "@/lib/site-url";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AccountActionResult = {
  success: boolean;
  error?: string;
};

function parseRole(value: FormDataEntryValue | null) {
  return value === "admin"
    ? "admin"
    : "attendant";
}

function parsePermissions(
  formData: FormData,
  role: AdminRole
) {
  return role === "admin"
    ? [...allAdminPermissions]
    : normalizeAdminPermissions(
        formData.getAll("permissions")
      );
}

function createAppMetadata(
  role: AdminRole,
  permissions: AdminPermission[]
) {
  return {
    label_role: role,
    label_permissions: permissions,
  };
}

export async function createAdminAccount(
  formData: FormData
): Promise<AccountActionResult> {
  await requireAdministrator();

  const name = String(
    formData.get("name") ?? ""
  ).trim();
  const email = String(
    formData.get("email") ?? ""
  )
    .trim()
    .toLowerCase();
  const role = parseRole(formData.get("role"));
  const permissions = parsePermissions(
    formData,
    role
  );

  if (name.length < 2 || name.length > 80) {
    return {
      success: false,
      error: "Informe um nome válido.",
    };
  }

  if (!email.includes("@") || email.length > 254) {
    return {
      success: false,
      error: "Informe um e-mail válido.",
    };
  }

  if (
    role === "attendant" &&
    permissions.length === 0
  ) {
    return {
      success: false,
      error: "Selecione ao menos uma permissão.",
    };
  }

  const adminClient = createSupabaseAdminClient();
  const redirectTo = new URL(
    "/admin/auth/confirm",
    getSiteUrl()
  ).toString();
  const { data, error } =
    await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        data: { name },
        redirectTo,
      }
    );

  if (error || !data.user) {
    return {
      success: false,
      error:
        error?.message.includes("already")
          ? "Já existe uma conta com este e-mail."
          : "Não foi possível enviar o convite por e-mail.",
    };
  }

  const { error: metadataError } =
    await adminClient.auth.admin.updateUserById(
      data.user.id,
      {
        app_metadata: createAppMetadata(
          role,
          permissions
        ),
      }
    );

  if (metadataError) {
    await adminClient.auth.admin.deleteUser(
      data.user.id
    );

    return {
      success: false,
      error:
        "Não foi possível configurar as permissões da conta.",
    };
  }

  const { error: profileError } = await adminClient
    .from("admin_profiles")
    .insert({
      id: data.user.id,
      name,
    });

  if (profileError) {
    await adminClient.auth.admin.deleteUser(
      data.user.id
    );

    return {
      success: false,
      error:
        "Não foi possível criar o perfil administrativo.",
    };
  }

  revalidatePath("/admin/configuracoes");
  return { success: true };
}

export async function updateAdminAccount(
  formData: FormData
): Promise<AccountActionResult> {
  const access = await requireAdministrator();
  const id = String(formData.get("id") ?? "");
  const name = String(
    formData.get("name") ?? ""
  ).trim();
  const role = parseRole(formData.get("role"));
  const permissions = parsePermissions(
    formData,
    role
  );

  if (!id) {
    return {
      success: false,
      error: "Conta inválida.",
    };
  }

  if (name.length < 2 || name.length > 80) {
    return {
      success: false,
      error: "Informe um nome válido.",
    };
  }

  if (
    role === "attendant" &&
    permissions.length === 0
  ) {
    return {
      success: false,
      error: "Selecione ao menos uma permissão.",
    };
  }

  if (
    id === access.user.id &&
    role !== "admin"
  ) {
    return {
      success: false,
      error:
        "Você não pode remover seu próprio acesso de administrador.",
    };
  }

  const adminClient = createSupabaseAdminClient();
  const attributes = {
    app_metadata: createAppMetadata(
      role,
      permissions
    ),
    user_metadata: { name },
  };
  const { error: authError } =
    await adminClient.auth.admin.updateUserById(
      id,
      attributes
    );

  if (authError) {
    return {
      success: false,
      error: "Não foi possível atualizar a conta.",
    };
  }

  const { error: profileError } = await adminClient
    .from("admin_profiles")
    .update({ name })
    .eq("id", id);

  if (profileError) {
    return {
      success: false,
      error: "Não foi possível atualizar o nome.",
    };
  }

  revalidatePath("/admin/configuracoes");
  revalidatePath("/admin");
  return { success: true };
}
