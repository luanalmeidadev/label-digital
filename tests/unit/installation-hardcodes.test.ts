import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

const migratedFiles = [
  "app/layout.tsx",
  "app/opengraph-image.tsx",
  "app/page.tsx",
  "app/privacidade/page.tsx",
  "components/store/Hero.tsx",
  "components/store/PreorderBanner.tsx",
  "components/store/CategoryGrid.tsx",
  "lib/order-status.ts",
  "lib/whatsapp.ts",
  "app/admin/(dashboard)/pedidos/[id]/imprimir/page.tsx",
  "app/admin/(dashboard)/pedidos/encomendas/[id]/imprimir/page.tsx",
  "app/admin/(dashboard)/caixa/[id]/imprimir/page.tsx",
  "app/admin/(dashboard)/relatorios/page.tsx",
];

describe("hardcodes de identidade migrados", () => {
  it.each(migratedFiles)("não fixa a marca em %s", async (file) => {
    const source = await readFile(path.resolve(process.cwd(), file), "utf8");
    const apostrophe = "'";
    const curlyApostrophe = "’";
    const forbiddenBrandNames = [
      `La${apostrophe}Bel`,
      `La${apostrophe}bel`,
      `La${curlyApostrophe}Bel`,
      `La${curlyApostrophe}bel`,
      "La&apos;Bel",
      "La&apos;bel",
    ];

    for (const brandName of forbiddenBrandNames) {
      expect(source).not.toContain(brandName);
    }

    expect(source).not.toContain("label-digital.vercel.app");
  });

  it("mantém o tipo Schema.org fora da página pública", async () => {
    const source = await readFile(
      path.resolve(process.cwd(), "app/page.tsx"),
      "utf8"
    );

    expect(source).not.toContain('"@type": "Bakery"');
  });
});
