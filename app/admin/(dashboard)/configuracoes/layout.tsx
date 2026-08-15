import { requireAdminPagePermission } from "@/lib/admin-auth";

export default async function ConfiguracoesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPagePermission("settings");
  return children;
}
