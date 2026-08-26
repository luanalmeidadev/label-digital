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
    <main className="flex min-h-screen items-center justify-center bg-brand-background px-5 py-12">
      <section className="w-full max-w-lg rounded-3xl border border-brand-border bg-white p-7 text-center shadow-sm sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-primary">
          Painel administrativo
        </p>
        <h1 className="mt-3 text-2xl font-bold text-brand-foreground">
          Não foi possível carregar esta área
        </h1>
        <p className="mt-3 text-sm leading-6 text-brand-muted-foreground">
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
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 text-sm font-bold text-brand-primary-foreground transition hover:bg-brand-primary-hover"
          >
            <RefreshCw size={17} />
            Tentar novamente
          </button>
          <Link
            href="/admin"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-brand-secondary px-5 text-sm font-bold text-brand-primary transition hover:bg-[#FFF7F5]"
          >
            Voltar à Visão geral
          </Link>
        </div>
      </section>
    </main>
  );
}
