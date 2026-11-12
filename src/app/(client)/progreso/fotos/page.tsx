import type { Metadata } from "next";
import Link from "next/link";
import { requireClientWithAccess } from "@/lib/auth/dal";
import { todayInMadrid } from "@/lib/dates";
import { getPhotos } from "@/features/tracking/queries";
import { hasPhotoConsent } from "@/features/tracking/client-actions";
import { PhotoCompare, PhotoUploader } from "@/features/tracking/ui/photos";

export const metadata: Metadata = { title: "Fotos de progreso" };

export default async function PhotosPage() {
  const ctx = await requireClientWithAccess();
  const [photos, consent] = await Promise.all([getPhotos(ctx.client.id), hasPhotoConsent()]);
  return (
    <div className="space-y-4">
      <Link href="/progreso" className="text-sm text-muted-foreground hover:underline">
        ← Progreso
      </Link>
      <h1 className="text-3xl font-extrabold">Fotos de progreso</h1>
      <p className="text-sm text-muted-foreground">
        Privadas: solo las veis Jaime, Elena y tú. Misma luz y misma posición = comparación justa.
      </p>
      <PhotoUploader clientId={ctx.client.id} today={todayInMadrid()} consent={consent} />
      <PhotoCompare photos={photos} canDelete />
    </div>
  );
}
