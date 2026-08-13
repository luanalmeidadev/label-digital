import { redirect } from "next/navigation";

import AdminSidebar from "@/components/admin/AdminSidebar";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase =
    await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: admin } = await supabase
    .from("admin_profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-[#FFFDF9] lg:flex">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        {children}
      </div>
    </div>
  );
}