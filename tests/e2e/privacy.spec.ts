import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test.describe("privacidad", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("aviso de cookies: aparece una vez y se cierra", async ({ page }) => {
    await page.goto("/login");
    const notice = page.getByRole("region", { name: "Aviso de cookies" });
    await expect(notice).toBeVisible();
    await notice.getByRole("button", { name: "Entendido" }).click();
    await page.reload();
    await expect(notice).toHaveCount(0);
  });

  test("el cliente descarga sus datos", async ({ page }) => {
    await login(page, "cliente2@twj.local");
    await page.goto("/perfil/privacidad");
    await page.getByRole("region", { name: "Aviso de cookies" }).getByRole("button", { name: "Entendido" }).click();
    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: /Descargar mis datos/ }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^mis-datos-twj-.*\.json$/);
    const json = JSON.parse(
      await (await file.createReadStream()).toArray().then((b) => Buffer.concat(b).toString("utf8")),
    );
    expect(json.perfil.email).toBe("cliente2@twj.local");
    expect(json.cliente).toBeTruthy();
  });
});

test("negocio: Jaime ve el MRR y descarga los pagos en CSV", async ({ page }) => {
  await login(page, "jaime@twj.local");
  await page.goto("/panel/negocio");
  await expect(page.getByText("MRR", { exact: true })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Pagos (CSV)" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^twj-pagos-.*\.csv$/);
  const text = Buffer.concat(await (await file.createReadStream()).toArray()).toString("utf8");
  expect(text).toContain("fecha,cliente,email");
});
