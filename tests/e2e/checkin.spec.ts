import { expect, test } from "@playwright/test";
import { login, testDb, todayMadrid } from "./helpers";

test("check-in: Jaime lo pide, el cliente lo rellena y Jaime lo responde", async ({ browser }) => {
  // Repetible: quita el check-in de hoy de Pablo si quedó de una ejecución anterior
  const db = testDb();
  const { data: pablo } = await db.from("profiles").select("id").eq("email", "cliente2@twj.local").single();
  const { data: client0 } = await db.from("clients").select("id").eq("profile_id", pablo!.id).single();
  await db.from("checkins").delete().eq("client_id", client0!.id).eq("due_on", todayMadrid());

  // 1) Jaime pide un check-in a Pablo
  const staff = await browser.newPage();
  await login(staff, "jaime@twj.local");
  await staff.goto("/panel/clientes");
  await staff.getByRole("link", { name: "Pablo Ruiz" }).click();
  await staff.getByRole("link", { name: "Check-ins", exact: true }).click();
  await staff.getByRole("button", { name: "Pedir check-in ahora" }).click();
  await expect(staff.getByText(/Check-in pedido|Ya tiene un check-in con fecha de hoy/)).toBeVisible();

  // 2) Pablo lo rellena
  const client = await browser.newPage();
  await login(client, "cliente2@twj.local");
  await client.goto("/progreso/checkin");
  await client
    .getByRole("group", { name: /¿Qué tal ha ido la semana/ })
    .getByRole("button", { name: "8", exact: true })
    .click();
  await client
    .getByRole("group", { name: /¿Cuántos entrenos/ })
    .getByRole("textbox")
    .fill("3");
  await client
    .getByRole("group", { name: /¿Alguna molestia/ })
    .getByRole("button", { name: "No" })
    .click();
  await client.getByRole("button", { name: "Enviar check-in" }).click();
  await expect(client).toHaveURL(/\/progreso\/checkins/);
  await expect(client.getByText("Enviado").first()).toBeVisible();

  // 3) Jaime lo ve por revisar y responde
  await staff.goto("/panel/pendientes");
  await expect(staff.getByText(/Check-ins por revisar/)).toBeVisible();
  await staff.getByRole("link", { name: "Pablo Ruiz" }).first().click();
  await staff.waitForURL(/\/checkins/);
  const reply = staff.getByLabel("Respuesta al check-in").first();
  const send = staff.getByRole("button", { name: "Enviar y marcar revisado" }).first();
  // Reintenta hasta que la página está hidratada y el botón reacciona
  await expect(async () => {
    await reply.fill("Buen trabajo. Seguimos.");
    await expect(send).toBeEnabled({ timeout: 1000 });
  }).toPass({ timeout: 20_000 });
  await staff.getByRole("button", { name: "Enviar y marcar revisado" }).first().click();
  await expect(staff.getByText("Respuesta enviada")).toBeVisible();
});
