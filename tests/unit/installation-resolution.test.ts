import { describe, expect, it } from "vitest";

import { resolveInstallationPreset } from "@/config/installation/resolve";

describe("resolução do preset da instalação", () => {
  it("usa La'Bel como padrão seguro", () => {
    expect(resolveInstallationPreset({ nodeEnv: "development" }).preset.id).toBe(
      "label"
    );
  });

  it("resolve os dois presets conhecidos fora de produção", () => {
    expect(
      resolveInstallationPreset({
        requestedPreset: "label",
        nodeEnv: "test",
      }).identity.name
    ).toBe("La'Bel Confeitaria");
    expect(
      resolveInstallationPreset({
        requestedPreset: "demo-burger",
        nodeEnv: "development",
      }).identity.name
    ).toBe("Brasa Burger Demo");
  });

  it("bloqueia preset demo em produção", () => {
    expect(() =>
      resolveInstallationPreset({
        requestedPreset: "demo-burger",
        nodeEnv: "production",
      })
    ).toThrow("Presets de demonstração não podem ser selecionados em produção.");
  });

  it("rejeita preset desconhecido", () => {
    expect(() =>
      resolveInstallationPreset({
        requestedPreset: "outro",
        nodeEnv: "test",
      })
    ).toThrow("Installation preset desconhecido: outro.");
  });

  it("mantém identidade e operação fictícias no preset demo", () => {
    const demo = resolveInstallationPreset({
      requestedPreset: "demo-burger",
      nodeEnv: "test",
    });

    expect(demo).toMatchObject({
      identity: { name: "Brasa Burger Demo" },
      contact: {
        whatsapp: "5511999990000",
        instagram: "@brasaburger_demo",
      },
      address: {
        street: "Avenida Exemplo",
        number: "123",
        city: "Curitiba",
        state: "PR",
      },
    });
  });
});
