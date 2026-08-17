import Image from "next/image";
import { redirect } from "next/navigation";

import SetPasswordForm from "@/components/admin/SetPasswordForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SetPasswordPage() {
  const supabase =
    await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login?error=invalid-link");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FFFDF9] px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Image
            src="/brand/monograma-vinho.svg"
            alt="La'bel"
            width={90}
            height={90}
            className="mx-auto"
            priority
          />
          <h1 className="mt-5 text-2xl font-bold text-[#241B19]">
            Crie sua senha
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#756A66]">
            Olá, {user.user_metadata.name ?? user.email}.
            Defina a senha que você usará para acessar o painel.
          </p>
        </div>

        <SetPasswordForm />

        <p className="mt-6 text-center text-xs text-[#756A66]">
          Área restrita • La&apos;bel Confeitaria
        </p>
      </div>
    </main>
  );
}
