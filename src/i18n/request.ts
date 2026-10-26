import { getRequestConfig } from "next-intl/server";

// Un único idioma (es-ES) sin prefijo en la URL. Para añadir otro idioma,
// crear messages/<locale>.json y decidir aquí el locale (cookie o perfil).
export const defaultLocale = "es";
export const timeZone = "Europe/Madrid";

export default getRequestConfig(async () => ({
  locale: defaultLocale,
  timeZone,
  messages: (await import(`./messages/${defaultLocale}.json`)).default,
}));
