import { expect, test } from "@playwright/test";
import { login, uniqueEmail } from "./helpers";

test("Jaime da de alta un cliente manual y registra su primer pago por Bizum", async ({ page }) => {
  await login(page, "jaime@twj.local");
  await expect(page).toHaveURL(/\/panel/);

  await page.goto("/panel/clientes/nuevo");
  await page.getByLabel("Nombre y apellidos").fill("Cliente Bizum");
  await page.getByLabel("Email").fill(uniqueEmail("bizum"));
  await page.getByLabel("Plan").selectOption("rookie");
  await page.getByRole("button", { name: "Crear e invitar" }).click();

  await expect(page).toHaveURL(/\/panel\/clientes\/.+\/pagos/, { timeout: 20_000 });
  await expect(page.getByText("Pendiente de pago").first()).toBeVisible();

  await page.getByLabel("Método").selectOption("bizum");
  await page.getByRole("button", { name: "Registrar primer pago y activar" }).click();
  await expect(page.getByText(/Pago registrado/)).toBeVisible();

  await page.reload();
  await expect(page.getByText("Activo").first()).toBeVisible();
  await expect(page.getByRole("cell", { name: "Bizum" })).toBeVisible();
});

test("un cliente no puede entrar en el panel", async ({ page }) => {
  await login(page, "cliente2@twj.local");
  await expect(page).toHaveURL(/\/hoy/);
  await page.goto("/panel/clientes");
  await expect(page).toHaveURL(/\/hoy/);
});
