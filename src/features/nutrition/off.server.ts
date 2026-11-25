import "server-only";
import type { OffProduct } from "@/domain/nutrition/off";

const UA = "TWJ-App/1.0 (app.trainwithjaime.es; contacto: trainwithjaimesanz@gmail.com)";
const FIELDS = "code,product_name,product_name_es,brands,quantity,product_quantity,nutriments,allergens_tags";

// Caché en memoria (best effort): OFF limita a ~10 búsquedas/min
const cache = new Map<string, { at: number; data: OffProduct[] }>();
const TTL = 10 * 60_000;

/** Busca productos en Open Food Facts (España). Datos colaborativos, sin verificar. */
export async function searchOff(term: string): Promise<OffProduct[]> {
  const q = term.trim().toLowerCase();
  if (q.length < 3) return [];
  const hit = cache.get(q);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=15&countries_tags_en=spain&fields=${FIELDS}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return [];
    const json = (await res.json()) as { products?: OffProduct[] };
    const data = (json.products ?? []).filter((p) => p.product_name || p.product_name_es);
    cache.set(q, { at: Date.now(), data });
    return data;
  } catch {
    return [];
  }
}

export async function getOffProduct(barcode: string): Promise<OffProduct | null> {
  if (!/^\d{6,14}$/.test(barcode)) return null;
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${FIELDS}`, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { status?: number; product?: OffProduct };
    return json.status === 1 && json.product ? { ...json.product, code: barcode } : null;
  } catch {
    return null;
  }
}
