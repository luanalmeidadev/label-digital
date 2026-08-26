import type { PublicInstallationProfile } from "@/config/installation/types";
import { demoBurgerInstallationPreset } from "@/config/installation/presets/demo-burger";
import { labelInstallationPreset } from "@/config/installation/presets/label";
import {
  installationPresetIds,
  resolveInstallationModuleFlags,
} from "@/config/installation/module-presets.mjs";

export type InstallationPresetId =
  "label" | "demo-burger";

const installationPresets: Record<
  InstallationPresetId,
  PublicInstallationProfile
> = {
  label: labelInstallationPreset,
  "demo-burger": demoBurgerInstallationPreset,
};

type ResolveInstallationPresetOptions = {
  requestedPreset?: string | null;
  nodeEnv?: string;
};

export function resolveInstallationPreset({
  requestedPreset,
  nodeEnv = process.env.NODE_ENV,
}: ResolveInstallationPresetOptions = {}) {
  const presetId = requestedPreset?.trim() || "label";
  resolveInstallationModuleFlags({ requestedPreset: presetId, nodeEnv });

  return installationPresets[presetId as InstallationPresetId];
}

export { installationPresetIds };
