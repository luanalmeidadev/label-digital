import { requireAdminPagePermission } from "@/lib/admin-auth";

export default async function ReportsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdminPagePermission("billing");
  return children;
}
