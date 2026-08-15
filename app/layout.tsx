import type { Metadata, Viewport } from "next";
import { Archivo, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { getSiteUrl } from "@/lib/site-url";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: "La'Bel Confeitaria | Doces e encomendas em Palhoça",
    template: "%s | La'Bel Confeitaria",
  },
  description:
    "Doces, sobremesas e encomendas artesanais em Palhoça. Consulte o cardápio, monte seu pedido e fale com a La'Bel pelo WhatsApp.",
  applicationName: "La'Bel Confeitaria",
  category: "food",
  keywords: [
    "confeitaria em Palhoça",
    "doces em Palhoça",
    "bolos por encomenda",
    "sobremesas artesanais",
    "La'Bel Confeitaria",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: "La'Bel Confeitaria",
    title: "La'Bel Confeitaria | Doces e encomendas em Palhoça",
    description:
      "Cardápio do dia, doces, bolos e encomendas artesanais em Palhoça.",
  },
  twitter: {
    card: "summary_large_image",
    title: "La'Bel Confeitaria | Doces e encomendas em Palhoça",
    description:
      "Cardápio do dia, doces, bolos e encomendas artesanais em Palhoça.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#8B0000",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={cn("font-sans", geist.variable)}>
      <body className={archivo.variable}>{children}</body>
    </html>
  );
}
