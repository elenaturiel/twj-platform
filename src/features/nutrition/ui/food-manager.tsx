"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Pencil, Plus, Search, Upload } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EU_ALLERGENS } from "@/domain/onboarding/rules";
import { formatEuros } from "@/lib/money";
import type { FoodRow } from "../queries";
import { importFoods, importOffProduct, saveFood, searchOpenFoodFacts } from "../staff-actions";

export const SECTIONS = [
  "Fruta y verdura",
  "Carne",
  "Pescado y marisco",
  "Charcutería y quesos",
  "Huevos",
  "Lácteos",
  "Panadería",
  "Desayuno y cereales",
  "Arroz, pasta y legumbres",
  "Conservas",
  "Aceite y especias",
  "Congelados",
  "Bebidas",
  "Snacks",
  "Otros",
];

type OffResult = Awaited<ReturnType<typeof searchOpenFoodFacts>>[number];

export function FoodManager({ foods }: { foods: (FoodRow & { is_active?: boolean })[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [onlyUnverified, setOnlyUnverified] = useState(false);
  const [editing, setEditing] = useState<FoodRow | "new" | null>(null);
  const [offOpen, setOffOpen] = useState(false);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return foods.filter(
      (f) =>
        (!t || f.name.toLowerCase().includes(t) || (f.brand ?? "").toLowerCase().includes(t)) &&
        (!onlyUnverified || !f.verified),
    );
  }, [foods, q, onlyUnverified]);

  async function onImport(file: File) {
    const wb = XLSX.read(await file.arrayBuffer());
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]!]!, { defval: "" });
    const get = (r: Record<string, unknown>, ...keys: string[]) => {
      const k = Object.keys(r).find((h) => keys.includes(h.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim()));
      return k ? String(r[k] ?? "").trim() : "";
    };
    const parsed = rows
      .map((r) => ({
        name: get(r, "nombre", "alimento"),
        brand: get(r, "marca") || null,
        supermarket_section: get(r, "seccion") || "Otros",
        kcal: get(r, "kcal", "calorias"),
        protein_g: get(r, "proteinas", "proteina"),
        carbs_g: get(r, "hidratos", "carbohidratos"),
        fat_g: get(r, "grasas", "grasa"),
        fiber_g: get(r, "fibra"),
        sugar_g: get(r, "azucares", "azucar"),
        salt_g: get(r, "sal"),
        unit_name: get(r, "unidad") || null,
        unit_grams: get(r, "gramos por unidad", "g unidad"),
        pack_size_g: get(r, "envase g", "envase"),
        price_euros: get(r, "precio", "precio envase"),
        allergens: get(r, "alergenos")
          .split(",")
          .map((x) => x.trim().toLowerCase())
          .filter(Boolean),
      }))
      .filter((r) => r.name);
    start(async () => {
      const res = await importFoods(parsed as never);
      if (!res.ok) return void toast.error(res.error);
      toast.success(`${res.created} alimentos importados (sin verificar)`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="max-w-xs"
          placeholder="Buscar alimento o marca"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar alimentos"
        />
        <Label className="flex items-center gap-2 text-sm font-normal">
          <Checkbox checked={onlyUnverified} onCheckedChange={(v) => setOnlyUnverified(v === true)} /> Solo sin
          verificar
        </Label>
        <div className="ml-auto flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])}
          />
          <Button size="sm" variant="outline" disabled={pending} onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" /> Importar CSV/Excel
          </Button>
          <Button size="sm" variant="outline" onClick={() => setOffOpen(true)}>
            <Search className="size-4" /> Buscar en Open Food Facts
          </Button>
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus className="size-4" /> Nuevo alimento
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Valores por 100 g. Lo importado (Open Food Facts o CSV) entra <strong>sin verificar</strong>: revísalo con la
        etiqueta antes de marcarlo como verificado. Datos de Open Food Facts bajo licencia ODbL (© colaboradores de Open
        Food Facts).
      </p>
      <ul className="divide-y rounded-xl border">
        {list.map((f) => (
          <li key={f.id} className="flex items-center gap-3 px-3 py-2 text-sm">
            <span className="flex-1">
              <span className="font-medium">{f.name}</span>
              {f.brand ? <span className="text-muted-foreground"> · {f.brand}</span> : null}
              <span className="block text-xs text-muted-foreground tabular-nums">
                {f.supermarket_section} · {f.kcal ?? "?"} kcal · P {f.protein_g ?? "?"} · H {f.carbs_g ?? "?"} · G{" "}
                {f.fat_g ?? "?"}
                {f.price_cents != null
                  ? ` · ${formatEuros(f.price_cents)}${f.pack_size_g ? `/${f.pack_size_g} g` : ""}`
                  : ""}
              </span>
            </span>
            {f.verified ? (
              <CheckCircle2 className="size-4 text-success" aria-label="Verificado" />
            ) : (
              <Badge variant="outline">Sin verificar</Badge>
            )}
            <Button size="icon" variant="ghost" aria-label={`Editar ${f.name}`} onClick={() => setEditing(f)}>
              <Pencil className="size-4" />
            </Button>
          </li>
        ))}
        {!list.length ? <li className="px-3 py-4 text-center text-sm text-muted-foreground">Sin alimentos.</li> : null}
      </ul>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          {editing ? (
            <FoodForm food={editing === "new" ? null : editing} onDone={() => (setEditing(null), router.refresh())} />
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={offOpen} onOpenChange={setOffOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <OffSearch onImported={() => router.refresh()} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FoodForm({ food, onDone }: { food: FoodRow | null; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [allergens, setAllergens] = useState<string[]>(food?.allergens ?? []);
  const [verified, setVerified] = useState(food?.verified ?? true);
  const n = (v: number | null | undefined) => (v == null ? "" : String(v));
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const g = (k: string) => String(f.get(k) ?? "");
        start(async () => {
          const r = await saveFood({
            id: food?.id,
            name: g("name"),
            brand: g("brand") || null,
            supermarket_section: g("section"),
            kcal: g("kcal"),
            protein_g: g("protein"),
            carbs_g: g("carbs"),
            fat_g: g("fat"),
            fiber_g: g("fiber"),
            sugar_g: g("sugar"),
            salt_g: g("salt"),
            unit_name: g("unit_name") || null,
            unit_grams: g("unit_grams"),
            pack_size_g: g("pack"),
            price_euros: g("price"),
            allergens,
            verified,
          } as never);
          if (r.ok) {
            toast.success("Alimento guardado");
            onDone();
          } else toast.error(r.error);
        });
      }}
    >
      <DialogHeader>
        <DialogTitle>{food ? "Editar alimento" : "Nuevo alimento"}</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 space-y-1">
          <Label htmlFor="fname">Nombre</Label>
          <Input id="fname" name="name" defaultValue={food?.name} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="fbrand">Marca</Label>
          <Input id="fbrand" name="brand" defaultValue={food?.brand ?? ""} placeholder="Hacendado" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="fsec">Sección del súper</Label>
          <select
            id="fsec"
            name="section"
            defaultValue={food?.supermarket_section ?? "Otros"}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            {SECTIONS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      <fieldset className="grid grid-cols-4 gap-2">
        <legend className="col-span-4 mb-1 text-sm font-medium">Por 100 g (de la etiqueta)</legend>
        {[
          ["kcal", "kcal", food?.kcal],
          ["protein", "Proteínas", food?.protein_g],
          ["carbs", "Hidratos", food?.carbs_g],
          ["fat", "Grasas", food?.fat_g],
          ["fiber", "Fibra", null],
          ["sugar", "Azúcares", null],
          ["salt", "Sal", null],
        ].map(([k, l, v]) => (
          <div key={k as string} className="space-y-1">
            <Label htmlFor={`f-${k}`} className="text-xs">
              {l as string}
            </Label>
            <Input id={`f-${k}`} name={k as string} inputMode="decimal" defaultValue={n(v as number | null)} />
          </div>
        ))}
      </fieldset>
      <div className="grid grid-cols-4 gap-2">
        <div className="space-y-1">
          <Label htmlFor="f-un" className="text-xs">
            Unidad
          </Label>
          <Input id="f-un" name="unit_name" defaultValue={food?.unit_name ?? ""} placeholder="huevo" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-ug" className="text-xs">
            g por unidad
          </Label>
          <Input id="f-ug" name="unit_grams" inputMode="decimal" defaultValue={n(food?.unit_grams)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-pk" className="text-xs">
            Envase (g)
          </Label>
          <Input id="f-pk" name="pack" inputMode="decimal" defaultValue={n(food?.pack_size_g)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-pr" className="text-xs">
            Precio envase (€)
          </Label>
          <Input
            id="f-pr"
            name="price"
            inputMode="decimal"
            defaultValue={food?.price_cents == null ? "" : (food.price_cents / 100).toFixed(2).replace(".", ",")}
          />
        </div>
      </div>
      <fieldset className="space-y-1">
        <legend className="text-sm font-medium">Alérgenos</legend>
        <div className="flex flex-wrap gap-1.5">
          {EU_ALLERGENS.map((a) => {
            const on = allergens.includes(a.key);
            return (
              <button
                key={a.key}
                type="button"
                aria-pressed={on}
                onClick={() => setAllergens((cur) => (on ? cur.filter((x) => x !== a.key) : [...cur, a.key]))}
                className={`rounded-full border px-2 py-0.5 text-xs ${on ? "bg-primary text-primary-foreground" : ""}`}
              >
                {a.label}
              </button>
            );
          })}
        </div>
      </fieldset>
      <Label className="flex items-center gap-2 font-normal">
        <Checkbox checked={verified} onCheckedChange={(v) => setVerified(v === true)} /> Datos verificados con la
        etiqueta
      </Label>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          Guardar
        </Button>
      </DialogFooter>
    </form>
  );
}

function OffSearch({ onImported }: { onImported: () => void }) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<OffResult[] | null>(null);
  const [section, setSection] = useState("Otros");
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3">
      <DialogHeader>
        <DialogTitle>Buscar en Open Food Facts</DialogTitle>
      </DialogHeader>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => setResults(await searchOpenFoodFacts(term)));
        }}
      >
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="hacendado copos de avena"
          aria-label="Producto"
        />
        <Button type="submit" disabled={pending || term.trim().length < 3}>
          Buscar
        </Button>
      </form>
      <div className="flex items-center gap-2 text-sm">
        <Label htmlFor="offsec">Sección al importar</Label>
        <select
          id="offsec"
          value={section}
          onChange={(e) => setSection(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        >
          {SECTIONS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      {results ? (
        <ul className="divide-y rounded-md border text-sm">
          {results.map((r) => (
            <li key={r.off_barcode ?? r.name} className="flex items-center gap-2 px-3 py-2">
              <span className="flex-1">
                <span className="font-medium">{r.name}</span>
                {r.brand ? <span className="text-muted-foreground"> · {r.brand}</span> : null}
                <span className="block text-xs text-muted-foreground">
                  {r.kcal ?? "?"} kcal · P {r.protein_g ?? "?"} · H {r.carbs_g ?? "?"} · G {r.fat_g ?? "?"}{" "}
                  {r.quantity ? `· ${r.quantity}` : ""}
                </span>
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={pending || !r.off_barcode}
                onClick={() =>
                  start(async () => {
                    const res = await importOffProduct(r.off_barcode!, section);
                    if (res.ok) {
                      toast.success(res.message ?? "Importado");
                      onImported();
                    } else toast.error(res.error);
                  })
                }
              >
                Importar
              </Button>
            </li>
          ))}
          {!results.length ? (
            <li className="px-3 py-2 text-muted-foreground">Sin resultados (o Open Food Facts no responde ahora).</li>
          ) : null}
        </ul>
      ) : null}
      <DialogFooter>
        <p className="text-xs text-muted-foreground">Datos colaborativos: entran sin verificar.</p>
      </DialogFooter>
    </div>
  );
}
