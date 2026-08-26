import type { PublicInstallationProfile } from "@/config/installation/types";
import { labelInstallationPreset } from "@/config/installation/presets/label";

const effectivePublicInstallation: PublicInstallationProfile =
  labelInstallationPreset;

export function getPublicInstallationProfile(): PublicInstallationProfile {
  return effectivePublicInstallation;
}
