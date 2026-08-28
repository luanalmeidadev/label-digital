function assertLocalUrl(value, label) {
  if (!value) {
    throw new Error(`${label} não foi informada para a demonstração local.`);
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} não contém uma URL válida.`);
  }

  if (!["127.0.0.1", "localhost"].includes(parsed.hostname)) {
    throw new Error(
      `A demonstração por manifesto foi bloqueada porque ${label} não é local: ${parsed.origin}`
    );
  }
}

export function createPlatformDemoEnvironment(baseEnvironment, manifest) {
  assertLocalUrl(baseEnvironment.NEXT_PUBLIC_SUPABASE_URL, "Supabase público");
  assertLocalUrl(baseEnvironment.LOCAL_SUPABASE_URL, "Supabase de teste");
  assertLocalUrl(baseEnvironment.SITE_URL, "SITE_URL");

  const environment = {
    ...baseEnvironment,
    NEXT_PUBLIC_INSTALLATION_PRESET: manifest.business.preset,
    NEXT_PUBLIC_PLATFORM_DEMO_MANIFEST: JSON.stringify(manifest),
    NEXT_PUBLIC_INSTALLATION_DEMO_MODE: "local",
    PLAYWRIGHT_PLATFORM_MANIFEST: "1",
    PLATFORM_DEMO_EXPECTED_NAME: manifest.business.name,
  };

  delete environment.VERCEL_ENV;
  delete environment.VERCEL_URL;
  delete environment.VERCEL_PROJECT_PRODUCTION_URL;
  return environment;
}

