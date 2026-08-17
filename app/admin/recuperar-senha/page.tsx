import Image from "next/image";
import Link from "next/link";

import RecoverPasswordForm from "@/components/admin/RecoverPasswordForm";

export default function RecoverPasswordPage() {
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
            Recuperar senha
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#756A66]">
            Enviaremos um código ao e-mail cadastrado para você criar uma nova senha.
          </p>
        </div>

        <RecoverPasswordForm />

        <Link
          href="/admin/login"
          className="mt-6 block text-center text-sm font-bold text-[#8B0000] hover:underline"
        >
          Voltar ao login
        </Link>
      </div>
    </main>
  );
}
