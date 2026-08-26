import "server-only";

import { notFound } from "next/navigation";

import { isInstallationModuleEnabled } from "@/config/installation/modules";
import type { InstallationModuleKey } from "@/config/installation/types";

export function requireInstallationModule(
  module: InstallationModuleKey
) {
  if (!isInstallationModuleEnabled(module)) {
    notFound();
  }
}
