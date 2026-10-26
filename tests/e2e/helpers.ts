import { expect, type Page } from "@playwright/test";

export const DEMO_PASSWORD = "twj-demo-1234";

export async function login(page: Page, email: string, password = DEMO_PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
}

export function uniqueEmail(prefix: string) {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e4)}@e2e.local`;
}

export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.getByText(text).first()).toBeVisible();
}
