import type { CSSProperties } from "react";

import type { PublicInstallationProfile } from "@/config/installation/types";

export const installationThemeTokens = [
  "primary",
  "primary-foreground",
  "primary-hover",
  "secondary",
  "background",
  "surface",
  "surface-muted",
  "foreground",
  "muted-foreground",
  "border",
] as const;

export type InstallationThemeToken =
  (typeof installationThemeTokens)[number];

type InstallationThemeVariable =
  `--installation-${InstallationThemeToken}`;

export type InstallationThemeStyle = CSSProperties &
  Record<InstallationThemeVariable, string>;

export function getInstallationThemeStyle(
  installation: PublicInstallationProfile
): InstallationThemeStyle {
  return {
    "--installation-primary": installation.theme.primary,
    "--installation-primary-foreground": installation.theme.onPrimary,
    "--installation-primary-hover": installation.theme.primaryHover,
    "--installation-secondary": installation.theme.accent,
    "--installation-background": installation.theme.background,
    "--installation-surface": installation.theme.surface,
    "--installation-surface-muted": installation.theme.mutedSurface,
    "--installation-foreground": installation.theme.text,
    "--installation-muted-foreground": installation.theme.mutedText,
    "--installation-border": installation.theme.border,
  };
}
