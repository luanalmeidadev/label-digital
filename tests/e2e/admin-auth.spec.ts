import { expect, test } from "@playwright/test";

const adminHeading =
  process.env.NEXT_PUBLIC_INSTALLATION_PRESET === "demo-burger"
    ? "Administração Brasa Burger"
    : "Administração La'bel";

test("protege o administrativo e oferece recuperação de senha", async ({
  page,
}) => {
  await page.goto("/admin");

  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: adminHeading,
    })
  ).toBeVisible();
  await expect(page.getByLabel("E-mail")).toBeVisible();
  await expect(page.getByLabel("Senha")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Esqueci minha senha" })
  ).toHaveAttribute("href", "/admin/recuperar-senha");
});
