import AdminSidebar from "@/components/admin/AdminSidebar";
import { getAdminAccess } from "@/lib/admin-auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await getAdminAccess();

  return (
    <div className="min-h-screen bg-[#FFFDF9] lg:flex">
      <AdminSidebar
        permissions={access.permissions}
        role={access.role}
        name={access.profile.name}
      />

      <div className="min-w-0 flex-1">
        {children}
      </div>
    </div>
  );
}
