import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { fontHeading, fontSans } from "@/styles/fonts";
import { Providers } from "@/components/twj/providers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("brand");
  return {
    title: { default: t("name"), template: `%s · ${t("short")}` },
    description: t("tagline"),
    applicationName: t("name"),
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: t("short"), statusBarStyle: "default" },
    formatDetection: { telephone: false },
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#061226" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${fontSans.variable} ${fontHeading.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
