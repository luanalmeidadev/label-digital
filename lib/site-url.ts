const localSiteUrl = "http://localhost:3000";

function parseSiteUrl(value: string, source: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${source} deve conter uma URL válida.`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${source} deve usar http ou https.`);
  }

  return url;
}

export function getSiteUrl() {
  const configuredUrl = process.env.SITE_URL?.trim();

  if (configuredUrl) {
    return parseSiteUrl(configuredUrl, "SITE_URL");
  }

  if (process.env.VERCEL_ENV === "production") {
    throw new Error(
      "SITE_URL é obrigatória no ambiente de produção."
    );
  }

  const previewHostname =
    process.env.VERCEL_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

  if (previewHostname) {
    return parseSiteUrl(`https://${previewHostname}`, "URL da Vercel");
  }

  return new URL(localSiteUrl);
}
