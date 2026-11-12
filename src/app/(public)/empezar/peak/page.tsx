import type { Metadata } from "next";
import Link from "next/link";
import { PeakForm } from "@/features/billing/peak-form";

export const metadata: Metadata = { title: "Plan Peak" };

export default function PeakPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/empezar" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
        ← Ver todos los planes
      </Link>
      <div className="space-y-2">
        <h1 className="text-4xl font-extrabold">Peak: prepárate para tu día</h1>
        <p className="text-muted-foreground">
          Pack cerrado de 8, 10 o 12 semanas alrededor de tu evento. Todo lo de MVP, hecho a tu medida. Cuéntanos qué
          preparas y Jaime te propone el pack.
        </p>
      </div>
      <PeakForm />
    </div>
  );
}
