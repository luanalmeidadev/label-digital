import { getPublicInstallationProfile } from "@/config/installation/public";
import type {
  InstallationModuleKey,
  InstallationModules,
  PublicInstallationProfile,
} from "@/config/installation/types";

type InstallationModuleSource =
  | Pick<PublicInstallationProfile, "modules">
  | InstallationModules;

function getModuleFlags(source: InstallationModuleSource) {
  return "modules" in source ? source.modules : source;
}

export function isInstallationModuleEnabled(
  module: InstallationModuleKey,
  source: InstallationModuleSource = getPublicInstallationProfile()
) {
  return getModuleFlags(source)[module] === true;
}

export function assertInstallationModuleEnabled(
  module: InstallationModuleKey,
  source?: InstallationModuleSource
) {
  if (!isInstallationModuleEnabled(module, source)) {
    throw new Error(`Módulo desabilitado: ${module}.`);
  }
}

export function shouldLoadInstallationModuleData(
  module: InstallationModuleKey,
  authorized: boolean,
  source?: InstallationModuleSource
) {
  return authorized && isInstallationModuleEnabled(module, source);
}

export function getHealthCheckKeys(
  source?: InstallationModuleSource
) {
  return [
    "database",
    ...(isInstallationModuleEnabled("preorders", source)
      ? ["preorderStorage"]
      : []),
    "productStorage",
  ] as const;
}

export function getModulePublicPaths(
  source?: InstallationModuleSource
) {
  return isInstallationModuleEnabled("preorders", source)
    ? ["/encomendas"] as const
    : [] as const;
}
