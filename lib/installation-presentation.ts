import type { Metadata, Viewport } from "next";

import type {
  FoodBusinessSegment,
  PublicInstallationProfile,
} from "@/config/installation/types";

const businessSegmentLabels: Record<FoodBusinessSegment, string> = {
  confectionery: "Confeitaria",
  hamburger: "Hamburgueria",
  "snack-bar": "Lanchonete",
  "meal-prep": "Marmitaria",
  pizzeria: "Pizzaria",
  restaurant: "Restaurante",
  cafe: "Cafeteria",
  "acai-ice-cream": "Açaí e sorveteria",
  other: "Alimentação",
};

export function getBusinessSegmentLabel(
  segment: FoodBusinessSegment
) {
  return businessSegmentLabels[segment];
}

export function getInstallationBrandMark(
  installation: PublicInstallationProfile
) {
  const shortName = installation.identity.shortName.trim();
  const firstCharacter = Array.from(shortName)[0] ?? "";

  return `${firstCharacter}${shortName.includes("'") ? "'" : ""}`;
}

export function buildInstallationMetadata(
  installation: PublicInstallationProfile,
  siteUrl: URL,
  homologation: boolean
): Metadata {
  return {
    metadataBase: siteUrl,
    title: {
      default: installation.seo.title,
      template: installation.seo.titleTemplate,
    },
    description: installation.seo.description,
    applicationName: installation.identity.name,
    category: "food",
    keywords: [...installation.seo.keywords],
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: installation.seo.openGraph.type,
      locale: installation.seo.openGraph.locale,
      url: "/",
      siteName: installation.seo.siteName,
      title: installation.seo.openGraph.title,
      description: installation.seo.openGraph.description,
    },
    twitter: {
      card: installation.seo.twitter.card,
      title: installation.seo.twitter.title,
      description: installation.seo.twitter.description,
    },
    robots: {
      index: !homologation,
      follow: !homologation,
      noarchive: homologation,
    },
  };
}

export function buildInstallationViewport(
  installation: PublicInstallationProfile
): Viewport {
  return {
    themeColor: installation.theme.primary,
    colorScheme: "light",
  };
}

type SchemaBusinessHour = {
  weekday: number;
  isOpen: boolean;
  opensAt: string | null;
  closesAt: string | null;
};

type StoreSchemaInput = {
  installation: PublicInstallationProfile;
  siteUrl: URL;
  storeName: string;
  whatsapp: string;
  address: {
    street: string;
    number: string;
    city: string;
    state: string;
  };
  deliveryCities: readonly string[];
  businessHours: readonly SchemaBusinessHour[];
  instagramUrl: string | null;
};

const schemaWeekdays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function buildStoreSchemaOrg({
  installation,
  siteUrl,
  storeName,
  whatsapp,
  address,
  deliveryCities,
  businessHours,
  instagramUrl,
}: StoreSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": installation.seo.schemaOrgType,
    name: storeName,
    url: siteUrl.toString(),
    telephone: whatsapp,
    image: new URL("/opengraph-image", siteUrl).toString(),
    address: {
      "@type": "PostalAddress",
      streetAddress: `${address.street}, ${address.number}`,
      addressLocality: address.city,
      addressRegion: address.state,
      addressCountry: installation.address.country,
    },
    areaServed: [...deliveryCities],
    sameAs: instagramUrl ? [instagramUrl] : undefined,
    openingHoursSpecification: businessHours
      .filter(
        (hour) => hour.isOpen && hour.opensAt && hour.closesAt
      )
      .map((hour) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: schemaWeekdays[hour.weekday],
        opens: hour.opensAt,
        closes: hour.closesAt,
      })),
  };
}

export function formatInstallationAddress(
  installation: PublicInstallationProfile
) {
  return `${installation.address.street}, ${installation.address.number} — ${installation.address.city}/${installation.address.state}`;
}

export function formatPrivacyNoticeDate(
  installation: PublicInstallationProfile
) {
  return new Intl.DateTimeFormat(installation.regionalization.locale, {
    dateStyle: "long",
    timeZone: installation.regionalization.timeZone,
  }).format(
    new Date(`${installation.legal.privacyNoticeLastUpdated}T12:00:00.000Z`)
  );
}

export function buildPrivacyContactMessage(
  installation: PublicInstallationProfile
) {
  return `Olá! Quero falar sobre os meus dados pessoais no sistema da ${installation.identity.shortName}.`;
}

export function buildReportTitle(
  installation: PublicInstallationProfile
) {
  return `RELATÓRIO ${installation.identity.name.toLocaleUpperCase(
    installation.regionalization.locale
  )}`;
}

function safeFilePart(value: string, fallback: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || fallback;
}

export function buildReportFilename(
  installation: PublicInstallationProfile,
  period: { from: string | null; to: string | null }
) {
  const slug = safeFilePart(installation.identity.slug, "instalacao");
  const from = safeFilePart(period.from ?? "completo", "completo");
  const to = safeFilePart(period.to ?? "atual", "atual");

  return `relatorio-${slug}-${from}-${to}.csv`;
}

export function hexToRgba(hex: string, alpha: number) {
  const value = hex.slice(1);
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  return `rgba(${red},${green},${blue},${alpha})`;
}
