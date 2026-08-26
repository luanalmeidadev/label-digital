import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  assertInstallationModuleEnabled,
  getHealthCheckKeys,
  getModulePublicPaths,
  isInstallationModuleEnabled,
  shouldLoadInstallationModuleData,
} from "@/config/installation/modules";
import { demoBurgerInstallationPreset } from "@/config/installation/presets/demo-burger";
import { labelInstallationPreset } from "@/config/installation/presets/label";

async function readProjectFile(file: string) {
  return readFile(path.resolve(process.cwd(), file), "utf8");
}

describe("módulos da instalação", () => {
  it("mantém encomendas e agenda ativas para a La'Bel", () => {
    expect(isInstallationModuleEnabled("preorders", labelInstallationPreset))
      .toBe(true);
    expect(
      isInstallationModuleEnabled(
        "preorderSchedule",
        labelInstallationPreset
      )
    ).toBe(true);
  });

  it("desativa encomendas e agenda no preset demo-burger", () => {
    expect(isInstallationModuleEnabled("preorders", demoBurgerInstallationPreset))
      .toBe(false);
    expect(
      isInstallationModuleEnabled(
        "preorderSchedule",
        demoBurgerInstallationPreset
      )
    ).toBe(false);
    expect(() =>
      assertInstallationModuleEnabled("preorders", demoBurgerInstallationPreset)
    ).toThrow("Módulo desabilitado: preorders.");
  });

  it("remove consultas, health check e URLs públicas dependentes do módulo", () => {
    expect(
      shouldLoadInstallationModuleData(
        "preorders",
        true,
        demoBurgerInstallationPreset
      )
    ).toBe(false);
    expect(getHealthCheckKeys(demoBurgerInstallationPreset)).toEqual([
      "database",
      "productStorage",
    ]);
    expect(getModulePublicPaths(demoBurgerInstallationPreset)).toEqual([]);

    expect(
      shouldLoadInstallationModuleData(
        "preorders",
        true,
        labelInstallationPreset
      )
    ).toBe(true);
    expect(getHealthCheckKeys(labelInstallationPreset)).toContain(
      "preorderStorage"
    );
    expect(getModulePublicPaths(labelInstallationPreset)).toEqual([
      "/encomendas",
    ]);
  });

  it("mantém proteções server-side nas rotas e ações do módulo", async () => {
    const files = await Promise.all([
      readProjectFile("app/encomendas/layout.tsx"),
      readProjectFile(
        "app/admin/(dashboard)/encomendas/layout.tsx"
      ),
      readProjectFile(
        "app/admin/(dashboard)/pedidos/encomendas/layout.tsx"
      ),
      readProjectFile(
        "app/admin/(dashboard)/pedidos/encomendas/calendario/layout.tsx"
      ),
      readProjectFile("app/encomendas/actions.ts"),
      readProjectFile(
        "app/admin/(dashboard)/encomendas/actions.ts"
      ),
      readProjectFile(
        "app/admin/(dashboard)/pedidos/encomendas/actions.ts"
      ),
    ]);

    expect(files[0]).toContain('requireInstallationModule("preorders")');
    expect(files[1]).toContain('requireInstallationModule("preorders")');
    expect(files[2]).toContain('requireInstallationModule("preorders")');
    expect(files[3]).toContain(
      'requireInstallationModule("preorderSchedule")'
    );
    expect(files.slice(4).every((source) =>
      source.includes('InstallationModuleEnabled("preorders")')
    )).toBe(true);
  });
});
