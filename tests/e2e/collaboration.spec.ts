import { expect, test } from "@playwright/test";
import { login, testDb, uniqueEmail } from "./helpers";

test("colaboración: Jaime marca que un cliente no paga y sigue siendo cliente con su plan", async ({ page }) => {
  const email = uniqueEmail("colab");
  await login(page, "jaime@twj.local");
  await page.goto("/panel/clientes/nuevo");
  await page.getByLabel("Nombre y apellidos").fill("Influencer Colab");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Plan").selectOption("mvp");
  await page.getByRole("button", { name: "Crear y generar acceso" }).click();
  await expect(page.getByText(/\/auth\/confirm\?token_hash=/)).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Ir a su ficha para registrar el pago" }).click();
  await expect(page).toHaveURL(/\/pagos/, { timeout: 20_000 });

  // En lugar de Bizum o transferencia: colaboración
  await page.getByLabel("Método").selectOption("collab");
  await page.getByLabel("Acuerdo de la colaboración").fill("Contenido en Instagram a cambio");
  await page.getByRole("button", { name: "Marcar como colaboración" }).click();
  await expect(page.getByText(/Marcado como colaboración/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Colaboración: no paga/)).toBeVisible();

  const db = testDb();
  const { data: profile } = await db.from("profiles").select("id").eq("email", email).single();
  const { data: client } = await db
    .from("clients")
    .select("id, status, billing_mode")
    .eq("profile_id", profile!.id)
    .single();
  expect(client).toMatchObject({ status: "active", billing_mode: "collab" });
  const { data: sub } = await db
    .from("subscriptions")
    .select("status, billing_mode, amount_cents, current_period_end")
    .eq("client_id", client!.id)
    .single();
  expect(sub).toEqual({ status: "active", billing_mode: "collab", amount_cents: 0, current_period_end: null });
  // Tiene sus créditos del mes como cualquier cliente MVP
  const { data: credits } = await db
    .from("session_credits")
    .select("credit_type, delta")
    .eq("client_id", client!.id)
    .eq("reason", "monthly_grant");
  expect(Object.fromEntries((credits ?? []).map((c) => [c.credit_type, c.delta]))).toEqual({
    live_training: 2,
    monthly_call: 1,
  });

  // Y se puede quitar: vuelve al cobro manual
  page.once("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: /Quitar colaboración/ }).click();
  await expect(page.getByText(/Ya no es colaboración/)).toBeVisible();
  const { data: after } = await db
    .from("subscriptions")
    .select("billing_mode, amount_cents")
    .eq("client_id", client!.id)
    .single();
  expect(after?.billing_mode).toBe("manual");
  expect(after?.amount_cents).toBeGreaterThan(0);
});
