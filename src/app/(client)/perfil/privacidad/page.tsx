import type { Metadata } from "next";
import Link from "next/link";
import { requireClientWithAccess } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ConsentToggle, DeleteAccount, DownloadData } from "@/features/privacy/ui/privacy-controls";

export const metadata: Metadata = { title: "Privacidad y datos" };

const LABELS: Record<string, string> = {
  terms: "Términos del servicio",
  privacy: "Política de privacidad",
  health_data: "Tratamiento de datos de salud",
  progress_photos: "Fotos de progreso",
  marketing: "Comunicaciones comerciales",
  cookies: "Cookies",
  guardian: "Autorización del tutor",
};

export default async function PrivacyPage() {
  const ctx = await requireClientWithAccess();
  const supabase = await createClient();
  const [{ data: consents }, { data: pending }] = await Promise.all([
    supabase
      .from("current_consents")
      .select("kind, granted, document_version, created_at")
      .eq("profile_id", ctx.viewer.id),
    supabase
      .from("data_requests")
      .select("id")
      .eq("profile_id", ctx.viewer.id)
      .eq("kind", "delete")
      .eq("status", "pending")
      .maybeSingle(),
  ]);
  const get = (k: string) => consents?.find((c) => c.kind === k);
  return (
    <div className="space-y-6">
      <div>
        <Link href="/mas" className="text-sm text-muted-foreground">
          ← Más
        </Link>
        <h1 className="text-3xl font-extrabold">Privacidad y datos</h1>
      </div>

      <section className="space-y-1">
        <h2 className="text-lg font-bold">Lo que puedes cambiar</h2>
        <div className="divide-y rounded-2xl border px-4">
          <ConsentToggle
            kind="progress_photos"
            label="Fotos de progreso"
            description="Que Jaime pueda ver las fotos que subas. Si lo quitas, no podrás subir más."
            granted={Boolean(get("progress_photos")?.granted)}
          />
          <ConsentToggle
            kind="marketing"
            label="Novedades y ofertas"
            description="Emails ocasionales sobre retos, eventos y planes. Nunca de terceros."
            granted={Boolean(get("marketing")?.granted)}
          />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">Lo que aceptaste</h2>
        <ul className="divide-y rounded-2xl border text-sm">
          {(consents ?? [])
            .filter((c) => !["marketing", "progress_photos"].includes(c.kind!))
            .map((c) => (
              <li key={c.kind} className="flex items-center justify-between gap-2 px-4 py-2">
                <span>{LABELS[c.kind!] ?? c.kind}</span>
                <span className="text-xs text-muted-foreground">
                  {c.granted ? "Aceptado" : "No aceptado"} · v. {c.document_version} ·{" "}
                  {new Date(c.created_at!).toLocaleDateString("es-ES")}
                </span>
              </li>
            ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Textos completos:{" "}
          <Link href="/legal/privacidad" className="underline">
            privacidad
          </Link>{" "}
          ·{" "}
          <Link href="/legal/terminos" className="underline">
            términos
          </Link>{" "}
          ·{" "}
          <Link href="/legal/cookies" className="underline">
            cookies
          </Link>
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-bold">Tus datos</h2>
        <p className="text-sm text-muted-foreground">
          Descarga una copia de todo lo que guardamos sobre ti (ficha, entrenos, métricas, mensajes…).
        </p>
        <DownloadData />
      </section>

      <section className="space-y-1 border-t pt-4">
        <DeleteAccount pending={Boolean(pending)} />
      </section>
    </div>
  );
}
