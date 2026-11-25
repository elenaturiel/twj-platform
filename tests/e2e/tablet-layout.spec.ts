import { expect, test } from "@playwright/test";
import { login } from "./helpers";

// En CI se prueba contra la versión compilada (pnpm start): ahí es donde se perdió el diseño de tablet
for (const [name, viewport] of [
  ["iPad en vertical", { width: 820, height: 1180 }],
  ["tablet Android", { width: 600, height: 960 }],
] as const) {
  test.describe(name, () => {
    test.use({ viewport, isMobile: false, hasTouch: true });

    test(`el cliente ve el menú lateral como en el ordenador (${name})`, async ({ page }) => {
      await login(page, "cliente2@twj.local");
      await page.goto("/entreno");
      await expect(page.getByRole("navigation", { name: "Secciones" })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeHidden();
      await page.getByRole("navigation", { name: "Secciones" }).getByRole("link", { name: "Agenda" }).click();
      await expect(page).toHaveURL(/\/agenda/);
    });

    test(`Jaime ve el menú lateral del panel (${name})`, async ({ page }) => {
      await login(page, "jaime@twj.local");
      await expect(page.getByRole("navigation", { name: "Panel" })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeHidden();
    });
  });
}

test("en el móvil siguen los botones de abajo", async ({ page }) => {
  await login(page, "cliente2@twj.local");
  await page.goto("/entreno");
  await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Secciones" })).toBeHidden();
});
