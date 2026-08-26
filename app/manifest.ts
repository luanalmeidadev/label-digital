import type { MetadataRoute } from "next";

import { getPublicInstallationProfile } from "@/config/installation/public";

export default function manifest(): MetadataRoute.Manifest {
  const installation = getPublicInstallationProfile();

  return {
    name: installation.identity.name,
    short_name: installation.identity.shortName,
    description: installation.seo.manifestDescription,
    start_url: "/",
    display: "standalone",
    background_color: installation.theme.background,
    theme_color: installation.theme.primary,
    lang: installation.regionalization.locale,
    icons: [
      {
        src: installation.identity.assets.icon,
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
