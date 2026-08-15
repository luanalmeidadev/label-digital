import { requireAdminPagePermission } from "@/lib/admin-auth";

export default async function ClientesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPagePermission("customers");
  return children;
}
