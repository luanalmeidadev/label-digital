export const adminPermissionOptions = [
  {
    key: "catalog",
    label: "Cardápios e produtos",
    description:
      "Produtos diários, categorias e catálogo de encomendas.",
  },
  {
    key: "orders",
    label: "Pedidos e encomendas",
    description:
      "Atendimento, pagamentos, comandas e encomendas manuais.",
  },
  {
    key: "customers",
    label: "Clientes",
    description: "Consulta ao histórico de clientes.",
  },
  {
    key: "deliveries",
    label: "Entregas",
    description: "Organização e atualização das entregas.",
  },
  {
    key: "billing",
    label: "Faturamento",
    description: "Valores das vendas e encomendas.",
  },
  {
    key: "settings",
    label: "Configurações da loja",
    description:
      "Dados da loja, horários e regiões de entrega.",
  },
] as const;

export type AdminPermission =
  (typeof adminPermissionOptions)[number]["key"];

export type AdminRole = "admin" | "attendant";

export const allAdminPermissions =
  adminPermissionOptions.map(
    (permission) => permission.key
  );

export const defaultAttendantPermissions: AdminPermission[] = [
  "orders",
  "customers",
  "deliveries",
];

export function getAdminRole(
  appMetadata: Record<string, unknown> | undefined
): AdminRole {
  const role = appMetadata?.label_role;

  if (role === "attendant") {
    return "attendant";
  }

  // Contas anteriores ao controle de acesso são administradoras.
  return "admin";
}

export function normalizeAdminPermissions(
  values: unknown
): AdminPermission[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const allowed = new Set<AdminPermission>(
    allAdminPermissions
  );

  return Array.from(
    new Set(
      values.filter(
        (value): value is AdminPermission =>
          typeof value === "string" &&
          allowed.has(value as AdminPermission)
      )
    )
  );
}

export function getAdminPermissions(
  role: AdminRole,
  appMetadata: Record<string, unknown> | undefined
) {
  return role === "admin"
    ? [...allAdminPermissions]
    : normalizeAdminPermissions(
        appMetadata?.label_permissions
      );
}

export function hasAdminPermission(
  permissions: AdminPermission[],
  permission: AdminPermission
) {
  return permissions.includes(permission);
}
