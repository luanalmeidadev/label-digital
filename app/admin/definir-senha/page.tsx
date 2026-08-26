import Image from "next/image";
import { redirect } from "next/navigation";

import SetPasswordForm from "@/components/admin/SetPasswordForm";
import { getPublicInstallationProfile } from "@/config/installation/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const installation = getPublicInstallationProfile();

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
    <main className="flex min-h-screen items-center justify-center bg-brand-background px-5 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="relative mx-auto h-24 w-[90px]">
            <Image
              src={installation.identity.assets.monograms.default}
              alt={installation.identity.name}
              fill
              sizes="90px"
              className="object-contain"
              priority
            />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-brand-foreground">
            Crie sua senha
          </h1>
          <p className="mt-2 text-sm leading-6 text-brand-muted-foreground">
            Olá, {user.user_metadata.name ?? user.email}.
            Defina a senha que você usará para acessar o painel.
          </p>
        </div>

        <SetPasswordForm />

        <p className="mt-6 text-center text-xs text-brand-muted-foreground">
          Área restrita • {installation.identity.name}
        </p>
      </div>
    </main>
  );
}
