import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site-url";
import { getModulePublicPaths } from "@/config/installation/modules";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const modulePages = getModulePublicPaths().map((path) => ({
    url: new URL(path, siteUrl).toString(),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  return [
    {
      url: new URL("/", siteUrl).toString(),
      changeFrequency: "daily",
      priority: 1,
    },
    ...modulePages,
    {
      url: new URL("/privacidade", siteUrl).toString(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
