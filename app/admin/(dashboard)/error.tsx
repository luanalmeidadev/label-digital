"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

export default function AdminErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro no painel administrativo:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FFFDF9] px-5 py-12">
      <section className="w-full max-w-lg rounded-3xl border border-[#EEE6DF] bg-white p-7 text-center shadow-sm sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8B0000]">
          Painel administrativo
        </p>
        <h1 className="mt-3 text-2xl font-bold text-[#241B19]">
          Não foi possível carregar esta área
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#756A66]">
          Nenhuma alteração foi realizada. Tente novamente e,
          se o problema continuar, informe o código abaixo.
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
            href="/admin"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-[#D2B48C] px-5 text-sm font-bold text-[#8B0000] transition hover:bg-[#FFF7F5]"
          >
            Voltar à Visão geral
          </Link>
        </div>
      </section>
    </main>
  );
}
