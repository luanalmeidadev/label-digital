import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
});

export const metadata: Metadata = {
  title: "La'bel Confeitaria",
  description:
    "Cardápio digital da La'bel Confeitaria. Sobremesas, salgados, bebidas e encomendas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={archivo.variable}>{children}</body>
    </html>
  );
}