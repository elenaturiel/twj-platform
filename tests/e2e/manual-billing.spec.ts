import { expect, test } from "@playwright/test";
import { login, testDb, uniqueEmail } from "./helpers";

test("Jaime da de alta un cliente manual y registra su primer pago por Bizum", async ({ page }) => {
  await login(page, "jaime@twj.local");
  await expect(page).toHaveURL(/\/panel/);

  await page.goto("/panel/clientes/nuevo");
  await page.getByLabel("Nombre y apellidos").fill("Cliente Bizum");
  await page.getByLabel("Email").fill(uniqueEmail("bizum"));
  await page.getByLabel("Plan").selectOption("rookie");
  await page.getByRole("button", { name: "Crear y generar acceso" }).click();
  // Primero el enlace de acceso para mandárselo; luego, a su ficha
  await expect(page.getByText(/\/auth\/confirm\?token_hash=/)).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Ir a su ficha para registrar el pago" }).click();

  await expect(page).toHaveURL(/\/panel\/clientes\/.+\/pagos/, { timeout: 20_000 });
  await expect(page.getByText("Pendiente de pago").first()).toBeVisible();

  await page.getByLabel("Método").selectOption("bizum");
  await page.getByRole("button", { name: "Registrar primer pago y activar" }).click();
  await expect(page.getByText(/Pago registrado/)).toBeVisible();

  await page.reload();
  await expect(page.getByText("Activo").first()).toBeVisible();
  await expect(page.getByRole("cell", { name: "Bizum" })).toBeVisible();
});

test("al registrar el primer pago de un plan MVP se le dan sus directos y su videollamada del mes", async ({
  page,
}) => {
  const email = uniqueEmail("mvp");
  await login(page, "jaime@twj.local");
  await page.goto("/panel/clientes/nuevo");
  await page.getByLabel("Nombre y apellidos").fill("Cliente MVP");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Plan").selectOption("mvp");
  await page.getByRole("button", { name: "Crear y generar acceso" }).click();
  await expect(page.getByText(/\/auth\/confirm\?token_hash=/)).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Ir a su ficha para registrar el pago" }).click();
  await expect(page).toHaveURL(/\/panel\/clientes\/.+\/pagos/, { timeout: 20_000 });
  await page.getByLabel("Método").selectOption("bizum");
  await page.getByRole("button", { name: "Registrar primer pago y activar" }).click();
  await expect(page.getByText(/Pago registrado/)).toBeVisible();

  const db = testDb();
  const { data: profile } = await db.from("profiles").select("id").eq("email", email).single();
  const { data: client } = await db.from("clients").select("id").eq("profile_id", profile!.id).single();
  const { data: credits } = await db
    .from("session_credits")
    .select("credit_type, delta, reason")
    .eq("client_id", client!.id)
    .eq("reason", "monthly_grant");
  const byType = Object.fromEntries((credits ?? []).map((c) => [c.credit_type, c.delta]));
  expect(byType).toEqual({ live_training: 2, monthly_call: 1 });
});

test("un cliente no puede entrar en el panel", async ({ page }) => {
  await login(page, "cliente2@twj.local");
  await expect(page).toHaveURL(/\/hoy/);
  await page.goto("/panel/clientes");
  await expect(page).toHaveURL(/\/hoy/);
});
