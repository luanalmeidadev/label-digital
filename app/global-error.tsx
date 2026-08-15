"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          background: "#FFFDF9",
          color: "#241B19",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <section
            style={{
              width: "100%",
              maxWidth: 480,
              border: "1px solid #EEE6DF",
              borderRadius: 24,
              background: "white",
              padding: 32,
              textAlign: "center",
            }}
          >
            <h1 style={{ margin: 0, fontSize: 26 }}>
              Não foi possível abrir o sistema
            </h1>
            <p
              style={{
                margin: "14px 0 0",
                color: "#756A66",
                lineHeight: 1.6,
              }}
            >
              Aguarde alguns instantes e tente carregar novamente.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                width: "100%",
                height: 48,
                marginTop: 24,
                border: 0,
                borderRadius: 12,
                background: "#8B0000",
                color: "white",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Tentar novamente
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
