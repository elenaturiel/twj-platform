import { expect, test } from "@playwright/test";
import { login, testDb, uniqueEmail } from "./helpers";

test("menor: sin la autorización firmada del tutor no entrena; la sube, Jaime la aprueba y empieza", async ({
  browser,
}) => {
  const db = testDb();
  const email = uniqueEmail("menor");
  const password = "clave-del-menor-1";
  const name = `Hugo Menor ${Date.now() % 1_000_000}`;
  const { data: user } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  await db.from("profiles").update({ full_name: name }).eq("id", user.user!.id);
  const { data: plan } = await db.from("plans").select("id").eq("key", "rookie").single();
  const { data: client } = await db
    .from("clients")
    .insert({ profile_id: user.user!.id, status: "active", plan_id: plan!.id, billing_mode: "manual" })
    .select("id")
    .single();
  await db.from("client_intake").insert({ client_id: client!.id });

  // 1) Rellena la ficha: es menor → paso del tutor
  const minor = await browser.newPage();
  await login(minor, email, password);
  await expect(minor).toHaveURL(/onboarding/, { timeout: 20_000 });
  await minor.getByLabel("¿Cuál es tu objetivo?").fill("Mejorar en fútbol");
  await minor.getByLabel("Fecha de nacimiento").fill("2011-05-20");
  await minor.getByLabel("Intermedio").click();
  await minor.getByRole("button", { name: "Mar", exact: true }).click();
  await minor.getByLabel("Gimnasio", { exact: true }).click();
  await minor.getByRole("button", { name: "Seguir" }).click();
  const noButtons = minor.getByRole("radio", { name: "No" });
  for (let i = 0; i < (await noButtons.count()); i++) await noButtons.nth(i).click();
  await minor.getByRole("button", { name: "Seguir" }).click();
  await minor.getByLabel("Nombre del tutor/a").fill("Marta Madre");
  await minor.getByLabel("Email del tutor/a").fill(uniqueEmail("madre"));
  await minor.getByRole("button", { name: "Terminar" }).click();

  // 2) Bloqueado hasta la autorización: descarga el PDF con sus datos
  await expect(minor).toHaveURL(/\/estado/, { timeout: 20_000 });
  await expect(minor.getByText("Falta la autorización de tu tutor/a")).toBeVisible();
  const pdf = await minor.request.get("/api/autorizacion-tutor");
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
  const bytes = await pdf.body();
  expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  await minor.goto("/entreno");
  await expect(minor).toHaveURL(/\/estado/);

  // 3) Sube la autorización firmada
  await minor.getByLabel("Autorización firmada").setInputFiles({
    name: "autorizacion-firmada.pdf",
    mimeType: "application/pdf",
    buffer: bytes,
  });
  await expect(minor.getByText(/Autorización enviada/)).toBeVisible({ timeout: 20_000 });

  // 4) Jaime la ve en Pendientes y la aprueba
  const staff = await browser.newPage();
  await login(staff, "jaime@twj.local");
  await staff.goto("/panel/pendientes");
  const row = staff.locator("li", { hasText: name });
  await expect(row.getByText(/Firmada y subida/)).toBeVisible();
  await row.getByRole("button", { name: "Aprobar: ya puede entrenar" }).click();
  await expect(staff.getByText(`${name} ya puede entrenar.`)).toBeVisible({ timeout: 20_000 });

  const { data: after } = await db.from("clients").select("guardian_status").eq("id", client!.id).single();
  expect(after?.guardian_status).toBe("confirmed");

  // 5) Ya entra en su plan
  await minor.goto("/entreno");
  await expect(minor).toHaveURL(/\/entreno/);
});
