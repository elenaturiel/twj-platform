import { expect, test } from "@playwright/test";
import { login, testDb, uniqueEmail } from "./helpers";

test("plan HYROX a medida: se solicita, Jaime lo acepta con su precio y ajusta lo que incluye", async ({
  page,
  browser,
}) => {
  const email = uniqueEmail("hyrox");
  const name = `Raúl HYROX ${Date.now() % 1_000_000}`;

  // 1) En los planes aparece HYROX a medida y se solicita
  const visitor = await browser.newPage();
  await visitor.goto("/empezar");
  await expect(visitor.getByText("HYROX", { exact: true }).first()).toBeVisible();
  await visitor.getByRole("link", { name: "Solicitar HYROX" }).click();
  await expect(visitor).toHaveURL(/\/empezar\/solicitud\?plan=hyrox/);
  await visitor.getByLabel("Nombre").fill(name);
  await visitor.getByLabel("Email").fill(email);
  await visitor.getByLabel("Categoría").selectOption("Dobles");
  await visitor.getByLabel(/Qué carrera HYROX/).fill("HYROX Madrid");
  await visitor.getByLabel(/Acepto/).click();
  await visitor.getByRole("button", { name: "Solicitar HYROX" }).click();
  await expect(visitor.getByText("Solicitud enviada.")).toBeVisible();

  // 2) Jaime la ve en Pendientes y la acepta: alta con plan HYROX e importe pactado
  await login(page, "jaime@twj.local");
  await page.goto("/panel/pendientes");
  const row = page.locator("li", { hasText: name });
  await expect(row.getByText(/Quiere HYROX/)).toBeVisible();
  await expect(row.getByText(/HYROX Madrid · Dobles/)).toBeVisible();
  await row.getByRole("link", { name: "Aceptar" }).click();
  await expect(page.getByLabel("Plan")).toHaveValue("hyrox");
  await page.getByLabel("Importe pactado por periodo (€)").fill("120");
  await page.getByRole("button", { name: "Crear y generar acceso" }).click();
  await expect(page.getByText("ya tiene cuenta")).toBeVisible({ timeout: 20_000 });

  const db = testDb();
  const { data: profile } = await db.from("profiles").select("id").eq("email", email).single();
  const { data: client } = await db
    .from("clients")
    .select("id, plans(key), subscriptions(amount_cents)")
    .eq("profile_id", profile!.id)
    .single();
  const created = client as unknown as { plans: { key: string }; subscriptions: { amount_cents: number }[] };
  expect(created.plans.key).toBe("hyrox");
  expect(created.subscriptions[0]?.amount_cents).toBe(12000);

  // 3) Ajusta lo que incluye solo para este cliente: sin nutrición y 4 directos al mes
  await page.goto(`/panel/clientes/${client!.id}`);
  await page.getByRole("switch", { name: "Plan nutricional y menú semanal" }).click();
  await expect(page.getByText("ajustado para este cliente").first()).toBeVisible();
  const live = page.getByLabel("Cantidad de Entrenos en directo por videollamada");
  await live.fill("4");
  await live.blur();
  await expect(page.getByText("ajustado para este cliente")).toHaveCount(2);
  const { data: overrides } = await db
    .from("client_feature_overrides")
    .select("feature_key, enabled, limit_value")
    .eq("client_id", client!.id)
    .order("feature_key");
  expect(overrides).toEqual([
    { feature_key: "live_sessions", enabled: true, limit_value: 4 },
    { feature_key: "nutrition_plan", enabled: false, limit_value: null },
  ]);
});
