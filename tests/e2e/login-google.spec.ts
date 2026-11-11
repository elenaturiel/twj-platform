import { expect, test } from "@playwright/test";

test("sin Google configurado en Supabase no se enseña el botón (daría error)", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Entrar", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Google/ })).toHaveCount(0);
});
