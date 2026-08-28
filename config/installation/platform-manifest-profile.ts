import type { PlatformDemoManifest } from "@/config/installation/platform-manifest.mjs";
import type {
  FoodBusinessSegment,
  PublicInstallationProfile,
} from "@/config/installation/types";
import { defineInstallationProfile } from "@/config/installation/validate";

const segmentSeoTitles: Record<FoodBusinessSegment, string> = {
  confectionery: "Confeitaria artesanal",
  hamburger: "Burgers artesanais",
  "snack-bar": "Lanches artesanais",
  "meal-prep": "Refeições preparadas",
  pizzeria: "Pizzas artesanais",
  restaurant: "Restaurante",
  cafe: "Cafeteria",
  "acai-ice-cream": "Açaí e sorvetes",
  other: "Cardápio digital",
};

function parseHex(color: string) {
  return {
    red: Number.parseInt(color.slice(1, 3), 16),
    green: Number.parseInt(color.slice(3, 5), 16),
    blue: Number.parseInt(color.slice(5, 7), 16),
  };
}

function relativeLuminance(color: string) {
  const channels = Object.values(parseHex(color)).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(first: string, second: string) {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

function readableForeground(background: string) {
  return contrastRatio(background, "#FFFFFF") >=
    contrastRatio(background, "#111111")
    ? "#FFFFFF"
    : "#111111";
}

function primaryHover(primary: string) {
  const { red, green, blue } = parseHex(primary);
  const factor = relativeLuminance(primary) > 0.12 ? 0.82 : 1.18;
  const channel = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value * factor)))
      .toString(16)
      .padStart(2, "0")
      .toUpperCase();

  return `#${channel(red)}${channel(green)}${channel(blue)}`;
}

function resolveAddress(
  address: string | undefined,
  preset: PublicInstallationProfile
) {
  if (!address) {
    return {
      street: preset.address.street,
      number: preset.address.number,
    };
  }

  const separator = address.lastIndexOf(",");
  if (separator <= 0 || separator === address.length - 1) {
    throw new Error(
      "Manifesto de demonstração inválido: location.address deve conter logradouro e número separados por vírgula."
    );
  }

  return {
    street: address.slice(0, separator).trim(),
    number: address.slice(separator + 1).trim(),
  };
}

export function applyPlatformDemoManifest(
  preset: PublicInstallationProfile,
  manifest: PlatformDemoManifest
): PublicInstallationProfile {
  const name = manifest.business.name;
  const address = resolveAddress(manifest.location.address, preset);
  const city = manifest.location.city ?? preset.address.city;
  const state = manifest.location.state ?? preset.address.state;
  const oldLocality = `${preset.address.city}/${preset.address.state}`;
  const newLocality = `${city}/${state}`;
  const seoSegmentTitle = segmentSeoTitles[preset.identity.businessSegment];
  const seoTitle = `${name} | ${seoSegmentTitle}`;

  return defineInstallationProfile({
    ...preset,
    identity: {
      ...preset.identity,
      name,
      shortName: name,
      slug: manifest.business.slug,
    },
    theme: {
      ...preset.theme,
      primary: manifest.theme.primary,
      onPrimary: readableForeground(manifest.theme.primary),
      primaryHover: primaryHover(manifest.theme.primary),
      accent: manifest.theme.secondary,
    },
    contact: {
      ...preset.contact,
      whatsapp: manifest.contact.whatsapp ?? preset.contact.whatsapp,
      phone: manifest.contact.whatsapp ?? preset.contact.phone,
      email: manifest.contact.email ?? preset.contact.email,
      instagram: manifest.contact.instagram ?? preset.contact.instagram,
    },
    address: {
      ...preset.address,
      ...address,
      city,
      state,
    },
    seo: {
      ...preset.seo,
      title: seoTitle,
      titleTemplate: `%s | ${name}`,
      siteName: name,
      manifestDescription: `Cardápio digital de ${name}.`,
      openGraph: {
        ...preset.seo.openGraph,
        title: seoTitle,
        image: {
          ...preset.seo.openGraph.image,
          alt: `${name} — cardápio digital`,
          footerItems: preset.seo.openGraph.image.footerItems.map((item) =>
            item === oldLocality ? newLocality : item
          ),
        },
      },
      twitter: {
        ...preset.seo.twitter,
        title: seoTitle,
      },
    },
    publicContent: {
      ...preset.publicContent,
      hero: {
        ...preset.publicContent.hero,
        eyebrow: name,
      },
    },
    legal: {
      ...preset.legal,
      controllerName: name,
      locality: {
        ...preset.legal.locality,
        city,
        state,
      },
    },
  });
}
