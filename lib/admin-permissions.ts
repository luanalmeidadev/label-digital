import { isInstallationModuleEnabled } from "@/config/installation/modules";

const preordersEnabled = isInstallationModuleEnabled("preorders");

export const adminPermissionOptions = [
  {
    key: "catalog",
    label: "Cardápios e produtos",
    description: preordersEnabled
      ? "Produtos diários, categorias e catálogo de encomendas."
      : "Produtos diários e categorias do cardápio.",
  },
  {
    key: "orders",
    label: preordersEnabled ? "Pedidos e encomendas" : "Pedidos",
    description: preordersEnabled
      ? "Atendimento, pagamentos, comandas e encomendas manuais."
      : "Atendimento, pagamentos e comandas.",
  },
  {
    key: "cashier",
    label: "Caixa",
    description:
      "Abertura do caixa e registro de vendas presenciais.",
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
    description: preordersEnabled
      ? "Valores das vendas e encomendas."
      : "Valores das vendas.",
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
  "cashier",
  "orders",
  "customers",
  "deliveries",
];

export function getAdminRole(
  appMetadata: Record<string, unknown> | undefined
): AdminRole {
  const role = appMetadata?.label_role;

  if (role === "admin") {
    return "admin";
  }

  // Fail closed: perfis sem papel explicito nunca viram administradores.
  return "attendant";
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
