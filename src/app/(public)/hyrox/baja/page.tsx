import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Baja de la lista HYROX", robots: { index: false } };

export default async function UnsubscribePage({ searchParams }: PageProps<"/hyrox/baja">) {
  const sp = await searchParams;
  const token = typeof sp.t === "string" && /^[0-9a-f-]{36}$/.test(sp.t) ? sp.t : null;
  let ok = false;
  if (token) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("hyrox_unsubscribe", { p_token: token });
    ok = Boolean(data);
  }
  return (
    <div className="space-y-3 text-center">
      <h1 className="text-3xl font-extrabold">{ok ? "Hecho, ya no te escribiremos" : "Enlace no válido"}</h1>
      <p className="text-muted-foreground">
        {ok
          ? "Te hemos quitado de la lista HYROX. Si cambias de idea, puedes volver a apuntarte cuando quieras."
          : "Si quieres darte de baja, escríbenos a trainwithjaimesanz@gmail.com."}
      </p>
    </div>
  );
}
