"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  copyMealPlan,
  createMealPlan,
  resolveChangeRequest,
  saveAffiliateLink,
  type NutritionResult,
} from "../staff-actions";

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return {
    pending,
    run: (fn: () => Promise<NutritionResult>, ok = "Guardado", after?: (r: NutritionResult) => void) =>
      start(async () => {
        const r = await fn();
        if (r.ok) {
          toast.success(r.message ?? ok);
          after?.(r);
          router.refresh();
        } else toast.error(r.error);
      }),
  };
}

/** Semana sin menú: crear vacío, desde plantilla o repitiendo la anterior. */
export function NewWeekMenu({
  clientId,
  weekStart,
  templates,
  previousPlanId,
}: {
  clientId: string;
  weekStart: string;
  templates: { planId: string; name: string }[];
  previousPlanId: string | null;
}) {
  const { pending, run } = useRun();
  const [tpl, setTpl] = useState(templates[0]?.planId ?? "");
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <p className="text-sm">No hay menú para esta semana.</p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() => run(() => createMealPlan({ clientId, weekStart }), "Menú creado")}
        >
          Menú vacío
        </Button>
        {previousPlanId ? (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              run(
                () => copyMealPlan({ planId: previousPlanId, toClientId: clientId, weekStart }),
                "Copiado de la semana anterior",
              )
            }
          >
            Repetir el de la semana anterior
          </Button>
        ) : null}
      </div>
      {templates.length ? (
        <div className="flex flex-wrap gap-2">
          <select
            aria-label="Plantilla"
            value={tpl}
            onChange={(e) => setTpl(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {templates.map((t) => (
              <option key={t.planId} value={t.planId}>
                {t.name}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="secondary"
            disabled={pending || !tpl}
            onClick={() =>
              run(() => copyMealPlan({ planId: tpl, toClientId: clientId, weekStart }), "Plantilla aplicada")
            }
          >
            Usar plantilla
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function ChangeRequestReply({ requestId }: { requestId: string }) {
  const { pending, run } = useRun();
  const [text, setText] = useState("");
  return (
    <div className="space-y-2">
      <Textarea
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Respuesta (opcional)"
        aria-label="Respuesta"
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() => resolveChangeRequest({ requestId, status: "resolved", response: text }), "Marcado como cambiado")
          }
        >
          Hecho, lo he cambiado
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            run(() => resolveChangeRequest({ requestId, status: "rejected", response: text }), "Respondido")
          }
        >
          Responder sin cambiar
        </Button>
      </div>
    </div>
  );
}

export function NewMenuTemplateForm() {
  const router = useRouter();
  const { pending, run } = useRun();
  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const name = String(new FormData(e.currentTarget).get("name") ?? "");
        run(
          () => createMealPlan({ clientId: null, weekStart: null, templateName: name }),
          "Plantilla creada",
          (r) => r.ok && r.id && router.push(`/panel/biblioteca/menus/${r.id}`),
        );
      }}
    >
      <Input
        name="name"
        placeholder="Menú 2.000 kcal sin lactosa"
        required
        className="max-w-sm"
        aria-label="Nombre de la plantilla"
      />
      <Button type="submit" disabled={pending}>
        Crear plantilla de menú
      </Button>
    </form>
  );
}

export function AffiliateLinkForm({
  link,
}: {
  link: {
    id?: string;
    label: string;
    description: string | null;
    url: string;
    code: string | null;
    is_active: boolean;
  } | null;
}) {
  const { pending, run } = useRun();
  return (
    <form
      className="grid items-end gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_2fr_2fr_1fr_auto_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        run(() =>
          saveAffiliateLink({
            id: link?.id,
            label: String(f.get("label")),
            description: String(f.get("description") ?? ""),
            url: String(f.get("url")),
            code: String(f.get("code") ?? ""),
            isActive: f.get("active") === "on",
          }),
        );
      }}
    >
      <Input name="label" defaultValue={link?.label} placeholder="Producto" required aria-label="Producto" />
      <Input
        name="description"
        defaultValue={link?.description ?? ""}
        placeholder="Para qué sirve, sin vender humo"
        aria-label="Descripción"
      />
      <Input
        name="url"
        defaultValue={link?.url}
        placeholder="https://www.hsnstore.com/…"
        required
        aria-label="Enlace"
      />
      <Input name="code" defaultValue={link?.code ?? ""} placeholder="Código" aria-label="Código de afiliado" />
      <label className="flex items-center gap-1.5 text-xs">
        <input type="checkbox" name="active" defaultChecked={link?.is_active ?? true} /> Activo
      </label>
      <Button size="sm" variant={link ? "secondary" : "default"} disabled={pending}>
        {link ? "Guardar" : "Añadir"}
      </Button>
    </form>
  );
}
