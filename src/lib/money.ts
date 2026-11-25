const euro = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

/** 2490 → "24,90 €" */
export function formatEuros(cents: number): string {
  return euro.format(cents / 100);
}
