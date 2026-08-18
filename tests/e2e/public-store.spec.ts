import { expect, test } from "@playwright/test";

test("carrega a loja e abre o cardápio de encomendas", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Um doce momento começa por aqui.",
    })
  ).toBeVisible();
  await expect(
    page.getByText(/Loja aberta|Loja fechada/)
  ).toBeVisible();

  await page.getByRole("link", { name: /Quero encomendar/ }).click();
  await expect(page).toHaveURL(/\/encomendas$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Feito para celebrar os seus momentos.",
    })
  ).toBeVisible();
});

test("expõe o estado de saúde do sistema", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toEqual({ status: "ok" });
});
