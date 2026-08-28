import type { PublicInstallationProfile } from "@/config/installation/types";
import { resolveInstallationPreset } from "@/config/installation/resolve";

const effectivePublicInstallation: PublicInstallationProfile =
  resolveInstallationPreset({
    requestedPreset: process.env.NEXT_PUBLIC_INSTALLATION_PRESET,
    requestedManifest: process.env.NEXT_PUBLIC_PLATFORM_DEMO_MANIFEST,
    demoMode: process.env.NEXT_PUBLIC_INSTALLATION_DEMO_MODE,
    publicSupabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });

export function getPublicInstallationProfile(): PublicInstallationProfile {
  return effectivePublicInstallation;
}
