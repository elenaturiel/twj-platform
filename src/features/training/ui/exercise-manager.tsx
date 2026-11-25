"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MODALITIES, MODALITY_LABELS, type Modality } from "@/domain/training/prescription";
import { importExercises, saveExercise } from "../staff-actions";
import { VideoEmbed } from "./video-embed";

export type LibraryExercise = {
  id: string;
  name: string;
  modality: string;
  muscle_groups: string[];
  equipment: string[];
  video_url: string | null;
  tags: string[];
  is_active: boolean;
  instructions?: string | null;
  common_mistakes?: string | null;
};

const splitList = (s: string) =>
  s
    .split(/[,;|]/)
    .map((x) => x.trim())
    .filter(Boolean);

export function ExerciseManager({ exercises }: { exercises: LibraryExercise[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [modality, setModality] = useState<string>("");
  const [editing, setEditing] = useState<LibraryExercise | "new" | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return exercises.filter(
      (e) =>
        (!modality || e.modality === modality) &&
        (!term ||
          e.name.toLowerCase().includes(term) ||
          e.muscle_groups.some((m) => m.toLowerCase().includes(term)) ||
          e.tags.some((t) => t.toLowerCase().includes(term))),
    );
  }, [exercises, q, modality]);

  async function onImport(file: File) {
    const wb = XLSX.read(await file.arrayBuffer());
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]!]!, { defval: "" });
    const norm = (r: Record<string, unknown>, ...keys: string[]) => {
      const k = Object.keys(r).find((h) => keys.includes(h.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim()));
      return k ? String(r[k] ?? "").trim() : "";
    };
    const parsed = rows
      .map((r) => {
        const mod = norm(r, "modalidad", "modality").toLowerCase();
        return {
          name: norm(r, "nombre", "ejercicio", "name"),
          modality: (MODALITIES as readonly string[]).includes(mod)
            ? (mod as Modality)
            : mod === "funcional"
              ? "functional"
              : "gym",
          muscle_groups: splitList(norm(r, "grupo muscular", "grupos musculares", "musculos")),
          equipment: splitList(norm(r, "material", "equipamiento")),
          video_url: norm(r, "video", "video url", "enlace"),
          instructions: norm(r, "instrucciones"),
          common_mistakes: norm(r, "errores comunes", "errores"),
          tags: splitList(norm(r, "etiquetas", "tags")),
          is_active: true,
        };
      })
      .filter((r) => r.name);
    start(async () => {
      const res = await importExercises(parsed);
      if (!res.ok) return void toast.error(res.error);
      toast.success(
        `${res.created} ejercicios importados${res.skipped ? ` (${res.skipped} ya existían o no eran válidos)` : ""}`,
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="max-w-xs"
          placeholder="Buscar por nombre, músculo o etiqueta"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar ejercicios"
        />
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={modality}
          onChange={(e) => setModality(e.target.value)}
          aria-label="Modalidad"
        >
          <option value="">Todas las modalidades</option>
          {MODALITIES.map((m) => (
            <option key={m} value={m}>
              {MODALITY_LABELS[m]}
            </option>
          ))}
        </select>
        <div className="ml-auto flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])}
          />
          <Button variant="outline" size="sm" disabled={pending} onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" /> Importar CSV/Excel
          </Button>
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus className="size-4" /> Nuevo ejercicio
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Columnas para importar: Nombre, Modalidad (gym, functional, running, hyrox), Grupo muscular, Material, Vídeo,
        Instrucciones, Errores comunes, Etiquetas (listas separadas por comas).
      </p>
      <ul className="divide-y rounded-xl border">
        {list.map((e) => (
          <li key={e.id} className="flex items-center gap-3 px-3 py-2 text-sm">
            <span className="flex-1">
              <span className={e.is_active ? "font-medium" : "font-medium text-muted-foreground line-through"}>
                {e.name}
              </span>
              <span className="block text-xs text-muted-foreground">
                {[...e.muscle_groups, ...e.equipment].join(" · ")}
                {e.video_url ? " · 🎬 vídeo" : ""}
              </span>
            </span>
            <Badge variant="outline">{MODALITY_LABELS[e.modality as Modality]}</Badge>
            <Button size="icon" variant="ghost" aria-label={`Editar ${e.name}`} onClick={() => setEditing(e)}>
              <Pencil className="size-4" />
            </Button>
          </li>
        ))}
        {!list.length ? <li className="px-3 py-4 text-center text-sm text-muted-foreground">Sin resultados.</li> : null}
      </ul>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          {editing ? (
            <ExerciseForm
              exercise={editing === "new" ? null : editing}
              onDone={() => (setEditing(null), router.refresh())}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExerciseForm({ exercise, onDone }: { exercise: LibraryExercise | null; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [video, setVideo] = useState(exercise?.video_url ?? "");
  const [active, setActive] = useState(exercise?.is_active ?? true);
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        start(async () => {
          const r = await saveExercise({
            id: exercise?.id,
            name: String(f.get("name")),
            modality: f.get("modality") as Modality,
            muscle_groups: splitList(String(f.get("muscles") ?? "")),
            equipment: splitList(String(f.get("equipment") ?? "")),
            video_url: video,
            instructions: String(f.get("instructions") ?? ""),
            common_mistakes: String(f.get("mistakes") ?? ""),
            tags: splitList(String(f.get("tags") ?? "")),
            is_active: active,
          });
          if (r.ok) {
            toast.success("Ejercicio guardado");
            onDone();
          } else toast.error(r.error);
        });
      }}
    >
      <DialogHeader>
        <DialogTitle>{exercise ? "Editar ejercicio" : "Nuevo ejercicio"}</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-[2fr_1fr] gap-2">
        <div className="space-y-1">
          <Label htmlFor="ename">Nombre</Label>
          <Input id="ename" name="name" defaultValue={exercise?.name} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="emod">Modalidad</Label>
          <select
            id="emod"
            name="modality"
            defaultValue={exercise?.modality ?? "gym"}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            {MODALITIES.map((m) => (
              <option key={m} value={m}>
                {MODALITY_LABELS[m]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="emus">Grupos musculares</Label>
          <Input
            id="emus"
            name="muscles"
            defaultValue={exercise?.muscle_groups.join(", ")}
            placeholder="cuádriceps, glúteo"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="eeq">Material</Label>
          <Input
            id="eeq"
            name="equipment"
            defaultValue={exercise?.equipment.join(", ")}
            placeholder="barra, mancuernas"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="evid">Vídeo (YouTube no listado o Google Drive)</Label>
        <Input id="evid" value={video} onChange={(e) => setVideo(e.target.value)} placeholder="https://youtu.be/…" />
        {video.startsWith("https://") ? <VideoEmbed url={video} title="Vista previa" /> : null}
      </div>
      <div className="space-y-1">
        <Label htmlFor="einst">Instrucciones</Label>
        <Textarea id="einst" name="instructions" rows={3} defaultValue={exercise?.instructions ?? ""} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="emis">Errores comunes</Label>
        <Textarea id="emis" name="mistakes" rows={2} defaultValue={exercise?.common_mistakes ?? ""} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="etags">Etiquetas</Label>
        <Input id="etags" name="tags" defaultValue={exercise?.tags.join(", ")} placeholder="casa, básico, hyrox" />
      </div>
      <Label className="flex items-center gap-2 font-normal">
        <Checkbox checked={active} onCheckedChange={(v) => setActive(v === true)} /> Activo (aparece al crear sesiones)
      </Label>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          Guardar
        </Button>
      </DialogFooter>
    </form>
  );
}
