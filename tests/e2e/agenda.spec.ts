import { expect, test } from "@playwright/test";
import { login, testDb } from "./helpers";

test("agenda: el cliente reserva su videollamada mensual y la cancela recuperando el crédito", async ({ browser }) => {
  // Repetible: quita las videollamadas mensuales de Diego de ejecuciones anteriores
  const db = testDb();
  const { data: p } = await db.from("profiles").select("id").eq("email", "cliente4@twj.local").single();
  const { data: c } = await db.from("clients").select("id").eq("profile_id", p!.id).single();
  const { data: old } = await db
    .from("appointments")
    .select("id")
    .eq("client_id", c!.id)
    .eq("type_key", "monthly_call");
  const ids = (old ?? []).map((a) => a.id);
  if (ids.length) {
    await db.from("session_credits").delete().in("appointment_id", ids);
    await db.from("appointments").delete().in("id", ids);
  }

  const page = await browser.newPage();
  await login(page, "cliente4@twj.local");
  await page.goto("/agenda/reservar?tipo=monthly_call");
  await expect(page.getByText("Te queda 1 crédito").nth(1)).toBeVisible();
  // Salta solo al primer día con huecos; coge el primero
  const slot = page.getByRole("button", { name: /^\d{2}:\d{2}$/ }).first();
  await expect(slot).toBeVisible({ timeout: 20_000 });
  await slot.click();
  await page.getByRole("button", { name: "Confirmar reserva" }).click();
  await page.waitForURL("**/agenda");
  await expect(page.getByRole("heading", { name: "Videollamada mensual" })).toBeVisible();

  // Cancelar con antelación devuelve el crédito
  const card = page.locator("article", { has: page.getByRole("heading", { name: "Videollamada mensual" }) });
  await card.getByRole("button", { name: "Cancelar" }).click();
  await page.getByRole("button", { name: "Cancelar cita" }).click();
  await expect(page.getByText("Te hemos devuelto el crédito")).toBeVisible();
});

test("agenda: Jaime ve la semana y la disponibilidad", async ({ page }) => {
  await login(page, "jaime@twj.local");
  await page.goto("/panel/agenda");
  await expect(page.getByRole("heading", { name: "Agenda" })).toBeVisible();
  await page.getByRole("link", { name: "Disponibilidad" }).click();
  await expect(page.getByRole("heading", { name: "Disponibilidad" })).toBeVisible();
  await expect(page.getByText("Horario semanal")).toBeVisible();
});
