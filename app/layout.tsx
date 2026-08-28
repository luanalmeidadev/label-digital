import type { Metadata, Viewport } from "next";
import { Archivo, Geist } from "next/font/google";
import "./globals.css";
import { getPublicInstallationProfile } from "@/config/installation/public";
import { getInstallationThemeStyle } from "@/config/installation/theme";
import { isHomologation } from "@/lib/app-environment";
import {
  buildInstallationMetadata,
  buildInstallationViewport,
} from "@/lib/installation-presentation";
import { cn } from "@/lib/utils";
import { getSiteUrl } from "@/lib/site-url";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
});

const installation = getPublicInstallationProfile();
const installationThemeStyle = getInstallationThemeStyle(installation);

export const metadata: Metadata = buildInstallationMetadata(
  installation,
  getSiteUrl(),
  isHomologation
);

export const viewport: Viewport =
  buildInstallationViewport(installation);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang={installation.regionalization.locale}
      data-installation-preset={installation.preset.id}
      data-installation-slug={installation.identity.slug}
      style={installationThemeStyle}
      className={cn("font-sans", geist.variable)}
    >
      <body className={archivo.variable}>
        {isHomologation && (
          <div
            role="status"
            className="relative z-[100] flex min-h-9 items-center justify-center bg-amber-300 px-4 py-2 text-center text-xs font-extrabold tracking-wide text-amber-950 sm:text-sm"
          >
            AMBIENTE DE HOMOLOGAÇÃO • DADOS DE TESTE
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
