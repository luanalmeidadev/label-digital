import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  parsePlatformDemoManifest,
  parsePlatformDemoManifestJson,
} from "@/config/installation/platform-manifest.mjs";
import { resolveInstallationPreset } from "@/config/installation/resolve";
import { demoBurgerInstallationPreset } from "@/config/installation/presets/demo-burger";
import { labelInstallationPreset } from "@/config/installation/presets/label";

const fixtureJson = readFileSync(
  resolve(
    process.cwd(),
    "tests/fixtures/platform-manifests/brasa-burger.json"
  ),
  "utf8"
);
const fixture = JSON.parse(fixtureJson) as Record<string, unknown>;

function cloneFixture() {
  return structuredClone(fixture);
}

function nested(
  value: Record<string, unknown>,
  key: string
): Record<string, unknown> {
  return value[key] as Record<string, unknown>;
}

describe("manifesto externo da Label Digital Platform", () => {
  it("aceita o contrato real versionado emitido pela Platform", () => {
    const manifest = parsePlatformDemoManifestJson(fixtureJson);

    expect(manifest).toMatchObject({
      schemaVersion: 1,
      business: {
        name: "Brasa Burger",
        slug: "brasa-burger",
        segment: "hamburgueria",
        preset: "demo-burger",
      },
      theme: { primary: "#155EEF", secondary: "#0E9384" },
      contact: { whatsapp: "5511990000000" },
      location: { city: "Florianópolis", state: "SC" },
    });
    expect(Object.isFrozen(manifest)).toBe(true);
  });

  it.each([
    ["campo obrigatório", (value: Record<string, unknown>) => {
      delete nested(value, "business").name;
    }, "business.name deve ser texto"],
    ["schema incompatível", (value: Record<string, unknown>) => {
      value.schemaVersion = 2;
    }, "schemaVersion deve ser 1"],
    ["preset inexistente", (value: Record<string, unknown>) => {
      nested(value, "business").preset = "nao-existe";
    }, "business.preset não é conhecido"],
    ["segmento incompatível", (value: Record<string, unknown>) => {
      nested(value, "business").segment = "confeitaria";
    }, "não é compatível com o preset demo-burger"],
    ["cor inválida", (value: Record<string, unknown>) => {
      nested(value, "theme").primary = "azul";
    }, "theme.primary deve ser uma cor hexadecimal"],
    ["slug inválido", (value: Record<string, unknown>) => {
      nested(value, "business").slug = "Brasa Burger";
    }, "business.slug deve usar letras minúsculas"],
    ["texto acima do limite", (value: Record<string, unknown>) => {
      nested(value, "business").name = "B".repeat(121);
    }, "business.name deve ter no máximo 120 caracteres"],
    ["marcação perigosa", (value: Record<string, unknown>) => {
      nested(value, "business").name = "</script><script>alert(1)</script>";
    }, "business.name contém caracteres não permitidos"],
  ])("rejeita %s", (_label, mutate, expectedMessage) => {
    const invalid = cloneFixture();
    mutate(invalid);

    expect(() => parsePlatformDemoManifest(invalid)).toThrow(expectedMessage);
  });

  it("rejeita manifesto expirado", () => {
    const expired = cloneFixture();
    expired.expiresAt = "2026-01-01T00:00:00.000Z";

    expect(() =>
      parsePlatformDemoManifest(expired, {
        now: new Date("2026-08-28T12:00:00.000Z"),
      })
    ).toThrow("o manifesto está expirado");
  });

  it("rejeita campos não permitidos inclusive em objetos internos", () => {
    const topLevel = cloneFixture();
    topLevel.serviceRole = "não pode";
    expect(() => parsePlatformDemoManifest(topLevel)).toThrow(
      "manifesto contém campo não permitido: serviceRole"
    );

    const nestedField = cloneFixture();
    nested(nestedField, "business").command = "npm run anything";
    expect(() => parsePlatformDemoManifest(nestedField)).toThrow(
      "business contém campo não permitido: command"
    );
  });

  it("aplica somente overrides públicos sobre o preset base", () => {
    const effective = resolveInstallationPreset({
      requestedPreset: "demo-burger",
      requestedManifest: fixtureJson,
      nodeEnv: "test",
    });

    expect(effective).toMatchObject({
      preset: demoBurgerInstallationPreset.preset,
      identity: {
        name: "Brasa Burger",
        shortName: "Brasa Burger",
        slug: "brasa-burger",
        businessSegment: "hamburger",
      },
      theme: {
        primary: "#155EEF",
        accent: "#0E9384",
      },
      contact: {
        whatsapp: "5511990000000",
        email: "contato@brasa-burger.example",
        instagram: "@brasa_burger_demo",
      },
      address: {
        street: "Rua das Brasas",
        number: "250",
        city: "Florianópolis",
        state: "SC",
      },
      modules: {
        preorders: false,
        preorderSchedule: false,
      },
    });
    expect(effective.identity.assets).toEqual(
      demoBurgerInstallationPreset.identity.assets
    );
    expect(effective.publicContent.hero.title).toBe(
      demoBurgerInstallationPreset.publicContent.hero.title
    );
    expect(effective.seo.title).toContain("Brasa Burger");
    expect(effective.seo.title).not.toContain("Brasa Burger Demo");
    expect(effective.legal.controllerName).toBe("Brasa Burger");
    expect(JSON.stringify(effective)).not.toContain("Brasa Burger Demo");
  });

  it("mantém La'Bel e o demo base intactos quando não há manifesto", () => {
    expect(resolveInstallationPreset({ nodeEnv: "test" })).toBe(
      labelInstallationPreset
    );
    expect(
      resolveInstallationPreset({
        requestedPreset: "demo-burger",
        nodeEnv: "test",
      })
    ).toBe(demoBurgerInstallationPreset);
    expect(demoBurgerInstallationPreset.identity.name).toBe(
      "Brasa Burger Demo"
    );
    expect(labelInstallationPreset.identity.name).toBe("La'Bel Confeitaria");
  });

  it("bloqueia manifesto em produção normal e divergência de preset", () => {
    expect(() =>
      resolveInstallationPreset({
        requestedManifest: fixtureJson,
        nodeEnv: "production",
      })
    ).toThrow("não podem ser carregados neste ambiente");

    expect(() =>
      resolveInstallationPreset({
        requestedPreset: "label",
        requestedManifest: fixtureJson,
        nodeEnv: "test",
      })
    ).toThrow("não corresponde ao preset declarado no manifesto");
  });

  it("permite modo demo explícito em produção somente com Supabase local", () => {
    expect(
      resolveInstallationPreset({
        requestedManifest: fixtureJson,
        nodeEnv: "production",
        demoMode: "local",
        publicSupabaseUrl: "http://127.0.0.1:54321",
      }).identity.name
    ).toBe("Brasa Burger");

    expect(() =>
      resolveInstallationPreset({
        requestedManifest: fixtureJson,
        nodeEnv: "production",
        demoMode: "local",
        publicSupabaseUrl: "https://project.supabase.co",
      })
    ).toThrow("não podem ser carregados neste ambiente");
  });
});
