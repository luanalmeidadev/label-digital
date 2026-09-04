import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminRealtimeRefresh from "@/components/admin/AdminRealtimeRefresh";
import AdminTabSessionBoundary from "@/components/admin/AdminTabSessionBoundary";
import { getAdminAccess } from "@/lib/admin-auth";

import { getPublicInstallationProfile } from "@/config/installation/public";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const installation = getPublicInstallationProfile();
  const access = await getAdminAccess();

  return (
    <AdminTabSessionBoundary>
      <div className="min-h-screen bg-brand-background lg:flex">
        <AdminRealtimeRefresh />
        <AdminSidebar
          permissions={access.permissions}
          role={access.role}
          name={access.profile.name}
          storeName={installation.identity.name}
          logoUrl={installation.identity.assets.logos.onPrimary}
        />

        <div className="min-w-0 flex-1">
          {children}
        </div>
      </div>
    </AdminTabSessionBoundary>
  );
}
