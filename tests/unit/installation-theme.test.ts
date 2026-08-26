import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { demoBurgerInstallationPreset } from "@/config/installation/presets/demo-burger";
import { labelInstallationPreset } from "@/config/installation/presets/label";
import {
  getInstallationThemeStyle,
  installationThemeTokens,
} from "@/config/installation/theme";

const legacyBrandColors = [
  "8B0000",
  "D2B48C",
  "FFFDF9",
  "241B19",
  "756A66",
  "EEE6DF",
  "F7F0EA",
  "700000",
  "6F0000",
];

async function findSourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return findSourceFiles(entryPath);
      }

      return /\.(?:ts|tsx)$/.test(entry.name) ? [entryPath] : [];
    })
  );

  return files.flat();
}

describe("tokens de tema da instalação", () => {
  it("mantém um contrato semântico pequeno e completo", () => {
    expect(installationThemeTokens).toEqual([
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
    ]);
  });

  it("preserva exatamente a paleta principal da La'Bel", () => {
    expect(getInstallationThemeStyle(labelInstallationPreset)).toEqual({
      "--installation-primary": "#8B0000",
      "--installation-primary-foreground": "#FFFFFF",
      "--installation-primary-hover": "#700000",
      "--installation-secondary": "#D2B48C",
      "--installation-background": "#FFFDF9",
      "--installation-surface": "#FFFFFF",
      "--installation-surface-muted": "#F7F0EA",
      "--installation-foreground": "#241B19",
      "--installation-muted-foreground": "#756A66",
      "--installation-border": "#EEE6DF",
    });
  });

  it("gera variáveis visuais diferentes para o demo", () => {
    const labelTheme = getInstallationThemeStyle(labelInstallationPreset);
    const demoTheme = getInstallationThemeStyle(demoBurgerInstallationPreset);

    expect(demoTheme["--installation-primary"]).toBe("#1F4D3A");
    expect(demoTheme["--installation-secondary"]).toBe("#F4A340");
    expect(demoTheme).not.toEqual(labelTheme);
  });

  it("expõe todos os tokens ao Tailwind", async () => {
    const css = await readFile(
      path.resolve(process.cwd(), "app/globals.css"),
      "utf8"
    );

    for (const token of installationThemeTokens) {
      expect(css).toContain(`--color-brand-${token}:`);
    }
  });

  it("não mantém as cores principais da La'Bel em classes migradas", async () => {
    const roots = ["app", "components"].map((root) =>
      path.resolve(process.cwd(), root)
    );
    const files = (await Promise.all(roots.map(findSourceFiles))).flat();
    const legacyClass = new RegExp(
      `\\[#(?:${legacyBrandColors.join("|")})\\]`,
      "i"
    );

    for (const file of files) {
      const source = await readFile(file, "utf8");
      expect(source, path.relative(process.cwd(), file)).not.toMatch(legacyClass);
    }
  });
});
