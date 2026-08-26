import { requireInstallationModule } from "@/lib/installation-modules-server";

export default function PreordersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  requireInstallationModule("preorders");
  return children;
}
