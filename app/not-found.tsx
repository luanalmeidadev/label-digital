import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FFFDF9] px-5 py-12">
      <section className="w-full max-w-lg rounded-3xl border border-[#EEE6DF] bg-white p-7 text-center shadow-sm sm:p-10">
        <Image
          src="/brand/monograma-vinho.svg"
          alt="La'Bel Confeitaria"
          width={100}
          height={100}
          className="mx-auto"
          priority
        />
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-[#8B0000]">
          Página não encontrada
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[#241B19]">
          Este endereço não existe
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#756A66]">
          O link pode estar incorreto ou a página pode ter sido
          removida.
        </p>
        <Link
          href="/"
          className="mt-7 inline-flex h-12 items-center justify-center rounded-xl bg-[#8B0000] px-6 text-sm font-bold text-white transition hover:bg-[#700000]"
        >
          Voltar ao cardápio
        </Link>
      </section>
    </main>
  );
}
