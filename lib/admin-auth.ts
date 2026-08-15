import "server-only";

import { redirect } from "next/navigation";

import {
  type AdminPermission,
  getAdminPermissions,
  getAdminRole,
  hasAdminPermission,
} from "@/lib/admin-permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getAdminAccess() {
  const supabase =
    await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("id, name")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/admin/login");
  }

  const role = getAdminRole(user.app_metadata);
  const permissions = getAdminPermissions(
    role,
    user.app_metadata
  );

  return {
    supabase,
    user,
    profile,
    role,
    permissions,
  };
}

export async function requireAdminPermission(
  permission: AdminPermission
) {
  const access = await getAdminAccess();

  if (
    !hasAdminPermission(
      access.permissions,
      permission
    )
  ) {
    throw new Error(
      "Você não tem permissão para realizar esta ação."
    );
  }

  return access;
}

export async function requireAnyAdminPermission(
  permissions: AdminPermission[]
) {
  const access = await getAdminAccess();
  const allowed = permissions.some((permission) =>
    hasAdminPermission(
      access.permissions,
      permission
    )
  );

  if (!allowed) {
    throw new Error(
      "Você não tem permissão para realizar esta ação."
    );
  }

  return access;
}

export async function requireAdminPagePermission(
  permission: AdminPermission
) {
  const access = await getAdminAccess();

  if (
    !hasAdminPermission(
      access.permissions,
      permission
    )
  ) {
    redirect("/admin?error=forbidden");
  }

  return access;
}

export async function requireAdministrator() {
  const access = await getAdminAccess();

  if (access.role !== "admin") {
    throw new Error(
      "Somente administradores podem gerenciar contas."
    );
  }

  return access;
}
