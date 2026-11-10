import { expect, test } from "@playwright/test";
import { login, testDb } from "./helpers";

test("Jaime guarda el IVA y abre o cierra el alta desde Ajustes", async ({ page }) => {
  const db = testDb();
  await login(page, "jaime@twj.local");
  await page.goto("/panel/ajustes");

  const vat = page.getByLabel(/IVA incluido/);
  await vat.fill("21");
  await vat.locator("xpath=ancestor::form").getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Guardado").first()).toBeVisible();

  const toggle = page.getByRole("switch", { name: /Cualquiera puede darse de alta/ });
  await expect(toggle).not.toBeChecked();
  await toggle.click();
  await expect(page.getByText(/Alta abierta/).first()).toBeVisible();
  await expect
    .poll(async () => (await db.from("settings").select("value").eq("key", "access.public_signup").single()).data?.value)
    .toBe(true);
  await toggle.click();
  await expect
    .poll(async () => (await db.from("settings").select("value").eq("key", "access.public_signup").single()).data?.value)
    .toBe(false);
});

test("el menú de la cuenta lleva a cambiar la contraseña", async ({ page }) => {
  await login(page, "jaime@twj.local");
  await page.getByRole("button", { name: "Tu cuenta" }).click();
  await page.getByRole("menuitem", { name: "Cambiar contraseña" }).click();
  await expect(page).toHaveURL(/\/auth\/nueva-contrasena/);
});
