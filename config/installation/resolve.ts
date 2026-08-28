import type { PublicInstallationProfile } from "@/config/installation/types";
import { demoBurgerInstallationPreset } from "@/config/installation/presets/demo-burger";
import { labelInstallationPreset } from "@/config/installation/presets/label";
import {
  parsePlatformDemoManifestJson,
  type PlatformDemoManifest,
} from "@/config/installation/platform-manifest.mjs";
import { applyPlatformDemoManifest } from "@/config/installation/platform-manifest-profile";
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
  requestedManifest?: string | null;
  nodeEnv?: string;
  demoMode?: string | null;
  publicSupabaseUrl?: string | null;
  now?: Date | number | string;
};

function isLocalUrl(value: string | null | undefined) {
  if (!value) return false;

  try {
    return ["127.0.0.1", "localhost"].includes(new URL(value).hostname);
  } catch {
    return false;
  }
}

function canLoadPlatformManifest({
  nodeEnv,
  demoMode,
  publicSupabaseUrl,
}: Pick<
  ResolveInstallationPresetOptions,
  "nodeEnv" | "demoMode" | "publicSupabaseUrl"
>) {
  if (nodeEnv === "development" || nodeEnv === "test") return true;

  return demoMode === "local" && isLocalUrl(publicSupabaseUrl);
}

function readManifest(
  requestedManifest: string | null | undefined,
  options: ResolveInstallationPresetOptions
): PlatformDemoManifest | null {
  if (!requestedManifest?.trim()) return null;
  if (!canLoadPlatformManifest(options)) {
    throw new Error(
      "Manifestos externos de demonstração não podem ser carregados neste ambiente."
    );
  }

  return parsePlatformDemoManifestJson(requestedManifest, { now: options.now });
}

export function resolveInstallationPreset({
  requestedPreset,
  requestedManifest,
  nodeEnv = process.env.NODE_ENV,
  demoMode,
  publicSupabaseUrl,
  now,
}: ResolveInstallationPresetOptions = {}) {
  const options = {
    requestedPreset,
    requestedManifest,
    nodeEnv,
    demoMode,
    publicSupabaseUrl,
    now,
  };
  const manifest = readManifest(requestedManifest, options);
  const presetId = manifest?.business.preset ?? requestedPreset?.trim() ?? "label";

  if (
    manifest &&
    requestedPreset?.trim() &&
    requestedPreset.trim() !== manifest.business.preset
  ) {
    throw new Error(
      "O preset selecionado não corresponde ao preset declarado no manifesto."
    );
  }

  resolveInstallationModuleFlags({
    requestedPreset: presetId,
    nodeEnv,
    allowDemoPreset: Boolean(manifest),
  });

  const preset = installationPresets[presetId as InstallationPresetId];

  return manifest ? applyPlatformDemoManifest(preset, manifest) : preset;
}

export { installationPresetIds };
