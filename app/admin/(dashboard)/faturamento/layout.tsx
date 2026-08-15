import { requireAdminPagePermission } from "@/lib/admin-auth";

export default async function FaturamentoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPagePermission("billing");
  return children;
}
