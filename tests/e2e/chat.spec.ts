import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("chat: el mensaje del cliente le llega a Jaime en directo y la respuesta vuelve", async ({ browser }) => {
  const staff = await browser.newPage();
  await login(staff, "jaime@twj.local");
  await staff.goto("/panel/clientes");
  await staff.getByRole("link", { name: "Pablo Ruiz" }).click();
  await staff.getByRole("link", { name: "Chat", exact: true }).click();
  await expect(staff.getByRole("log", { name: "Mensajes" })).toBeVisible();
  await staff.waitForTimeout(1500); // suscripción Realtime activa

  const client = await browser.newPage();
  await login(client, "cliente2@twj.local");
  await client.goto("/chat");
  const text = `Duda E2E ${Date.now()}`;
  await client.getByLabel("Mensaje", { exact: true }).fill(text);
  await client.getByRole("button", { name: "Enviar" }).click();
  await expect(client.getByText(text)).toBeVisible();

  // Llega sin recargar
  await expect(staff.getByText(text)).toBeVisible({ timeout: 15_000 });
  const reply = `Respuesta E2E ${Date.now()}`;
  await staff.getByLabel("Mensaje", { exact: true }).fill(reply);
  await staff.getByRole("button", { name: "Enviar" }).click();
  await expect(client.getByText(reply)).toBeVisible({ timeout: 15_000 });
});
