import { WifiOff } from "lucide-react";

export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <WifiOff className="size-10 text-muted-foreground" aria-hidden />
      <h1 className="text-2xl font-bold">Sin conexión</h1>
      <p className="max-w-xs text-muted-foreground">
        Ni el 4G de la biblioteca. En cuanto vuelva la red, seguimos donde lo dejaste.
      </p>
    </main>
  );
}
