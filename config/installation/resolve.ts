import type { PublicInstallationProfile } from "@/config/installation/types";
import { demoBurgerInstallationPreset } from "@/config/installation/presets/demo-burger";
import { labelInstallationPreset } from "@/config/installation/presets/label";

export const installationPresetIds = ["label", "demo-burger"] as const;

export type InstallationPresetId =
  (typeof installationPresetIds)[number];

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

  if (!installationPresetIds.includes(presetId as InstallationPresetId)) {
    throw new Error(`Installation preset desconhecido: ${presetId}.`);
  }

  if (nodeEnv === "production" && presetId !== "label") {
    throw new Error(
      "Presets de demonstração não podem ser selecionados em produção."
    );
  }

  return installationPresets[presetId as InstallationPresetId];
}
