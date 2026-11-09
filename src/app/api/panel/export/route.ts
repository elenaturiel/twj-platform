import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth/dal";
import { csv } from "@/domain/business/metrics";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const eur = (c: number | null | undefined) => (c == null ? "" : (c / 100).toFixed(2).replace(".", ","));

/** CSV para la gestoría o Excel: ?tipo=pagos|clientes[&desde=YYYY-MM-DD&hasta=YYYY-MM-DD] */
export async function GET(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer || viewer.role === "client") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("has_scope", { p_scope: "business" });
  if (!allowed) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const tipo = request.nextUrl.searchParams.get("tipo");
  const desde = request.nextUrl.searchParams.get("desde") ?? "2000-01-01";
  const hasta = request.nextUrl.searchParams.get("hasta") ?? "2999-12-31";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta))
    return NextResponse.json({ error: "Fechas" }, { status: 400 });

  let body: string;
  if (tipo === "pagos") {
    const { data } = await supabase
      .from("payments")
      .select(
        "paid_at, amount_cents, discount_cents, kind, method, status, description, period_start, period_end, clients(profiles(full_name, email))",
      )
      .gte("paid_at", `${desde}T00:00:00Z`)
      .lte("paid_at", `${hasta}T23:59:59Z`)
      .order("paid_at");
    body = csv([
      [
        "fecha",
        "cliente",
        "email",
        "concepto",
        "tipo",
        "método",
        "estado",
        "importe (€, IVA incl.)",
        "descuento (€)",
        "periodo desde",
        "periodo hasta",
      ],
      ...(data ?? []).map((p) => [
        p.paid_at?.slice(0, 10),
        p.clients?.profiles?.full_name,
        p.clients?.profiles?.email,
        p.description,
        p.kind,
        p.method,
        p.status,
        eur(p.amount_cents),
        eur(p.discount_cents),
        p.period_start,
        p.period_end,
      ]),
    ]);
  } else if (tipo === "clientes") {
    const { data } = await supabase
      .from("clients")
      .select(
        "status, billing_mode, billing_interval, started_at, cancelled_at, modalities, plans(name), profiles(full_name, email)",
      )
      .order("created_at");
    body = csv([
      ["nombre", "email", "plan", "estado", "cobro", "periodicidad", "alta", "baja", "modalidades"],
      ...(data ?? []).map((c) => [
        c.profiles?.full_name,
        c.profiles?.email,
        c.plans?.name,
        c.status,
        c.billing_mode,
        c.billing_interval,
        c.started_at?.slice(0, 10),
        c.cancelled_at?.slice(0, 10),
        c.modalities.join(" "),
      ]),
    ]);
  } else {
    return NextResponse.json({ error: "tipo = pagos | clientes" }, { status: 400 });
  }
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="twj-${tipo}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
