import { requireAdminPagePermission } from "@/lib/admin-auth";

export default async function ProdutosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPagePermission("catalog");
  return children;
}
