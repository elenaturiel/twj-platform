import { expect, test } from "@playwright/test";
import { login, testDb, todayMadrid, uniqueEmail } from "./helpers";

test("contactos: Jaime apunta una asesoría, la sigue y la convierte en cliente con lo hablado", async ({ page }) => {
  const email = uniqueEmail("asesoria");
  const name = `Marta Asesoría ${Date.now() % 100000}`;
  await login(page, "jaime@twj.local");

  // 1) Nuevo contacto con lo que cuenta en la llamada
  await page.goto("/panel/contactos/nuevo");
  await page.getByLabel("Nombre y apellidos").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Teléfono").fill("+34 600 111 222");
  await page.getByLabel("Tipo de contacto").selectOption("free_consult");
  await page.getByLabel("Estado").selectOption("thinking");
  await page.getByLabel("Próximo seguimiento").fill(todayMadrid());
  await page.getByLabel("Objetivo").fill("Correr mi primer 10K");
  await page.getByLabel("Nivel").selectOption("intermediate");
  await page.getByRole("button", { name: "Lun" }).click();
  await page.getByRole("button", { name: "Mié" }).click();
  await page.getByLabel("Alergias y preferencias de comida").fill("Sin lactosa");
  await page.getByLabel("Notas", { exact: true }).fill("Le encaja MVP, lo piensa hasta el viernes");
  await page.getByRole("button", { name: "Crear contacto" }).click();
  await expect(page).toHaveURL(/\/panel\/contactos\/[0-9a-f-]{36}$/, { timeout: 20_000 });

  // 2) Comentario con fecha
  await page.getByLabel("Nuevo comentario").fill("Le escribo el viernes por WhatsApp");
  await page.getByRole("button", { name: "Añadir comentario" }).click();
  await expect(page.getByText("Le escribo el viernes por WhatsApp")).toBeVisible();

  // 3) Aparece en Pendientes porque toca escribirle hoy
  await page.goto("/panel/pendientes");
  await expect(page.getByRole("link", { name })).toBeVisible();

  // 4) Se apunta: crear su ficha de cliente desde el contacto
  await page.getByRole("link", { name }).click();
  await page.getByRole("link", { name: "Crear ficha de cliente" }).click();
  await expect(page).toHaveURL(/\/panel\/clientes\/nuevo\?/);
  await expect(page.getByLabel("Nombre y apellidos")).toHaveValue(name);
  await expect(page.getByLabel("Email")).toHaveValue(email);
  await page.getByLabel("Plan").selectOption("rookie");
  await page.getByRole("button", { name: "Crear y generar acceso" }).click();
  await expect(page.getByText("ya tiene cuenta")).toBeVisible({ timeout: 20_000 });

  // 5) Su ficha lleva lo hablado y el contacto queda como cliente
  const db = testDb();
  const { data: contact } = await db.from("contacts").select("status, client_id").eq("email", email).single();
  expect(contact?.status).toBe("client");
  const { data: intake } = await db
    .from("client_intake")
    .select("goal, experience, available_days, allergy_notes")
    .eq("client_id", contact!.client_id!)
    .single();
  expect(intake).toEqual({
    goal: "Correr mi primer 10K",
    experience: "intermediate",
    available_days: [0, 2],
    allergy_notes: "Sin lactosa",
  });
  const { data: notes } = await db.from("client_notes").select("body").eq("client_id", contact!.client_id!);
  expect(notes?.[0]?.body).toContain("Le encaja MVP");
});
