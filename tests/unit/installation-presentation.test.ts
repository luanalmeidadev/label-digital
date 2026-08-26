import { describe, expect, it } from "vitest";

import { labelInstallationPreset } from "@/config/installation/presets/label";
import {
  buildInstallationMetadata,
  buildInstallationViewport,
  buildPrivacyContactMessage,
  buildReportFilename,
  buildReportTitle,
  buildStoreSchemaOrg,
  formatInstallationAddress,
  formatPrivacyNoticeDate,
  getBusinessSegmentLabel,
  getInstallationBrandMark,
} from "@/lib/installation-presentation";

const installation = labelInstallationPreset;
const siteUrl = new URL("https://example.com");

describe("apresentação da instalação", () => {
  it("monta metadata e viewport a partir do perfil", () => {
    expect(
      buildInstallationMetadata(installation, siteUrl, false)
    ).toMatchObject({
      metadataBase: siteUrl,
      title: {
        default: installation.seo.title,
        template: installation.seo.titleTemplate,
      },
      description: installation.seo.description,
      applicationName: installation.identity.name,
      openGraph: {
        siteName: installation.seo.siteName,
        title: installation.seo.openGraph.title,
        description: installation.seo.openGraph.description,
      },
      twitter: {
        card: installation.seo.twitter.card,
        title: installation.seo.twitter.title,
      },
      robots: {
        index: true,
        follow: true,
        noarchive: false,
      },
    });
    expect(buildInstallationViewport(installation)).toEqual({
      themeColor: installation.theme.primary,
      colorScheme: "light",
    });
  });

  it("mantém homologação fora dos mecanismos de indexação", () => {
    expect(
      buildInstallationMetadata(installation, siteUrl, true).robots
    ).toMatchObject({ index: false, follow: false, noarchive: true });
  });

  it("monta Schema.org com o tipo e os dados efetivos da loja", () => {
    const schema = buildStoreSchemaOrg({
      installation,
      siteUrl,
      storeName: installation.identity.name,
      whatsapp: installation.contact.whatsapp,
      address: installation.address,
      deliveryCities: ["Palhoça"],
      businessHours: [
        {
          weekday: 1,
          isOpen: true,
          opensAt: "09:00",
          closesAt: "19:00",
        },
      ],
      instagramUrl: "https://instagram.com/label_confeitaria",
    });

    expect(schema).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Bakery",
      name: installation.identity.name,
      address: {
        "@type": "PostalAddress",
        addressCountry: "BR",
      },
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: "Monday",
          opens: "09:00",
          closes: "19:00",
        },
      ],
    });
  });

  it("deriva identidade, relatório e dados legais do perfil", () => {
    expect(getBusinessSegmentLabel(installation.identity.businessSegment)).toBe(
      "Confeitaria"
    );
    expect(getInstallationBrandMark(installation)).toBe("L'");
    expect(formatInstallationAddress(installation)).toBe(
      "Rua Capitão Augusto Vidal, 3600 — Palhoça/SC"
    );
    expect(formatPrivacyNoticeDate(installation)).toContain("agosto de 2026");
    expect(buildPrivacyContactMessage(installation)).toContain(
      installation.identity.shortName
    );
    expect(buildReportTitle(installation)).toBe(
      "RELATÓRIO LA'BEL CONFEITARIA"
    );
    expect(
      buildReportFilename(installation, {
        from: "2026-08-01",
        to: "2026-08-31",
      })
    ).toBe("relatorio-label-confeitaria-2026-08-01-2026-08-31.csv");
  });
});
