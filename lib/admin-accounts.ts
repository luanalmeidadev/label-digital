import "server-only";

import type {
  AdminPermission,
  AdminRole,
} from "@/lib/admin-permissions";
import {
  getAdminPermissions,
  getAdminRole,
} from "@/lib/admin-permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type AdminAccount = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  permissions: AdminPermission[];
  createdAt: string;
};

export async function listAdminAccounts() {
  const adminClient = createSupabaseAdminClient();
  const [{ data: profiles, error: profilesError }, usersResult] =
    await Promise.all([
      adminClient
        .from("admin_profiles")
        .select("id, name"),
      adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      }),
    ]);

  if (profilesError || usersResult.error) {
    throw new Error(
      "Não foi possível carregar as contas administrativas."
    );
  }

  const usersById = new Map(
    usersResult.data.users.map((user) => [
      user.id,
      user,
    ])
  );

  return (profiles ?? [])
    .flatMap((profile): AdminAccount[] => {
      const user = usersById.get(profile.id);

      if (!user?.email) {
        return [];
      }

      const role = getAdminRole(user.app_metadata);

      return [
        {
          id: profile.id,
          name: profile.name,
          email: user.email,
          role,
          permissions: getAdminPermissions(
            role,
            user.app_metadata
          ),
          createdAt: user.created_at,
        },
      ];
    })
    .sort((first, second) =>
      first.name.localeCompare(second.name, "pt-BR")
    );
}
