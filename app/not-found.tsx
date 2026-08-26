import Image from "next/image";
import Link from "next/link";

import { getPublicInstallationProfile } from "@/config/installation/public";

const installation = getPublicInstallationProfile();

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-background px-5 py-12">
      <section className="w-full max-w-lg rounded-3xl border border-brand-border bg-white p-7 text-center shadow-sm sm:p-10">
        <Image
          src={installation.identity.assets.monograms.default}
          alt={installation.identity.name}
          width={100}
          height={107}
          className="mx-auto h-auto"
          style={{ height: "auto" }}
          priority
        />
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-brand-primary">
          Página não encontrada
        </p>
        <h1 className="mt-2 text-3xl font-bold text-brand-foreground">
          Este endereço não existe
        </h1>
        <p className="mt-3 text-sm leading-6 text-brand-muted-foreground">
          O link pode estar incorreto ou a página pode ter sido
          removida.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex h-12 items-center justify-center rounded-xl bg-brand-primary px-6 text-sm font-bold text-brand-primary-foreground transition hover:bg-brand-primary-hover"
        >
          Voltar ao cardápio
        </Link>
      </section>
    </main>
  );
}
