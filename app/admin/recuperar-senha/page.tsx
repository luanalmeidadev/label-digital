import Image from "next/image";
import Link from "next/link";

import RecoverPasswordForm from "@/components/admin/RecoverPasswordForm";
import { getPublicInstallationProfile } from "@/config/installation/public";

const installation = getPublicInstallationProfile();

export default function RecoverPasswordPage() {
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
            Recuperar senha
          </h1>
          <p className="mt-2 text-sm leading-6 text-brand-muted-foreground">
            Enviaremos um código ao e-mail cadastrado para você criar uma nova senha.
          </p>
        </div>

        <RecoverPasswordForm />

        <Link
          href="/admin/login"
          className="mt-6 block text-center text-sm font-bold text-brand-primary hover:underline"
        >
          Voltar ao login
        </Link>
      </div>
    </main>
  );
}
