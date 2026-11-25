"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/browser";
import { addProgressPhoto, deleteProgressPhoto, grantPhotoConsent } from "../client-actions";

export type Photo = { id: string; pose: string; taken_on: string; url: string | null };
const POSES: Record<string, string> = { front: "Frente", side: "Perfil", back: "Espalda", other: "Otra" };

/** Reduce la foto en el móvil antes de subirla (≤1600 px, JPEG 85 %). */
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await new Promise((res) => canvas.toBlob((b) => res(b ?? file), "image/jpeg", 0.85));
  } catch {
    return file;
  }
}

export function PhotoUploader({
  clientId,
  today,
  consent,
  checkinId,
}: {
  clientId: string;
  today: string;
  consent: boolean;
  checkinId?: string;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pose, setPose] = useState("front");
  const [date, setDate] = useState(today);
  const [pending, start] = useTransition();

  if (!consent) {
    return (
      <div className="space-y-2 rounded-xl bg-secondary p-4 text-sm">
        <p>
          Para subir fotos de progreso necesitamos tu consentimiento. Son privadas: solo las veis Jaime, Elena y tú, y
          puedes borrarlas cuando quieras.
        </p>
        <Button
          size="sm"
          disabled={pending}
          onClick={() => start(async () => void ((await grantPhotoConsent()).ok && router.refresh()))}
        >
          Doy mi consentimiento
        </Button>
      </div>
    );
  }

  function upload(file: File) {
    start(async () => {
      const blob = await shrink(file);
      const path = `${clientId}/${date}-${pose}-${crypto.randomUUID().slice(0, 8)}.jpg`;
      const { error } = await createClient()
        .storage.from("progress-photos")
        .upload(path, blob, { contentType: "image/jpeg" });
      if (error) return void toast.error("No se ha podido subir la foto.");
      const r = await addProgressPhoto({ path, pose: pose as "front", takenOn: date, checkinId });
      if (!r.ok) return void toast.error(r.error);
      toast.success("Foto guardada");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label htmlFor="pose" className="text-xs">
          Posición
        </Label>
        <select
          id="pose"
          value={pose}
          onChange={(e) => setPose(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {Object.entries(POSES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="pdate" className="text-xs">
          Fecha
        </Label>
        <Input
          id="pdate"
          type="date"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
          className="w-36"
        />
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      <Button type="button" onClick={() => input.current?.click()} disabled={pending}>
        <Camera className="size-4" /> {pending ? "Subiendo…" : "Subir foto"}
      </Button>
    </div>
  );
}

/** Galería por fecha + comparador lado a lado de dos fechas (misma posición). */
export function PhotoCompare({ photos, canDelete }: { photos: Photo[]; canDelete?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const poses = useMemo(() => [...new Set(photos.map((p) => p.pose))], [photos]);
  const [pose, setPose] = useState(poses[0] ?? "front");
  const ofPose = photos.filter((p) => p.pose === pose);
  const dates = [...new Set(ofPose.map((p) => p.taken_on))].sort();
  const [a, setA] = useState(dates[0] ?? "");
  const [b, setB] = useState(dates.at(-1) ?? "");
  const pa = ofPose.find((p) => p.taken_on === a);
  const pb = ofPose.find((p) => p.taken_on === b);
  const fmt = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });

  if (!photos.length) return <p className="text-sm text-muted-foreground">Aún no hay fotos.</p>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Posición"
          value={pose}
          onChange={(e) => setPose(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {poses.map((p) => (
            <option key={p} value={p}>
              {POSES[p] ?? p}
            </option>
          ))}
        </select>
        <select
          aria-label="Antes"
          value={a}
          onChange={(e) => setA(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {dates.map((d) => (
            <option key={d} value={d}>
              Antes: {fmt(d)}
            </option>
          ))}
        </select>
        <select
          aria-label="Después"
          value={b}
          onChange={(e) => setB(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {dates.map((d) => (
            <option key={d} value={d}>
              Después: {fmt(d)}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[pa, pb].map((p, i) => (
          <figure key={i} className="space-y-1">
            {p?.url ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal de Storage
              <img
                src={p.url}
                alt={`Foto ${POSES[p.pose]} del ${fmt(p.taken_on)}`}
                className="aspect-[3/4] w-full rounded-xl object-cover"
              />
            ) : (
              <div className="aspect-[3/4] w-full rounded-xl bg-muted" />
            )}
            <figcaption className="text-center text-xs text-muted-foreground">{p ? fmt(p.taken_on) : "—"}</figcaption>
          </figure>
        ))}
      </div>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((p) => (
          <li key={p.id} className="relative">
            {p.url ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal de Storage
              <img
                src={p.url}
                alt={`Foto ${POSES[p.pose]} del ${fmt(p.taken_on)}`}
                className="aspect-square w-full rounded-lg object-cover"
                loading="lazy"
              />
            ) : null}
            <span className="absolute bottom-1 left-1 rounded bg-background/80 px-1 text-[10px]">
              {fmt(p.taken_on)} · {POSES[p.pose]}
            </span>
            {canDelete ? (
              <button
                type="button"
                aria-label="Borrar foto"
                disabled={pending}
                onClick={() =>
                  confirm("¿Borrar esta foto?") &&
                  start(async () => void ((await deleteProgressPhoto(p.id)).ok && router.refresh()))
                }
                className="absolute top-1 right-1 rounded bg-background/80 p-1"
              >
                <Trash2 className="size-3.5" />
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
