import type { Metadata } from "next";
import { BannerTracker } from "@/features/hyrox/ui/banner-tracker";

export const metadata: Metadata = { title: "HYROX", robots: { index: false } };

/**
 * Banner para incrustar en otra web con un iframe:
 * <iframe src="https://app.trainwithjaime.es/embed/hyrox-banner?ub=home" style="width:100%;height:180px;border:0"></iframe>
 * Registra "view" y "click" sin cookies ni datos personales.
 */
export default async function HyroxBanner({ searchParams }: PageProps<"/embed/hyrox-banner">) {
  const sp = await searchParams;
  const ub = typeof sp.ub === "string" ? sp.ub.replace(/[^a-z0-9_-]/gi, "").slice(0, 40) || "banner" : "banner";
  return (
    <div className="flex min-h-dvh flex-col justify-center gap-3 bg-primary p-5 text-primary-foreground">
      <p className="text-xs font-bold tracking-[0.25em] uppercase opacity-80">HYROX · sin postureo</p>
      <p className="text-2xl leading-tight font-extrabold">¿Primer HYROX y no sabes cómo entrenar?</p>
      <BannerTracker ub={ub} />
    </div>
  );
}
