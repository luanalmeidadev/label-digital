import type { PublicInstallationProfile } from "@/config/installation/types";
import { resolveInstallationPreset } from "@/config/installation/resolve";

function getEnv(key: string) {
  if (typeof process !== 'undefined' && process.env) return process.env[key];
  return undefined;
}

const effectivePublicInstallation: PublicInstallationProfile =
  resolveInstallationPreset({
    requestedPreset: getEnv(['NEXT_PUBLIC', 'INSTALLATION_PRESET'].join('_')),
    requestedManifest: getEnv(['NEXT_PUBLIC', 'PLATFORM_DEMO_MANIFEST'].join('_')),
    demoMode: getEnv(['NEXT_PUBLIC', 'INSTALLATION_DEMO_MODE'].join('_')),
    publicSupabaseUrl: getEnv(['NEXT_PUBLIC', 'SUPABASE_URL'].join('_')),
  });

export function getPublicInstallationProfile(): PublicInstallationProfile {
  return effectivePublicInstallation;
}
