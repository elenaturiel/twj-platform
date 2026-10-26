import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Train with Jaime",
    short_name: "TWJ",
    description: "¿Y tú, quieres ganar?",
    lang: "es-ES",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0b1f3a", // TODO(marca): navy oficial
    icons: [
      // TODO(marca): generar iconos definitivos a partir del logo SVG
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
