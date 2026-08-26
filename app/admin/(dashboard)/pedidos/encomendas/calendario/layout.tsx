import { requireInstallationModule } from "@/lib/installation-modules-server";

export default function PreorderCalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  requireInstallationModule("preorderSchedule");
  return children;
}
