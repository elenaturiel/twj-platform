import { expect, test } from "@playwright/test";
import { uniqueEmail } from "./helpers";

test("alta + pago: elige plan, crea cuenta, paga y rellena la ficha", async ({ page }) => {
  await page.goto("/empezar");
  await expect(page.getByRole("heading", { name: "Elige tu plan" })).toBeVisible();
  // Peak nunca muestra precio
  await expect(page.getByText("A medida", { exact: true }).first()).toBeVisible();

  await page.getByRole("link", { name: "Voy All In" }).click();
  await page.getByLabel("Nombre y apellidos").fill("Prueba E2E");
  await page.getByLabel("Email").fill(uniqueEmail("alta"));
  await page.getByLabel("Contraseña").fill("contraseña-segura");
  await page.getByRole("checkbox", { name: /universitario/ }).click();
  await page.getByRole("checkbox", { name: /términos del servicio/ }).click();
  await page.getByRole("checkbox", { name: /datos de salud/ }).click();

  // All In 44,90 − 10 % estudiante = 40,41 €
  await expect(page.locator("aside")).toContainText("40,41");
  await page.getByRole("button", { name: "Ir al pago" }).click();

  await expect(page).toHaveURL(/pago-simulado/);
  await page.getByRole("button", { name: "Pagar (simulado)" }).click();

  await expect(page).toHaveURL(/onboarding/, { timeout: 20_000 });
  await page.getByLabel("¿Cuál es tu objetivo?").fill("Ganar fuerza sin lesionarme");
  await page.getByLabel("Fecha de nacimiento").fill("2003-04-15");
  await page.getByLabel("Intermedio").click();
  await page.getByRole("button", { name: "Lun", exact: true }).click();
  await page.getByRole("button", { name: "Jue", exact: true }).click();
  await page.getByLabel("Gimnasio", { exact: true }).click();
  await page.getByRole("button", { name: "Seguir" }).click();

  const noButtons = page.getByRole("radio", { name: "No" });
  for (let i = 0; i < (await noButtons.count()); i++) await noButtons.nth(i).click();
  await page.getByRole("button", { name: "Terminar" }).click();

  await expect(page).toHaveURL(/\/hoy/);
  await expect(page.getByRole("heading", { name: /Hola, Prueba/ })).toBeVisible();
});

test("sin pago no se entra en la app", async ({ page }) => {
  await page.goto("/empezar/cuenta?plan=rookie");
  await page.getByLabel("Nombre y apellidos").fill("Sin Pagar");
  await page.getByLabel("Email").fill(uniqueEmail("sinpago"));
  await page.getByLabel("Contraseña").fill("contraseña-segura");
  await page.getByRole("checkbox", { name: /términos del servicio/ }).click();
  await page.getByRole("checkbox", { name: /datos de salud/ }).click();
  await page.getByRole("button", { name: "Ir al pago" }).click();
  await expect(page).toHaveURL(/pago-simulado/);

  // Intenta saltarse el pago
  await page.goto("/hoy");
  await expect(page).toHaveURL(/\/estado/);
  await expect(page.getByText("Estamos confirmando tu pago")).toBeVisible();
});
