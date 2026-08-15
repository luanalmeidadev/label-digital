"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro de interface:", error);
  }, [error]);

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
          Algo não saiu como esperado
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[#241B19]">
          Não foi possível carregar esta área
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#756A66]">
          Seus dados foram preservados. Tente novamente ou
          volte para o início.
        </p>

        {error.digest && (
          <p className="mt-3 text-xs text-[#9A8E89]">
            Código do erro: {error.digest}
          </p>
        )}

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#8B0000] px-5 text-sm font-bold text-white transition hover:bg-[#700000]"
          >
            <RefreshCw size={17} />
            Tentar novamente
          </button>
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-[#D2B48C] px-5 text-sm font-bold text-[#8B0000] transition hover:bg-[#FFF7F5]"
          >
            Voltar ao cardápio
          </Link>
        </div>
      </section>
    </main>
  );
}
