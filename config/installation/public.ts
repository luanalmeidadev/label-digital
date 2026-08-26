import type { PublicInstallationProfile } from "@/config/installation/types";
import { resolveInstallationPreset } from "@/config/installation/resolve";

const effectivePublicInstallation: PublicInstallationProfile =
  resolveInstallationPreset({
    requestedPreset: process.env.NEXT_PUBLIC_INSTALLATION_PRESET,
  });

export function getPublicInstallationProfile(): PublicInstallationProfile {
  return effectivePublicInstallation;
}
