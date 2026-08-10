import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logoutAdmin } from "./logout/actions";

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: admin } = await supabase
    .from("admin_profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  if (!admin) {
    await supabase.auth.signOut();
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen bg-[#FFFDF9] p-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-bold uppercase tracking-widest text-[#8B0000]">
          La&apos;bel Admin
        </p>

        <h1 className="mt-2 text-3xl font-bold text-[#241B19]">
          Bem-vindo, {admin.name}.
        </h1>

        <p className="mt-3 text-[#756A66]">
          Autenticação administrativa funcionando. 🎉
        </p>

        <form action={logoutAdmin} className="mt-8">
          <button
            type="submit"
            className="rounded-xl bg-[#8B0000] px-5 py-3 font-bold text-white transition hover:bg-[#700000]"
          >
            Sair
          </button>
        </form>
      </div>
    </main>
  );
}