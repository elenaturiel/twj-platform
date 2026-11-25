import { expect, test } from "@playwright/test";
import { login, testDb } from "./helpers";

// PNG de 2×2 px
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR42mP8z8Dwn4GBgYGJAQoAAB0eAgFFpJwCAAAAAElFTkSuQmCC",
  "base64",
);

test("el cliente pone su foto de perfil y aparece en el menú de su cuenta", async ({ page }) => {
  const db = testDb();
  const { data: prof } = await db.from("profiles").select("id").eq("email", "cliente2@twj.local").single();
  await db.from("profiles").update({ avatar_path: null }).eq("id", prof!.id);

  await login(page, "cliente2@twj.local");
  await page.goto("/perfil");
  await page.getByLabel("Foto de perfil").setInputFiles({ name: "yo.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByText("Foto de perfil actualizada")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("img", { name: "Tu foto de perfil" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tu cuenta" }).locator("img")).toBeVisible();

  const { data: after } = await db.from("profiles").select("avatar_path").eq("id", prof!.id).single();
  expect(after?.avatar_path).toMatch(new RegExp(`^${prof!.id}/avatar-\\d+\\.jpg$`));

  // Y se puede quitar
  await page.getByRole("button", { name: "Quitar" }).click();
  await expect(page.getByRole("button", { name: "Poner foto" })).toBeVisible();
});
