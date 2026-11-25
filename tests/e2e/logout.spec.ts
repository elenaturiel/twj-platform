import { expect, test } from "@playwright/test";
import { login } from "./helpers";

for (const [who, email] of [
  ["el cliente", "cliente2@twj.local"],
  ["Jaime (panel en el móvil)", "jaime@twj.local"],
] as const) {
  test(`${who} puede cerrar sesión desde el menú de la cuenta`, async ({ page }) => {
    await login(page, email);
    // Si otras pruebas le han dado medallas, en Hoy sale antes la celebración: se cierra como haría el cliente
    await page.locator('[aria-label="Tu cuenta"]').waitFor({ state: "attached" });
    const celebration = page.getByRole("dialog").filter({ hasText: "Nueva medalla" });
    while (await celebration.isVisible().catch(() => false)) {
      await celebration.getByRole("button", { name: /Siguiente|¡Vamos!/ }).click();
    }
    await page.getByRole("button", { name: "Tu cuenta" }).click();
    await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/login/);
    // Ya no hay sesión: volver a una página privada lleva al login
    await page.goto(email.startsWith("jaime") ? "/panel" : "/hoy");
    await expect(page).toHaveURL(/\/login/);
  });
}
