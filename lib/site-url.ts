const fallbackSiteUrl = "https://label-digital.vercel.app";

export function getSiteUrl() {
  const configuredUrl =
    process.env.SITE_URL?.trim() ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : fallbackSiteUrl);

  try {
    return new URL(configuredUrl);
  } catch {
    return new URL(fallbackSiteUrl);
  }
}
