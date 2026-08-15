"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Erro global da aplicação:", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          background: "#FFFDF9",
          color: "#241B19",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <title>Algo deu errado | La&apos;Bel Confeitaria</title>
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 20px",
            boxSizing: "border-box",
          }}
        >
          <section
            style={{
              width: "100%",
              maxWidth: 520,
              padding: "40px 28px",
              border: "1px solid #EEE6DF",
              borderRadius: 24,
              background: "#FFFFFF",
              textAlign: "center",
              boxShadow: "0 8px 30px rgba(36, 27, 25, 0.06)",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#8B0000",
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              La&apos;Bel Confeitaria
            </p>
            <h1 style={{ margin: "18px 0 0", fontSize: 28 }}>
              Não foi possível abrir esta página
            </h1>
            <p
              style={{
                margin: "14px auto 0",
                maxWidth: 390,
                color: "#756A66",
                fontSize: 15,
                lineHeight: 1.6,
              }}
            >
              Ocorreu uma falha inesperada. Tente novamente ou volte para o
              cardápio.
            </p>

            {error.digest && (
              <p
                style={{
                  margin: "12px 0 0",
                  color: "#9A8E89",
                  fontSize: 12,
                }}
              >
                Código do erro: {error.digest}
              </p>
            )}

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 12,
                marginTop: 28,
              }}
            >
              <button
                type="button"
                onClick={retry}
                style={{
                  minHeight: 48,
                  padding: "0 22px",
                  border: 0,
                  borderRadius: 12,
                  background: "#8B0000",
                  color: "#FFFFFF",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Tentar novamente
              </button>
              <Link
                href="/"
                style={{
                  minHeight: 46,
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "0 22px",
                  border: "1px solid #D2B48C",
                  borderRadius: 12,
                  color: "#8B0000",
                  fontSize: 14,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Voltar ao cardápio
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
