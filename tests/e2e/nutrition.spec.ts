import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("nutrición: el cliente ve su menú, pide un cambio y genera la lista de la compra", async ({ browser }) => {
  const client = await browser.newPage();
  await login(client, "cliente4@twj.local");
  await client.goto("/comida");
  await expect(client.getByRole("heading", { name: "Comida" })).toBeVisible();
  // Lunes del menú publicado con su resumen de macros
  await client.getByRole("tab", { name: "Lunes" }).click();
  await expect(client.getByText(/kcal/).first()).toBeVisible();

  // Pide un cambio del día
  await client.getByRole("button", { name: "Pedir un cambio en este día" }).click();
  await client.getByLabel("Motivo del cambio").fill("Ese día como fuera (E2E)");
  await client.getByRole("button", { name: "Enviar a Jaime" }).click();
  await expect(client.getByText("Enviado a Jaime", { exact: false })).toBeVisible();

  // Lista de la compra
  await client.goto("/comida/compra");
  await client.getByRole("button", { name: /Generar lista|Recalcular/ }).click();
  await expect(client.getByText("Lista actualizada")).toBeVisible();
  await expect(client.getByRole("checkbox").first()).toBeVisible();

  // Jaime ve la solicitud en la ficha del cliente
  const staff = await browser.newPage();
  await login(staff, "jaime@twj.local");
  await staff.goto("/panel/clientes");
  await staff.getByRole("link", { name: "Diego Sánchez" }).click();
  await staff.getByRole("link", { name: "Nutrición", exact: true }).click();
  await expect(staff.getByText("Ese día como fuera (E2E)").first()).toBeVisible();
});
