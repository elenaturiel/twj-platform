import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/twj/logo";

export async function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const t = await getTranslations("brand");
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-secondary/70 to-background px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <Logo className="text-2xl" />
          <p className="text-xs tracking-wide text-muted-foreground uppercase">{t("tagline")}</p>
        </div>
        <div className="space-y-5 rounded-2xl border bg-card p-6 shadow-card">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">{title}</h1>
            {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}
