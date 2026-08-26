import { expect, test } from "@playwright/test";

const demoBurger =
  process.env.NEXT_PUBLIC_INSTALLATION_PRESET === "demo-burger";

test("respeita a disponibilidade do módulo de encomendas", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: demoBurger
        ? "Sabor de verdade começa na brasa."
        : "Um doce momento começa por aqui.",
    })
  ).toBeVisible();
  await expect(
    page.getByText(/Loja aberta|Loja fechada/)
  ).toBeVisible();

  if (demoBurger) {
    await expect(
      page.getByRole("link", { name: /encomendar|programar/i })
    ).toHaveCount(0);
    const response = await page.goto("/encomendas");
    expect(response?.status()).toBe(404);
  } else {
    await page.getByRole("link", { name: /Quero encomendar/ }).click();
    await expect(page).toHaveURL(/\/encomendas$/);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Feito para celebrar os seus momentos.",
      })
    ).toBeVisible();
  }
});

test("expõe o estado de saúde do sistema", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toEqual({ status: "ok" });
});
