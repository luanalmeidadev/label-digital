import { requireAdminPagePermission } from "@/lib/admin-auth";

export default async function CaixaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPagePermission("cashier");
  return children;
}

