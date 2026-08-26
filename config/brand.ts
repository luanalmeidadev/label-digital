import { getPublicInstallationProfile } from "@/config/installation/public";

const installation = getPublicInstallationProfile();

export const brand = {
  name: installation.identity.name,
  shortName: installation.identity.shortName,

  colors: {
    wine: installation.theme.primary,
    cream: installation.theme.accent,
    primaryHover: installation.theme.primaryHover,

    background: installation.theme.background,
    surface: installation.theme.surface,
    mutedSurface: installation.theme.mutedSurface,

    text: installation.theme.text,
    mutedText: installation.theme.mutedText,

    border: installation.theme.border,
  },

  assets: {
    logo: installation.identity.assets.logos.default,
    logoCream: installation.identity.assets.logos.onPrimary,

    iconWine: installation.identity.assets.brandIcons.default,
    iconCream: installation.identity.assets.brandIcons.onPrimary,

    monogramWine: installation.identity.assets.monograms.default,
    monogramCream: installation.identity.assets.monograms.onPrimary,
  },
} as const;
