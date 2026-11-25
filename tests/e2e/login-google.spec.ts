import { expect, test } from "@playwright/test";

test("se entra con email y contraseña: no hay botón de Google", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Google/ })).toHaveCount(0);
});
