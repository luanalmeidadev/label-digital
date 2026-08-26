import { requireInstallationModule } from "@/lib/installation-modules-server";

export default function AdminPreordersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  requireInstallationModule("preorders");
  return children;
}
