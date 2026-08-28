import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { expect, test } from "@playwright/test";

const enabled = process.env.PLAYWRIGHT_PLATFORM_MANIFEST === "1";
const suite = enabled ? test.describe : test.describe.skip;
const screenshotsDir = join(
  process.cwd(),
  "test-results",
  "platform-demo-manifest"
);

suite("demo personalizada por manifesto da Platform", () => {
  test("aplica identidade pública sem alterar catálogo ou módulos do preset", async ({
    page,
  }) => {
    mkdirSync(screenshotsDir, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");

    await expect(page.getByText("Brasa Burger").first()).toBeVisible();
    await expect(page.getByText("Brasa Burger Demo")).toHaveCount(0);
    await expect(page.getByText(/La'Bel|Confeitaria/i)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Hambúrgueres" })).toBeVisible();
    await expect(page.getByText("X-Bacon", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/encomendas/i)).toHaveCount(0);
    await expect(page).toHaveTitle(/Brasa Burger/);
    await expect
      .poll(() =>
        page.evaluate(() =>
          getComputedStyle(document.documentElement)
            .getPropertyValue("--installation-primary")
            .trim()
        )
      )
      .toBe("#155EEF");

    const structuredData = await page
      .locator('script[type="application/ld+json"]')
      .textContent();
    expect(structuredData).toContain("Rua das Brasas");
    expect(structuredData).toContain("Florianópolis");

    await page.screenshot({
      path: join(screenshotsDir, "01-home-desktop.png"),
      fullPage: true,
      animations: "disabled",
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: join(screenshotsDir, "02-home-mobile.png"),
      fullPage: true,
      animations: "disabled",
    });

    await page.goto("/admin/login");
    await expect(
      page.getByRole("heading", { name: "Administração Brasa Burger" })
    ).toBeVisible();
    await page.screenshot({
      path: join(screenshotsDir, "03-login-admin.png"),
      fullPage: true,
      animations: "disabled",
    });
  });
});

