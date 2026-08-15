import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();

  return [
    {
      url: new URL("/", siteUrl).toString(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: new URL("/encomendas", siteUrl).toString(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: new URL("/privacidade", siteUrl).toString(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
