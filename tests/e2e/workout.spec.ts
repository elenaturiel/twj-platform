import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("el cliente registra un entreno y queda en su historial", async ({ page }) => {
  await login(page, "cliente4@twj.local");
  await expect(page).toHaveURL(/\/hoy/);

  await page.goto("/entreno");
  await page.locator('a[href^="/entreno/sesion/"]').first().click();
  await expect(page.getByRole("button", { name: "Terminar entreno" })).toBeVisible();

  // Primera serie de la sesión: rellena lo que pida el ejercicio y la marca como hecha
  const firstReps = page.getByLabel("Reps serie 1").first();
  if (await firstReps.isVisible().catch(() => false)) await firstReps.fill("5");
  const firstKg = page.getByLabel("Kg serie 1").first();
  if (await firstKg.isVisible().catch(() => false)) await firstKg.fill("100");
  await page.getByLabel("Marcar serie 1 como hecha").first().click();

  await page.getByRole("button", { name: "Terminar entreno" }).click();
  await page.getByRole("button", { name: "7", exact: true }).click();
  await page.getByRole("button", { name: "Bien" }).click();
  await page.getByRole("button", { name: "Guardar entreno" }).click();

  await expect(page.getByText("Entreno guardado. Hoy ganas.")).toBeVisible({ timeout: 15_000 });

  await page.goto("/entreno/historial");
  await expect(page.getByText("RPE 7").first()).toBeVisible();
});

test("Jaime ve el editor de bloques del cliente", async ({ page }) => {
  await login(page, "jaime@twj.local");
  await page.goto("/panel/clientes");
  await page.getByRole("link", { name: "Diego Sánchez" }).click();
  await page.getByRole("link", { name: "Entreno", exact: true }).click();
  await page.locator('a[href*="/entreno/"]').filter({ hasText: "Bloque 1" }).first().click();
  await expect(page.getByRole("heading", { name: "Semana 1" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Añadir semana" })).toBeVisible();
});
