import { requireAdminPagePermission } from "@/lib/admin-auth";

export default async function EntregasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPagePermission("deliveries");
  return children;
}
