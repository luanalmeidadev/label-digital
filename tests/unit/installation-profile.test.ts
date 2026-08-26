import { access } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";
import { brand } from "@/config/brand";
import { getPublicInstallationProfile } from "@/config/installation/public";
import { labelInstallationPreset } from "@/config/installation/presets/label";
import { validateInstallationProfile } from "@/config/installation/validate";
import { storeConfig } from "@/config/store";

function cloneAsRecord() {
  return structuredClone(
    labelInstallationPreset
  ) as unknown as Record<string, unknown>;
}

function nestedRecord(record: Record<string, unknown>, key: string) {
  const value = record[key];

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`O campo ${key} não é um objeto.`);
  }

  return value as Record<string, unknown>;
}

describe("Installation Profile", () => {
  it("valida o preset atual da La'Bel", () => {
    const validation = validateInstallationProfile(labelInstallationPreset);

    expect(validation).toEqual({ valid: true, errors: [] });
    expect(labelInstallationPreset.schemaVersion).toBe(2);
    expect(labelInstallationPreset.preset).toEqual({
      id: "label",
      version: 2,
    });
    expect(labelInstallationPreset.regionalization).toEqual({
      locale: "pt-BR",
      currency: "BRL",
      timeZone: "America/Sao_Paulo",
    });
  });

  it("valida Schema.org e o conteúdo institucional versionado", () => {
    expect(labelInstallationPreset.seo.schemaOrgType).toBe("Bakery");
    expect(labelInstallationPreset.seo.openGraph.image.footerItems).toEqual([
      "Cardápio do dia",
      "Encomendas",
      "Palhoça/SC",
    ]);
    expect(labelInstallationPreset.publicContent.preorders.banner).toMatchObject({
      eyebrow: "Encomendas",
      title: "Planejando algo especial?",
      ctaLabel: "Ver cardápio de encomendas",
    });
  });

  it("rejeita tipo Schema.org e rodapé da OG desconhecidos", () => {
    const invalidProfile = cloneAsRecord();
    const seo = nestedRecord(invalidProfile, "seo");
    const openGraph = nestedRecord(seo, "openGraph");
    const image = nestedRecord(openGraph, "image");

    seo.schemaOrgType = "LojaDeDoces";
    image.footerItems = [];

    const validation = validateInstallationProfile(invalidProfile);

    expect(validation.errors).toEqual(
      expect.arrayContaining([
        "seo.schemaOrgType não é reconhecido.",
        "seo.openGraph.image.footerItems deve conter ao menos um texto válido.",
      ])
    );
  });

  it("rejeita campos obrigatórios ausentes", () => {
    const invalidProfile = cloneAsRecord();
    delete invalidProfile.identity;

    const validation = validateInstallationProfile(invalidProfile);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain("identity.name é obrigatório.");
  });

  it("rejeita cores, assets e regionalização inválidos", () => {
    const invalidProfile = cloneAsRecord();
    const theme = nestedRecord(invalidProfile, "theme");
    const identity = nestedRecord(invalidProfile, "identity");
    const assets = nestedRecord(identity, "assets");
    const regionalization = nestedRecord(
      invalidProfile,
      "regionalization"
    );

    theme.primary = "vermelho";
    assets.icon = "javascript:alert(1)";
    regionalization.locale = "locale inválido";
    regionalization.currency = "REAL";
    regionalization.timeZone = "Brasil/São_Paulo";

    const validation = validateInstallationProfile(invalidProfile);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toEqual(
      expect.arrayContaining([
        "theme.primary deve ser uma cor hexadecimal com 6 dígitos.",
        "identity.assets.icon deve ser um caminho público ou uma URL HTTPS.",
        "regionalization.locale é inválido.",
        "regionalization.currency é inválida.",
        "regionalization.timeZone é inválido.",
      ])
    );
  });

  it("exige a configuração completa de módulos e suas dependências", () => {
    const invalidProfile = cloneAsRecord();
    const modules = nestedRecord(invalidProfile, "modules");

    modules.preorders = false;
    modules.preorderSchedule = true;
    delete modules.reports;

    const validation = validateInstallationProfile(invalidProfile);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toEqual(
      expect.arrayContaining([
        "modules deve declarar exatamente todos os módulos do contrato.",
        "modules.reports deve ser booleano.",
        "modules.preorderSchedule depende de modules.preorders.",
      ])
    );
  });

  it("expõe somente domínios públicos e nenhum segredo", () => {
    const publicProfile = getPublicInstallationProfile();
    const serializedProfile = JSON.stringify(publicProfile).toLowerCase();

    expect(Object.keys(publicProfile).sort()).toEqual(
      [
        "address",
        "contact",
        "identity",
        "legal",
        "modules",
        "preset",
        "publicContent",
        "regionalization",
        "schemaVersion",
        "seo",
        "theme",
      ].sort()
    );
    expect(serializedProfile).not.toMatch(
      /service_role|secret_key|auth_token|password/
    );
  });

  it("preserva os fallbacks e o manifest atuais da La'Bel", () => {
    expect(storeConfig.name).toBe("La'Bel Confeitaria");
    expect(storeConfig.whatsapp).toBe("5548988681096");
    expect(storeConfig.instagram).toBe("@label_confeitaria");
    expect(brand.assets.logoCream).toBe("/brand/logo-creme.svg");
    expect(manifest()).toMatchObject({
      name: "La'Bel Confeitaria",
      short_name: "La'Bel",
      background_color: "#FFFDF9",
      theme_color: "#8B0000",
      lang: "pt-BR",
      icons: [
        {
          src: "/icon.svg",
          sizes: "any",
          type: "image/svg+xml",
        },
      ],
    });
  });

  it("referencia assets locais existentes", async () => {
    const assets = labelInstallationPreset.identity.assets;
    const publicAssets = [
      assets.logos.default,
      assets.logos.onPrimary,
      assets.brandIcons.default,
      assets.brandIcons.onPrimary,
      assets.monograms.default,
      assets.monograms.onPrimary,
    ];

    await Promise.all(
      publicAssets.map((asset) =>
        access(path.resolve(process.cwd(), "public", asset.slice(1)))
      )
    );
    await expect(
      access(path.resolve(process.cwd(), "app", assets.icon.slice(1)))
    ).resolves.toBeUndefined();
  });
});
