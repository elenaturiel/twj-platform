import { expect, test } from "@playwright/test";
import * as XLSX from "xlsx";
import { login, testDb } from "./helpers";

test("Excel: Jaime descarga la plantilla, la rellena y sube entreno y dieta de un cliente a la primera", async ({
  page,
}) => {
  const db = testDb();
  await login(page, "jaime@twj.local");

  // 1) La plantilla trae las pestañas que lee la plataforma
  const res = await page.request.get("/api/plantilla");
  expect(res.status()).toBe(200);
  const wb = XLSX.read(await res.body());
  expect(wb.SheetNames).toEqual(expect.arrayContaining(["Instrucciones", "Entreno", "Dieta"]));

  // 2) Jaime la rellena (un alimento que no está en la base, para ver que se crea)
  const stamp = Date.now() % 1_000_000;
  const block = `Bloque Excel ${stamp}`;
  const newFood = `Bebida de avena ${stamp}`;
  XLSX.utils.sheet_add_json(
    wb.Sheets.Entreno!,
    [
      {
        Bloque: block,
        Semana: "1",
        Día: "Lunes",
        Sesión: "Pierna",
        Modalidad: "gym",
        Formato: "series",
        Ejercicio: "Sentadilla trasera",
        Series: "4",
        Reps: "8-10",
        Descanso: "2:00",
      },
      {
        Bloque: block,
        Semana: "1",
        Día: "Jueves",
        Sesión: "Carrera",
        Modalidad: "running",
        Formato: "carrera",
        Ejercicio: "Rodaje suave",
        "Distancia (m)": "5000",
        "Ritmo mín (/km)": "6:00",
      },
    ],
    {
      header: XLSX.utils.sheet_to_json<string[]>(wb.Sheets.Entreno!, { header: 1 })[0],
      skipHeader: true,
      origin: "A2",
    },
  );
  XLSX.utils.sheet_add_json(
    wb.Sheets.Dieta!,
    [
      { Semana: "1", Día: "Lunes", Comida: "Desayuno", Plato: "Porridge", Alimento: newFood, "Cantidad (g)": "200" },
      { Semana: "1", Día: "Lunes", Comida: "Cena", Alimento: "Huevos cocidos camperos", Unidades: "2" },
      { Semana: "2", Día: "Martes", Comida: "Comida", Alimento: "Lentejas", "Cantidad (g)": "250" },
    ],
    { header: XLSX.utils.sheet_to_json<string[]>(wb.Sheets.Dieta!, { header: 1 })[0], skipHeader: true, origin: "A2" },
  );
  const filled = Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));

  // 3) La sube para su cliente
  const { data: profile } = await db.from("profiles").select("id").eq("email", "cliente3@twj.local").single();
  const { data: client } = await db.from("clients").select("id").eq("profile_id", profile!.id).single();
  await page.goto(`/panel/importar?cliente=${client!.id}`);
  await page.getByLabel("Archivo Excel").setInputFiles({
    name: "rutina-y-dieta.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: filled,
  });
  const entreno = page.getByRole("region", { name: "Entreno" });
  const dieta = page.getByRole("region", { name: "Dieta" });
  await expect(entreno.getByText("Todo correcto")).toBeVisible();
  await expect(dieta.getByText("Todo correcto")).toBeVisible();

  // Dieta primero (el entreno navega a la ficha al terminar)
  const year = 2040 + (stamp % 40);
  const monday = new Date(Date.UTC(year, 0, 1));
  while (monday.getUTCDay() !== 1) monday.setUTCDate(monday.getUTCDate() + 1);
  const weekStart = monday.toISOString().slice(0, 10);
  const week2 = new Date(monday.getTime() + 7 * 864e5).toISOString().slice(0, 10);
  // Semanas libres para el cliente de prueba (de ejecuciones anteriores podría haber menú)
  await db.from("meal_plans").delete().eq("client_id", client!.id).in("week_start", [weekStart, week2]);
  await dieta.getByLabel("Semana 1 empieza").fill(weekStart);
  await dieta.getByRole("button", { name: "Importar dieta" }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/clientes/${client!.id}/nutricion`), { timeout: 20_000 });

  const { data: plans } = await db
    .from("meal_plans")
    .select(
      "week_start, status, meal_plan_days(day_index, meals(slot, title, meal_items(quantity_g, quantity_units, foods(name, verified))))",
    )
    .eq("client_id", client!.id)
    .in("week_start", [weekStart, new Date(monday.getTime() + 7 * 864e5).toISOString().slice(0, 10)])
    .order("week_start");
  expect(plans?.map((p) => [p.week_start, p.status])).toEqual([
    [weekStart, "draft"],
    [new Date(monday.getTime() + 7 * 864e5).toISOString().slice(0, 10), "draft"],
  ]);
  const lunes = plans![0]!.meal_plan_days.find((d) => d.day_index === 0)!;
  const desayuno = lunes.meals.find((m) => m.slot === "breakfast")!;
  expect(desayuno.title).toBe("Porridge");
  expect(desayuno.meal_items[0]).toMatchObject({ quantity_g: 200, foods: { name: newFood, verified: false } });

  // 4) Y el entreno
  await page.goto(`/panel/importar?cliente=${client!.id}`);
  await page.getByLabel("Archivo Excel").setInputFiles({
    name: "rutina-y-dieta.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: filled,
  });
  await entreno.getByText("Todo correcto").waitFor();
  await entreno.getByRole("button", { name: "Importar" }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/clientes/${client!.id}/entreno`), { timeout: 20_000 });
  await expect(page.getByText(block).first()).toBeVisible();
});
