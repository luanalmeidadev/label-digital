import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

const enabled = process.env.PLAYWRIGHT_DEMO_BURGER === "1";
const suite = enabled ? test.describe : test.describe.skip;
const screenshotsDir = join(process.cwd(), "test-results", "demo-burger");

async function screenshot(page: Page, name: string, fullPage = true) {
  mkdirSync(screenshotsDir, { recursive: true });
  await page.screenshot({
    path: join(screenshotsDir, `${name}.png`),
    fullPage,
    animations: "disabled",
  });
}

async function setOpenStoreTime(page: Page) {
  await page.clock.setFixedTime(new Date("2026-08-27T15:00:00-03:00"));
}

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("E-mail").fill(process.env.DEMO_BURGER_ADMIN_EMAIL!);
  await page.getByLabel("Senha").fill(process.env.DEMO_BURGER_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin(?:\?|$)/);
  await expect(page.getByRole("link", { name: "Visão geral" })).toBeVisible();
}

suite("demo comercial Brasa Burger", () => {
  test("cliente configura, revisa e envia um pedido fictício", async ({ page, context }) => {
    await setOpenStoreTime(page);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1, name: "Sabor de verdade começa na brasa." })).toBeVisible();
    await expect(page.getByText("Brasa Burger Demo").first()).toBeVisible();
    await expect(page.getByText(/La'Bel|Confeitaria/i)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Hambúrgueres" })).toBeVisible();
    const xBaconCard = page.locator("article").filter({ hasText: "X-Bacon" }).first();
    await expect(xBaconCard).toContainText("R$ 28,00");
    await screenshot(page, "01-home-desktop");

    await page.setViewportSize({ width: 390, height: 844 });
    await screenshot(page, "02-home-mobile");
    await page.setViewportSize({ width: 1440, height: 1000 });

    await xBaconCard.getByRole("button", { name: "Escolher opções" }).click();
    await page.getByRole("radio", { name: /Duplo/ }).check();
    await page.getByRole("radio", { name: "Ao ponto" }).check();
    await page.getByRole("checkbox", { name: /Cheddar/ }).check();
    await page.getByRole("checkbox", { name: /Bacon/ }).check();
    await page.getByPlaceholder("Ex.: sem cebola, cortar ao meio").fill("Sem cebola");
    await expect(page.getByText("R$ 45,00").last()).toBeVisible();
    await screenshot(page, "03-configurador", false);
    await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();

    await page.getByRole("button", { name: "Abrir sacola" }).click();
    await expect(page.getByRole("heading", { name: "Sua sacola" })).toBeVisible();
    await expect(page.getByText("Duplo", { exact: true })).toBeVisible();
    await expect(page.getByText(/Cheddar/).first()).toBeVisible();
    await expect(page.getByText("Obs.: Sem cebola")).toBeVisible();
    await screenshot(page, "04-carrinho", false);

    await page.getByRole("button", { name: "Continuar pedido" }).click();
    await page.getByLabel("WhatsApp").fill("11900000002");
    await page.getByLabel("Nome", { exact: true }).fill("Cliente");
    await page.getByLabel("Sobrenome").fill("Visual");
    await page.getByRole("button", { name: "Retirada" }).click();
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByText("Revisar pedido")).toBeVisible();
    await page.getByRole("button", { name: "Pix" }).click();
    await expect(page.getByText("Verificação de segurança ativa no ambiente de testes.")).toBeVisible();
    await screenshot(page, "05-checkout", false);

    const popupPromise = context.waitForEvent("page");
    await page.getByRole("button", { name: "Enviar pedido pelo WhatsApp" }).click();
    const popup = await popupPromise;
    expect(popup.url()).toMatch(/wa\.me|whatsapp/i);
    await popup.close();
    await expect(page.getByRole("button", { name: "Abrir sacola" })).toHaveCount(0);
  });

  test("admin demonstra pedidos, impressão, POS, relatórios e perdas", async ({ page, context }) => {
    test.setTimeout(90_000);
    await page.goto("/admin/login");
    await expect(page.getByRole("heading", { name: "Administração Brasa Burger" })).toBeVisible();
    await expect(page.getByText(/La'Bel|Confeitaria/i)).toHaveCount(0);
    await screenshot(page, "06-login-admin");
    await login(page);

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Olá");
    await expect(page.getByRole("link", { name: "Encomendas" })).toHaveCount(0);
    await screenshot(page, "07-dashboard");

    await page.goto("/admin/produtos?session=started");
    await expect(page.getByRole("heading", { name: "Produtos", exact: true })).toBeVisible();
    await expect(page.getByText("X-Bacon", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Hambúrgueres", { exact: true }).first()).toBeVisible();
    await screenshot(page, "08-produtos");

    await page.goto("/admin/pedidos?session=started");
    await expect(page.getByRole("heading", { name: "Pedidos", exact: true })).toBeVisible();
    await expect(page.getByText("Cliente Demonstração").first()).toBeVisible();
    await screenshot(page, "09-pedidos");

    const onlineOrder = page.locator("article").filter({ hasText: "Cliente Demonstração" }).first();
    await onlineOrder.getByRole("button", { name: "Ver pedido" }).click();
    await expect(page.getByText("Variante: Duplo", { exact: true })).toBeVisible();
    await expect(page.getByText(/\+ Cheddar/)).toBeVisible();
    await expect(page.getByText("Obs: Sem cebola", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    const printLink = onlineOrder.getByRole("link", { name: /Imprimir/ });
    const printPromise = context.waitForEvent("page");
    await printLink.click();
    const printPage = await printPromise;
    await expect(printPage.getByText(/1x X-Bacon/)).toBeVisible();
    await expect(printPage.getByText("Duplo", { exact: true })).toBeVisible();
    await printPage.close();

    await page.goto("/admin/caixa?session=started");
    await expect(page.getByRole("heading", { name: "Caixa", exact: true })).toBeVisible();
    await expect(page.getByText("Caixa aberto")).toBeVisible();
    const posProduct = page.locator("button").filter({ hasText: "X-Bacon" }).first();
    await posProduct.click();
    await page.getByRole("radio", { name: /Clássico/ }).check();
    await page.getByRole("radio", { name: "Ao ponto" }).check();
    await page.getByRole("checkbox", { name: /Cheddar/ }).check();
    await page.getByRole("checkbox", { name: /Bacon/ }).check();
    await page.getByPlaceholder("Ex.: sem cebola").fill("Sem cebola");
    await page.getByRole("button", { name: "Adicionar à venda" }).click();
    await expect(page.getByText("R$ 37,00").last()).toBeVisible();
    await page.getByLabel("Cliente (opcional)").fill("Cliente POS Visual");
    await screenshot(page, "10-pos-caixa");
    await page.getByRole("button", { name: "Finalizar venda" }).click();
    await expect(page.getByText(/Venda #\d+ concluída/)).toBeVisible({
      timeout: 30_000,
    });

    await page.goto("/admin/relatorios?session=started&period=today");
    await expect(page.getByRole("heading", { name: "Relatórios" })).toBeVisible();
    await expect(page.getByText("X-Bacon", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Cheddar", { exact: true }).first()).toBeVisible();
    await screenshot(page, "11-relatorios");

    await page.goto("/admin/caixa?session=started");
    const lossesCard = page.locator("article").filter({
      has: page.getByRole("heading", { name: "Perdas deste caixa" }),
    });
    await expect(lossesCard.getByText(/Batata Frita/)).toBeVisible();
    await expect(lossesCard.getByText("Variante: M", { exact: true })).toBeVisible();
  });
});
