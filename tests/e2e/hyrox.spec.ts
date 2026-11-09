import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("HYROX: alguien se apunta en 3 pasos y Jaime lo ve en el panel", async ({ browser }) => {
  const email = `hyrox.${Date.now()}@example.com`;
  const visitor = await browser.newPage();
  await visitor.goto("/hyrox?ub=home&utm_source=e2e");
  await visitor.getByRole("button", { name: "Entreno en el gimnasio, pero sin competir" }).click();
  await visitor.getByRole("button", { name: "En los próximos 3 meses" }).click();
  await visitor.getByLabel("Tu email").fill(email);
  // Sin consentimiento no deja
  await visitor.getByRole("button", { name: "Avisadme" }).click();
  await expect(visitor.getByText("Marca la casilla para que podamos escribirte.")).toBeVisible();
  await visitor.getByRole("checkbox").check();
  await visitor.getByRole("button", { name: "Avisadme" }).click();
  await expect(visitor.getByRole("heading", { name: "Apuntado." })).toBeVisible();

  const staff = await browser.newPage();
  await login(staff, "jaime@twj.local");
  await staff.goto("/panel/hyrox");
  const row = staff.getByRole("row", { name: new RegExp(email.replace(/\./g, "\\.")) });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Entrena, sin competir");
  await expect(row).toContainText("e2e");
});

test("retos: el cliente se apunta y ve su progreso", async ({ page }) => {
  await login(page, "cliente2@twj.local");
  await page.goto("/retos");
  // Si hay medallas nuevas, primero sale la celebración
  await page
    .getByRole("dialog")
    .waitFor({ timeout: 4000 })
    .catch(() => {});
  for (let i = 0; i < 5; i++) {
    const next = page.getByRole("dialog").getByRole("button", { name: /¡Vamos!|Siguiente/ });
    if (!(await next.isVisible().catch(() => false))) break;
    await next.click();
  }
  const card = page.locator("article", { hasText: "300.000 pasos" });
  const join = card.getByRole("button", { name: "Me apunto" });
  if (await join.count()) {
    await join.click();
    await expect(page.getByText("¡Dentro del reto!")).toBeVisible();
  }
  await expect(card.getByRole("progressbar")).toBeVisible();
});
