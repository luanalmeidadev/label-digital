import type { MetadataRoute } from "next";

import { isHomologation } from "@/lib/app-environment";
import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  if (isHomologation) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/encomendas", "/privacidade"],
      disallow: ["/admin/", "/api/", "/pedido/"],
    },
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
    host: siteUrl.origin,
  };
}
