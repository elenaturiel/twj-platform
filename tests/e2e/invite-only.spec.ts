import { expect, test } from "@playwright/test";
import { login, uniqueEmail } from "./helpers";

test("alta solo con invitación: solicita plaza, Jaime acepta, el cliente entra con su enlace", async ({ browser }) => {
  const email = uniqueEmail("plaza");
  // 1) Alguien solicita plaza desde /empezar
  const visitor = await browser.newPage();
  await visitor.goto("/empezar");
  await expect(visitor.getByText(/Plazas limitadas/)).toBeVisible();
  await visitor.getByRole("link", { name: "Voy All In" }).click();
  await expect(visitor.getByRole("heading", { name: /Solicita tu plaza/ })).toBeVisible();
  await visitor.getByLabel("Nombre y apellidos").fill("Lucía Plaza");
  await visitor.getByLabel("Email").fill(email);
  await visitor.getByLabel(/Teléfono/).fill("+34 600 111 222");
  await visitor.getByRole("checkbox").check();
  await visitor.getByRole("button", { name: "Solicitar plaza" }).click();
  await expect(visitor.getByRole("heading", { name: "¡Solicitud enviada!" })).toBeVisible();

  // 2) Jaime la acepta y obtiene el enlace de acceso
  const staff = await browser.newPage();
  await login(staff, "jaime@twj.local");
  await staff.goto("/panel/pendientes");
  const row = staff.locator("li", { hasText: email });
  await row.getByRole("link", { name: "Aceptar" }).click();
  await expect(staff.getByLabel("Email")).toHaveValue(email);
  await expect(staff.getByLabel("Nombre y apellidos")).toHaveValue("Lucía Plaza");
  await staff.getByRole("button", { name: "Crear y generar acceso" }).click();
  await expect(staff.getByText("ya tiene cuenta")).toBeVisible({ timeout: 20_000 });
  const link = (await staff.locator("p.font-mono").innerText()).trim();
  expect(link).toContain("/auth/confirm?token_hash=");

  // WhatsApp abre el enlace para la vista previa antes que la clienta: no debe gastarlo
  const preview = await browser.newPage();
  await preview.goto(link);
  await expect(preview.getByRole("button", { name: "Continuar" })).toBeVisible();
  await preview.close();

  // 3) La clienta abre el enlace, pulsa Continuar, pone contraseña y queda dentro
  const client = await browser.newPage();
  await client.goto(link);
  await client.getByRole("button", { name: "Continuar" }).click();
  await expect(client).toHaveURL(/nueva-contrasena/);
  await client
    .getByLabel(/contraseña/i)
    .first()
    .fill("una-clave-segura-1");
  await client
    .getByRole("button")
    .filter({ hasText: /contraseña/i })
    .first()
    .click();
  await expect(client).not.toHaveURL(/nueva-contrasena|login/, { timeout: 20_000 });

  // 4) La solicitud ya no está pendiente
  await staff.goto("/panel/pendientes");
  await expect(staff.locator("li", { hasText: email })).toHaveCount(0);
});

test("con el alta cerrada, nadie puede crear cuenta pagando", async ({ page }) => {
  await page.goto("/empezar/cuenta?plan=rookie");
  await expect(page.getByRole("button", { name: "Ir al pago" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Solicitar plaza" })).toBeVisible();
});
