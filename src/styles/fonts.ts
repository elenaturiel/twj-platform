import { Barlow_Condensed, Inter } from "next/font/google";

// TODO(marca): sustituir por las tipografías de Jaime. Si son de pago o propias,
// usar next/font/local con los .woff2 en src/styles/fonts/.
export const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-twj-sans",
  display: "swap",
});

export const fontHeading = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-twj-heading",
  display: "swap",
});
