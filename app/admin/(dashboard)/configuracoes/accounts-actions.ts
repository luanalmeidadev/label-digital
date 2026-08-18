"use server";

import { revalidatePath } from "next/cache";

import { requireAdministrator } from "@/lib/admin-auth";
import { recordAdminAudit } from "@/lib/admin-audit";
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
  const access = await requireAdministrator();

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

  await recordAdminAudit(access, {
    action: "created",
    entityType: "admin_account",
    entityId: data.user.id,
    summary: `Criou a conta administrativa de ${name}`,
    metadata: {
      email,
      role,
      permissions,
    },
  });

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
  const { data: previousAuth } =
    await adminClient.auth.admin.getUserById(id);
  const previousRole = previousAuth.user
    ? parseRole(
        String(
          previousAuth.user.app_metadata
            ?.label_role ?? "attendant"
        )
      )
    : null;
  const previousPermissions = previousAuth.user
    ? normalizeAdminPermissions(
        previousAuth.user.app_metadata
          ?.label_permissions
      )
    : [];
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

  await recordAdminAudit(access, {
    action: "updated",
    entityType: "admin_account",
    entityId: id,
    summary: `Atualizou a conta administrativa de ${name}`,
    metadata: {
      name,
      role: {
        before: previousRole,
        after: role,
      },
      permissions: {
        before: previousPermissions,
        after: permissions,
      },
    },
  });

  revalidatePath("/admin/configuracoes");
  revalidatePath("/admin");
  return { success: true };
}

export async function deleteAdminAccount(
  formData: FormData
): Promise<AccountActionResult> {
  const access = await requireAdministrator();
  const id = String(formData.get("id") ?? "");

  if (!id) {
    return {
      success: false,
      error: "Conta inválida.",
    };
  }

  if (id === access.user.id) {
    return {
      success: false,
      error: "Você não pode excluir sua própria conta.",
    };
  }

  const adminClient = createSupabaseAdminClient();
  const { data: profile, error: profileError } =
    await adminClient
      .from("admin_profiles")
      .select("id, name")
      .eq("id", id)
      .maybeSingle();

  if (profileError || !profile) {
    return {
      success: false,
      error: "A conta administrativa não foi encontrada.",
    };
  }

  const { data: targetAuth } =
    await adminClient.auth.admin.getUserById(id);

  const { error: deleteError } =
    await adminClient.auth.admin.deleteUser(id);

  if (deleteError) {
    return {
      success: false,
      error: "Não foi possível excluir a conta.",
    };
  }

  await recordAdminAudit(access, {
    action: "deleted",
    entityType: "admin_account",
    entityId: id,
    summary: `Excluiu a conta administrativa de ${profile.name}`,
    metadata: {
      name: profile.name,
      email: targetAuth.user?.email ?? null,
      role:
        targetAuth.user?.app_metadata
          ?.label_role ?? "attendant",
    },
  });

  revalidatePath("/admin/configuracoes");
  return { success: true };
}
