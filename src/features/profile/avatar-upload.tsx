"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/browser";
import { saveAvatar } from "./actions";

const SIZE = 512;

/**
 * Recorta en cuadrado y reduce a 512 px en JPEG en el propio móvil: así una foto de
 * la cámara (muchos MB, a veces HEIC) siempre cabe en el límite de 2 MB.
 */
async function toSquareJpeg(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("imagen"));
      i.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = Math.min(SIZE, side);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(
      img,
      (img.naturalWidth - side) / 2,
      (img.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("jpeg"))), "image/jpeg", 0.85),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function AvatarUpload({
  profileId,
  name,
  currentUrl,
}: {
  profileId: string;
  name: string;
  currentUrl: string | null;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const initial = (name.trim()[0] ?? "?").toUpperCase();

  function onFile(file: File) {
    start(async () => {
      let blob: Blob;
      try {
        blob = await toSquareJpeg(file);
      } catch {
        return void toast.error("No se ha podido leer la foto. Prueba con otra (JPG o PNG).");
      }
      const path = `${profileId}/avatar-${Date.now()}.jpg`;
      const { error } = await createClient()
        .storage.from("avatars")
        .upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (error) return void toast.error("No se ha podido subir la foto.");
      const r = await saveAvatar(path);
      if (!r.ok) return void toast.error(r.error);
      setPreview(URL.createObjectURL(blob));
      toast.success("Foto de perfil actualizada");
      if (input.current) input.current.value = "";
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-2xl font-bold text-primary-foreground">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- enlace firmado temporal de Storage
          <img src={preview} alt="Tu foto de perfil" className="size-full object-cover" />
        ) : (
          initial
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="hidden"
          aria-label="Foto de perfil"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => input.current?.click()}>
          <Camera className="size-4" aria-hidden /> {pending ? "Subiendo…" : preview ? "Cambiar foto" : "Poner foto"}
        </Button>
        {preview ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await saveAvatar(null);
                if (!r.ok) return void toast.error(r.error);
                setPreview(null);
                router.refresh();
              })
            }
          >
            <Trash2 className="size-4" aria-hidden /> Quitar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
