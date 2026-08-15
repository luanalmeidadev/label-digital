import { requireAdminPagePermission } from "@/lib/admin-auth";

export default async function PedidosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPagePermission("orders");
  return children;
}
